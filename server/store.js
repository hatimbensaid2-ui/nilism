import { readFileSync, writeFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

// ── Storage backend selection ─────────────────────────────────────────────────
// DATABASE_URL set  → PostgreSQL (Railway production)
// DATABASE_URL unset → flat JSON file (local dev)

const USE_DB = !!process.env.DATABASE_URL;

// ── In-memory state ───────────────────────────────────────────────────────────
let db = { shops: {}, messages: [] };

// ── File-based fallback (local dev) ──────────────────────────────────────────
const __dir = dirname(fileURLToPath(import.meta.url));
const FILE = join(__dir, 'shops.json');

function loadFromFile() {
  try {
    return existsSync(FILE) ? JSON.parse(readFileSync(FILE, 'utf8')) : { shops: {} };
  } catch {
    return { shops: {} };
  }
}

function saveToFile() {
  try { writeFileSync(FILE, JSON.stringify(db, null, 2)); } catch (e) {
    console.error('store write error:', e.message);
  }
}

// ── PostgreSQL backend ────────────────────────────────────────────────────────
let pool = null;

async function getPool() {
  if (pool) return pool;
  const { default: pg } = await import('pg');
  pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 5,
  });
  return pool;
}

async function dbQuery(text, params = []) {
  const p = await getPool();
  return p.query(text, params);
}

async function ensureSchema() {
  await dbQuery(`
    CREATE TABLE IF NOT EXISTS shops (
      domain TEXT PRIMARY KEY,
      data   JSONB NOT NULL DEFAULT '{}'
    )
  `);
  await dbQuery(`
    CREATE TABLE IF NOT EXISTS app_data (
      key   TEXT PRIMARY KEY,
      value JSONB NOT NULL DEFAULT '{}'
    )
  `);
}

async function loadFromDB() {
  const { rows: shopRows } = await dbQuery('SELECT domain, data FROM shops');
  for (const row of shopRows) {
    db.shops[row.domain] = row.data;
  }
  const { rows: appRows } = await dbQuery("SELECT value FROM app_data WHERE key = 'messages'");
  if (appRows.length > 0) db.messages = appRows[0].value ?? [];
}

function saveShopToDB(domain) {
  const data = db.shops[domain];
  if (!data) return;
  dbQuery(
    `INSERT INTO shops (domain, data) VALUES ($1, $2::jsonb)
     ON CONFLICT (domain) DO UPDATE SET data = EXCLUDED.data`,
    [domain, JSON.stringify(data)]
  ).catch(e => console.error('DB shop save error:', e.message));
}

function deleteShopFromDB(domain) {
  dbQuery('DELETE FROM shops WHERE domain = $1', [domain])
    .catch(e => console.error('DB shop delete error:', e.message));
}

