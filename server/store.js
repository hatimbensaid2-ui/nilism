import { readFileSync, writeFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __dir = dirname(fileURLToPath(import.meta.url));
const FILE = join(__dir, 'shops.json');

// Load from disk on startup
let db;
try {
  db = existsSync(FILE) ? JSON.parse(readFileSync(FILE, 'utf8')) : { shops: {} };
} catch {
  db = { shops: {} };
}

function save() {
  try { writeFileSync(FILE, JSON.stringify(db, null, 2)); } catch (e) {
    console.error('store write error:', e.message);
  }
}

export const getToken   = (shop) => db.shops[shop]?.token ?? null;
export const getShop    = (shop) => db.shops[shop] ?? null;
export const listShops  = ()     => Object.values(db.shops);

export function saveShop(shop, token, info = {}) {
  db.shops[shop] = { shop, token, info, installedAt: new Date().toISOString() };
  save();
}

export function removeShop(shop) {
  delete db.shops[shop];
  save();
}

export function getReturns(shop) { return db.shops[shop]?.returns ?? []; }

export function addReturn(shop, ret) {
  if (!db.shops[shop]) return;
  db.shops[shop].returns = [ret, ...(db.shops[shop].returns ?? [])];
  save();
}

export function updateReturn(shop, rma, updates) {
  if (!db.shops[shop]) return null;
  const returns = db.shops[shop].returns ?? [];
  const idx = returns.findIndex(r => r.rma === rma);
  if (idx === -1) return null;
  returns[idx] = { ...returns[idx], ...updates, updatedAt: new Date().toISOString() };
  db.shops[shop].returns = returns;
  save();
  return returns[idx];
}

export function clearReturns(shop) {
  if (!db.shops[shop]) return;
  db.shops[shop].returns = [];
  save();
}

export function cacheOrders(shop, orders) {
  if (!db.shops[shop]) return;
  db.shops[shop].cachedOrders = orders;
  db.shops[shop].ordersSyncedAt = new Date().toISOString();
  save();
}

export function getCachedOrders(shop) {
  return {
    orders: db.shops[shop]?.cachedOrders ?? [],
    syncedAt: db.shops[shop]?.ordersSyncedAt ?? null,
  };
}

// ── Merchant sessions (in-memory; cleared on restart → merchant re-auths via Shopify) ──

const merchantSessions = new Map(); // token → { shop, expiresAt }
const SESSION_TTL = 30 * 24 * 60 * 60 * 1000; // 30 days

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
// Stored in db.messages: [{ id, shop, text, from, createdAt }]
// from: 'merchant' | 'admin'

export function getMessages(shop) {
  return (db.messages || []).filter(m => m.shop === shop);
}

export function getAllMessages() {
  return db.messages || [];
}

export function addMessage(shop, text, from) {
  if (!db.messages) db.messages = [];
  const msg = { id: Date.now() + '-' + Math.random().toString(36).slice(2, 6), shop, text, from, createdAt: new Date().toISOString(), read: false };
  db.messages.push(msg);
  save();
  return msg;
}

export function markMessagesRead(shop, from) {
  if (!db.messages) return;
  db.messages = db.messages.map(m =>
    m.shop === shop && m.from !== from ? { ...m, read: true } : m
  );
  save();
}

export function unreadCountForAdmin() {
  return (db.messages || []).filter(m => m.from === 'merchant' && !m.read).length;
}
