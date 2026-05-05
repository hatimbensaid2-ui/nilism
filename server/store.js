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