function saveMessagesToDB() {
  dbQuery(
    `INSERT INTO app_data (key, value) VALUES ('messages', $1::jsonb)
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
    [JSON.stringify(db.messages ?? [])]
  ).catch(e => console.error('DB messages save error:', e.message));
}

// ── Public init (called once before server starts) ────────────────────────────
export async function initStore() {
  if (USE_DB) {
    await ensureSchema();
    await loadFromDB();
    console.log(`[store] PostgreSQL — ${Object.keys(db.shops).length} shop(s) loaded`);
  } else {
    db = loadFromFile();
    if (!db.shops) db.shops = {};
    if (!db.messages) db.messages = [];
    console.log(`[store] File-based — ${Object.keys(db.shops).length} shop(s) loaded`);
  }
}

// save() is kept for file-mode; DB mode uses per-entity saves above
function save() {
  if (!USE_DB) saveToFile();
}

// ── Public API (unchanged signatures) ────────────────────────────────────────

export const getToken  = (shop) => db.shops[shop]?.token ?? null;
export const getShop   = (shop) => db.shops[shop] ?? null;
export const listShops = ()     => Object.values(db.shops);

export function saveShop(shop, token, info = {}) {
  // Preserve existing merchant data (returns, config, etc.) on reconnect
  db.shops[shop] = { ...(db.shops[shop] || {}), shop, token, info, installedAt: db.shops[shop]?.installedAt || new Date().toISOString() };
  if (USE_DB) saveShopToDB(shop); else save();
}

export function removeShop(shop) {
  delete db.shops[shop];
  if (USE_DB) deleteShopFromDB(shop); else save();
}

export function getReturns(shop) { return db.shops[shop]?.returns ?? []; }

export function addReturn(shop, ret) {
  if (!db.shops[shop]) return;
  db.shops[shop].returns = [ret, ...(db.shops[shop].returns ?? [])];
  if (USE_DB) saveShopToDB(shop); else save();
}

export function updateReturn(shop, rma, updates) {
  if (!db.shops[shop]) return null;
  const returns = db.shops[shop].returns ?? [];
  const idx = returns.findIndex(r => r.rma === rma);
  if (idx === -1) return null;
  returns[idx] = { ...returns[idx], ...updates, updatedAt: new Date().toISOString() };
  db.shops[shop].returns = returns;
  if (USE_DB) saveShopToDB(shop); else save();
  return returns[idx];
}

export function clearReturns(shop) {
  if (!db.shops[shop]) return;
  db.shops[shop].returns = [];
  if (USE_DB) saveShopToDB(shop); else save();
}

export function savePortalConfig(shop, config) {
  if (!db.shops[shop]) return;
  db.shops[shop].portalConfig = config;
  if (USE_DB) saveShopToDB(shop); else save();
}

export function getPortalConfig(shop) {
  return db.shops[shop]?.portalConfig ?? null;
}

export function cacheOrders(shop, orders) {
  if (!db.shops[shop]) return;
  db.shops[shop].cachedOrders = orders;
  db.shops[shop].ordersSyncedAt = new Date().toISOString();
  if (USE_DB) saveShopToDB(shop); else save();
}

export function getCachedOrders(shop) {
  return {
    orders: db.shops[shop]?.cachedOrders ?? [],
    syncedAt: db.shops[shop]?.ordersSyncedAt ?? null,
  };
}

export function findReturnByOrderId(shop, orderId) {
  return (db.shops[shop]?.returns ?? []).find(r =>
    r.orderId === String(orderId) || r.shopifyOrderId === String(orderId)
  ) ?? null;
}

export function findReturnByRma(shop, rma) {
  const upper = rma.toUpperCase();
  if (shop) return (db.shops[shop]?.returns ?? []).find(r => r.rma === upper || r.rma === rma) ?? null;
  for (const s of Object.values(db.shops)) {
    const found = (s.returns ?? []).find(r => r.rma === upper || r.rma === rma);
    if (found) return found;
  }
  return null;
}

// ── Merchant sessions (in-memory; survives in a single process but lost on
//    restart — merchants re-auth from localStorage token on next page load) ────

const merchantSessions = new Map();
const SESSION_TTL = 30 * 24 * 60 * 60 * 1000;

export function createMerchantSession(shop) {
  const token = crypto.randomBytes(32).toString('hex');
  merchantSessions.set(token, { shop, expiresAt: Date.now() + SESSION_TTL });
  return token;
}

export function verifyMerchantSession(token) {
  if (!token) return null;
  const s = merchantSessions.get(token);
  if (!s) return null;
  if (Date.now() > s.expiresAt) { merchantSessions.delete(token); return null; }
  return s.shop;
}

export function deleteMerchantSession(token) {
  merchantSessions.delete(token);
}

// ── Admin sessions ────────────────────────────────────────────────────────────

const adminSessions = new Set();

export function createAdminSession() {
  const token = crypto.randomBytes(32).toString('hex');
  adminSessions.add(token);
  return token;
}

export function isValidAdminSession(token) {
  return token ? adminSessions.has(token) : false;
}

// ── Support messages ──────────────────────────────────────────────────────────

export function getMessages(shop) {
  return (db.messages || []).filter(m => m.shop === shop);
}

export function getAllMessages() {
  return db.messages || [];
}

export function addMessage(shop, text, from) {
  if (!db.messages) db.messages = [];
  const msg = {
    id: Date.now() + '-' + Math.random().toString(36).slice(2, 6),
    shop, text, from, createdAt: new Date().toISOString(), read: false,
  };
  db.messages.push(msg);
  if (USE_DB) saveMessagesToDB(); else save();
  return msg;
}

export function markMessagesRead(shop, from) {
  if (!db.messages) return;
  db.messages = db.messages.map(m =>
    m.shop === shop && m.from !== from ? { ...m, read: true } : m
  );
  if (USE_DB) saveMessagesToDB(); else save();
}

export function unreadCountForAdmin() {
  return (db.messages || []).filter(m => m.from === 'merchant' && !m.read).length;
}
