import { readFileSync, writeFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

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
