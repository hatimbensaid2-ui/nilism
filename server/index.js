import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { resolveCname, resolve as dnsResolve } from 'dns/promises';
import { getToken, saveShop, removeShop, listShops, getReturns, addReturn, updateReturn, clearReturns, cacheOrders, getCachedOrders, savePortalConfig, getPortalConfig, createMerchantSession, verifyMerchantSession, deleteMerchantSession, createAdminSession, isValidAdminSession, getMessages, getAllMessages, addMessage, markMessagesRead, unreadCountForAdmin } from './store.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const app  = express();
const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || 'https://nilism-production-1996.up.railway.app';
const KEY  = process.env.SHOPIFY_API_KEY;
const SEC  = process.env.SHOPIFY_API_SECRET;

// Scopes — request everything you need upfront; Shopify shows these to the merchant
const SCOPES = [
  'read_orders',
  'write_orders',
  'read_customers',
  'write_customers',
  'read_products',
].join(',');

// ── HMAC helpers ──────────────────────────────────────────────────────────────

/** Verify HMAC on OAuth redirect / install query params */
function verifyOAuthHmac(query) {
  const { hmac, ...rest } = query;
  if (!hmac) return false;
  const msg = Object.keys(rest).sort()
    .map(k => `${k}=${rest[k]}`)
    .join('&');
  const expected = crypto.createHmac('sha256', SEC).update(msg).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(hmac));
  } catch { return false; }
}

/** Verify HMAC on incoming webhook payloads */
function verifyWebhookHmac(rawBody, hmacHeader) {
  const expected = crypto.createHmac('sha256', SEC).update(rawBody).digest('base64');
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(hmacHeader));
  } catch { return false; }
}

// ── Shopify API client ────────────────────────────────────────────────────────

function shopifyFetch(shop, path, opts = {}) {
  const token = getToken(shop);
  if (!token) {
    const e = new Error(`Shop ${shop} not connected — token missing`);
    e.status = 401;
    throw e;
  }
  return fetch(`https://${shop}/admin/api/2024-07/${path}`, {
    ...opts,
    headers: {
      'X-Shopify-Access-Token': token,
      'Content-Type': 'application/json',
      ...opts.headers,
    },
  });
}

// ── Webhook registration ──────────────────────────────────────────────────────

async function registerWebhooks(shop, token) {
  // All topics Shopify requires for a listed app + the ones we care about
  const topics = [
    'orders/create',
    'orders/updated',
    'refunds/create',
    'app/uninstalled',
    'customers/data_request', // GDPR — mandatory
    'customers/redact',        // GDPR — mandatory
    'shop/redact',             // GDPR — mandatory
  ];

  for (const topic of topics) {
    // Use topic path as URL key (orders/create → orders.create)
    const key = topic.replace('/', '.');
    try {
      await fetch(`https://${shop}/admin/api/2024-07/webhooks.json`, {
        method: 'POST',
        headers: { 'X-Shopify-Access-Token': token, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          webhook: { topic, address: `${HOST}/webhooks/${key}`, format: 'json' },
        }),
      });
    } catch (e) {
      // Non-fatal — log and continue
      console.warn(`Webhook registration failed for ${topic}:`, e.message);
    }
  }
}

// ── Middleware ────────────────────────────────────────────────────────────────

// Allow Shopify Admin to embed the app in an iframe
app.use((req, res, next) => {
  const shop = req.query.shop;
  const origin = shop
    ? `frame-ancestors https://${shop} https://admin.shopify.com https://*.myshopify.com`
    : `frame-ancestors https://admin.shopify.com https://*.myshopify.com`;
  res.setHeader('Content-Security-Policy', origin);
  res.removeHeader('X-Frame-Options');
  next();
});

// Webhook routes need the raw body buffer for HMAC verification
app.use('/webhooks', express.raw({ type: 'application/json' }));
app.use(express.json());
// In production frontend and backend share the same origin (Express serves the build).
// Allow localhost in dev for the Vite dev server.
app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:3001', 'https://nilism-production-1996.up.railway.app', 'https://agencia-return.up.railway.app'], credentials: true }));

// Serve built React frontend (production only — Railway deployment)
app.use(express.static(join(__dirname, 'public')));

// ── OAuth install flow ────────────────────────────────────────────────────────

/**
 * GET /auth/shopify?shop=MERCHANT.myshopify.com
 *
 * This is your "App URL" in the Shopify Partners dashboard.
 * Shopify sends merchants here when they click "Install" in the App Store.
 */
app.get('/auth/shopify', (req, res) => {
  const { shop } = req.query;
  if (!shop || !shop.endsWith('.myshopify.com')) {
    return res.status(400).send(
      'Invalid or missing shop. Expected: ?shop=STORENAME.myshopify.com'
    );
  }

  // Already installed — generate session and send merchant straight to dashboard
  if (getToken(shop)) {
    const token = createMerchantSession(shop);
    return res.redirect(`/merchant?shop=${encodeURIComponent(shop)}&token=${token}`);
  }

  const state = crypto.randomBytes(16).toString('hex');

  const url = new URL(`https://${shop}/admin/oauth/authorize`);
  url.searchParams.set('client_id', KEY);
  url.searchParams.set('scope', SCOPES);
  url.searchParams.set('redirect_uri', `${HOST}/auth/shopify/callback`);
  url.searchParams.set('state', state);

  // NOTE: In production store `state` in a signed cookie/session and verify
  // it in the callback to prevent CSRF. Omitted here for brevity.
  res.redirect(url.toString());
});

/**
 * GET /auth/shopify/callback
 *
 * Add this EXACT URL to "Allowed redirection URL(s)" in Shopify Partners.
 * Shopify calls it after the merchant approves the permission screen.
 */
app.get('/auth/shopify/callback', async (req, res) => {
  const { shop, code, hmac } = req.query;

  if (!shop || !code) {
    return res.status(400).send('Missing required OAuth parameters (shop, code).');
  }

  // Shopify signs the callback — reject anything that doesn't match
  if (!verifyOAuthHmac(req.query)) {
    return res.status(401).send('HMAC verification failed. Possible tampering.');
  }

  try {
    // Exchange the one-time code for a permanent access token
    const tokenRes = await fetch(`https://${shop}/admin/oauth/access_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: KEY, client_secret: SEC, code }),
    });
    const { access_token } = await tokenRes.json();
    if (!access_token) return res.status(500).send('Shopify did not return an access token.');

    // Fetch shop metadata to store alongside the token
    const shopRes = await fetch(`https://${shop}/admin/api/2024-07/shop.json`, {
      headers: { 'X-Shopify-Access-Token': access_token },
    });
    const { shop: shopInfo } = await shopRes.json();

    // Persist token + metadata to disk
    saveShop(shop, access_token, shopInfo);

    // Register webhooks (fire-and-forget — don't block the redirect)
    registerWebhooks(shop, access_token).catch(console.warn);

    // Generate a session token and send merchant to the dashboard
    const sessionToken = createMerchantSession(shop);
    const redirect = `/merchant?shop=${encodeURIComponent(shop)}&token=${sessionToken}`;
    res.redirect(redirect);
  } catch (err) {
    console.error('OAuth callback error:', err);
    res.status(500).send(`Installation failed: ${err.message}`);
  }
});

// ── Webhook handlers ──────────────────────────────────────────────────────────

app.post('/webhooks/:topic', (req, res) => {
  const hmacHeader = req.headers['x-shopify-hmac-sha256'];
  if (!hmacHeader || !verifyWebhookHmac(req.body, hmacHeader)) {
    return res.status(401).send('Webhook HMAC verification failed');
  }

  const shop  = req.headers['x-shopify-shop-domain'];
  const topic = req.params.topic.replace('.', '/');
  let body;
  try { body = JSON.parse(req.body.toString()); } catch { body = {}; }

  console.log(`[webhook] ${topic} from ${shop}`);

  switch (topic) {
    case 'app/uninstalled':
      // Remove token so we stop making API calls for this shop
      removeShop(shop);
      console.log(`  → Shop ${shop} uninstalled, token removed`);
      break;

    case 'refunds/create':
      // Future: update our return record to mark as refunded
      console.log(`  → Refund created: ${body.id}`);
      break;

    case 'orders/create':
    case 'orders/updated':
      // Future: sync order data to our returns database
      break;

    // GDPR webhooks — required for App Store listing
    case 'customers/data_request':
      // Merchant's customer requested their data — export it within 30 days
      console.log(`  → GDPR data request for customer ${body.customer?.id}`);
      break;
    case 'customers/redact':
      // Anonymise/delete customer data within 10 days
      console.log(`  → GDPR redact customer ${body.customer?.id}`);
      break;
    case 'shop/redact':
      // Shop uninstalled 48 h ago — delete all shop data
      removeShop(shop);
      console.log(`  → GDPR shop redact: ${shop} data deleted`);
      break;
  }

  // Respond immediately — Shopify retries if you're slow
  res.status(200).send('OK');
});

// ── API proxy routes ──────────────────────────────────────────────────────────
// All routes accept ?shop=STORENAME.myshopify.com or X-Shopify-Shop header

function shopFrom(req) {
  return req.query.shop || req.headers['x-shopify-shop'] || null;
}

app.get('/api/shop', async (req, res) => {
  const shop = shopFrom(req);
  if (!shop) return res.status(400).json({ error: 'Missing shop' });
  try {
    const r = await shopifyFetch(shop, 'shop.json');
    res.json(await r.json());
  } catch (e) { res.status(e.status || 500).json({ error: e.message }); }
});

app.get('/api/orders', async (req, res) => {
  const shop = shopFrom(req);
  if (!shop) return res.status(400).json({ error: 'Missing shop' });
  const { shop: _s, ...params } = req.query;
  const qs = new URLSearchParams({ limit: 50, status: 'any', ...params }).toString();
  try {
    const r = await shopifyFetch(shop, `orders.json?${qs}`);
    res.json(await r.json());
  } catch (e) { res.status(e.status || 500).json({ error: e.message }); }
});

app.get('/api/orders/lookup', async (req, res) => {
  const shop = shopFrom(req);
  const { order_number, email } = req.query;
  if (!shop) return res.status(400).json({ error: 'Missing shop' });
  if (!order_number || !email) return res.status(400).json({ error: 'Missing order_number or email' });
  try {
    const { orders } = getCachedOrders(shop);
    const num = order_number.replace(/^#/, '').trim();
    let order = orders.find(o =>
      String(o.order_number) === num &&
      o.email?.toLowerCase() === email.trim().toLowerCase()
    );
    if (!order) {
      const r = await shopifyFetch(shop, `orders.json?name=%23${num}&status=any`);
      const data = await r.json();
      order = data.orders?.find(o => o.email?.toLowerCase() === email.trim().toLowerCase()) ?? null;
    }
    if (!order) return res.status(404).json({ error: 'Order not found' });
    const normalised = {
      id: String(order.id),
      orderNumber: `#${order.order_number}`,
      email: order.email,
      date: new Date(order.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
      customer: {
        name: `${order.customer?.first_name ?? ''} ${order.customer?.last_name ?? ''}`.trim() || order.billing_address?.name || 'Customer',
        address: order.shipping_address
          ? `${order.shipping_address.address1}, ${order.shipping_address.city}, ${order.shipping_address.province_code} ${order.shipping_address.zip}`
          : '',
      },
      items: (order.line_items ?? []).map(item => ({
        id: String(item.id),
        name: item.name,
        variant: item.variant_title || '',
        sku: item.sku || '',
        price: parseFloat(item.price),
        quantity: item.quantity,
        image: item.image?.src || null,
        returnable: true,
      })),
    };
    res.json({ order: normalised });
  } catch (e) { res.status(e.status || 500).json({ error: e.message }); }
});

app.get('/api/orders/:id', async (req, res) => {
  const shop = shopFrom(req);
  if (!shop) return res.status(400).json({ error: 'Missing shop' });
  try {
    const r = await shopifyFetch(shop, `orders/${req.params.id}.json`);
    res.json(await r.json());
  } catch (e) { res.status(e.status || 500).json({ error: e.message }); }
});

app.post('/api/orders/:id/refund', async (req, res) => {
  const shop = shopFrom(req);
  if (!shop) return res.status(400).json({ error: 'Missing shop' });
  try {
    // Step 1: let Shopify calculate transactions so we get the right parent IDs
    const calcR = await shopifyFetch(shop, `orders/${req.params.id}/refunds/calculate.json`, {
      method: 'POST',
      body: JSON.stringify({ refund: req.body }),
    });
    const calc = await calcR.json();

    const payload = {
      ...req.body,
      transactions: calc.refund?.transactions?.map(t => ({
        parent_id: t.parent_id,
        amount: t.amount,
        kind: 'refund',
        gateway: t.gateway,
      })) ?? [],
    };

    // Step 2: create the actual refund
    const refR = await shopifyFetch(shop, `orders/${req.params.id}/refunds.json`, {
      method: 'POST',
      body: JSON.stringify({ refund: payload }),
    });
    const data = await refR.json();
    res.status(refR.ok ? 200 : 422).json(data);
  } catch (e) { res.status(e.status || 500).json({ error: e.message }); }
});

// ── Returns API (merchant-authenticated) ──────────────────────────────────────

app.get('/api/returns', merchantAuth, (req, res) => {
  res.json({ returns: getReturns(req.merchantShop) });
});

app.post('/api/returns', merchantAuth, (req, res) => {
  const ret = req.body;
  if (!ret.rma) return res.status(400).json({ error: 'Missing rma' });
  addReturn(req.merchantShop, ret);
  res.json({ ok: true });
});

app.put('/api/returns/:rma', merchantAuth, (req, res) => {
  const updated = updateReturn(req.merchantShop, req.params.rma, req.body);
  if (!updated) return res.status(404).json({ error: 'Return not found' });
  res.json({ ok: true, return: updated });
});

app.delete('/api/returns', merchantAuth, (req, res) => {
  clearReturns(req.merchantShop);
  res.json({ ok: true });
});

// ── Orders sync (merchant-authenticated) ─────────────────────────────────────

app.post('/api/orders/sync', merchantAuth, async (req, res) => {
  const shop = req.merchantShop;
  try {
    const r = await shopifyFetch(shop, 'orders.json?limit=250&status=any');
    const { orders } = await r.json();
    cacheOrders(shop, orders ?? []);
    res.json({ ok: true, count: orders?.length ?? 0, syncedAt: new Date().toISOString() });
  } catch (e) { res.status(e.status || 500).json({ error: e.message }); }
});

// ── Merchant session ──────────────────────────────────────────────────────────

function bearerToken(req) {
  const h = req.headers.authorization;
  return h?.startsWith('Bearer ') ? h.slice(7) : null;
}

function merchantAuth(req, res, next) {
  const token = bearerToken(req);
  const shop = verifyMerchantSession(token);
  if (!shop) return res.status(401).json({ error: 'Unauthorized' });
  req.merchantShop = shop;
  next();
}

app.get('/api/merchant/verify', (req, res) => {
  const token = bearerToken(req);
  const shop = verifyMerchantSession(token);
  if (!shop) return res.status(401).json({ ok: false });
  const info = listShops().find(s => s.shop === shop);
  res.json({ ok: true, shop, storeName: info?.info?.name || shop });
});

app.post('/api/merchant/logout', (req, res) => {
  const token = bearerToken(req);
  if (token) deleteMerchantSession(token);
  res.json({ ok: true });
});

// ── Admin routes ──────────────────────────────────────────────────────────────

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin1234';

function adminAuth(req, res, next) {
  const token = bearerToken(req);
  if (!isValidAdminSession(token)) return res.status(401).json({ error: 'Unauthorized' });
  next();
}

app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  if (password !== ADMIN_PASSWORD) return res.status(401).json({ error: 'Invalid password' });
  const token = createAdminSession();
  res.json({ ok: true, token });
});

app.get('/api/admin/shops', adminAuth, (req, res) => {
  const shops = listShops().map(s => ({
    shop: s.shop,
    name: s.info?.name || s.shop,
    email: s.info?.email || null,
    phone: s.info?.phone || null,
    country: s.info?.country_name || null,
    currency: s.info?.currency || null,
    installedAt: s.installedAt,
    returnCount: getReturns(s.shop).length,
    lastReturn: getReturns(s.shop)[0]?.submittedAt || null,
  }));
  res.json({ shops });
});

app.delete('/api/admin/shops/:shop', adminAuth, (req, res) => {
  removeShop(decodeURIComponent(req.params.shop));
  res.json({ ok: true });
});

app.get('/api/admin/messages', adminAuth, (req, res) => {
  const msgs = getAllMessages();
  // Group by shop, newest message first per shop
  const byShop = {};
  msgs.forEach(m => {
    if (!byShop[m.shop]) byShop[m.shop] = [];
    byShop[m.shop].push(m);
  });
  res.json({ byShop, unread: unreadCountForAdmin() });
});

app.post('/api/admin/messages/:shop', adminAuth, (req, res) => {
  const shop = decodeURIComponent(req.params.shop);
  const { text } = req.body;
  if (!text?.trim()) return res.status(400).json({ error: 'Empty message' });
  const msg = addMessage(shop, text.trim(), 'admin');
  markMessagesRead(shop, 'admin');
  res.json({ ok: true, message: msg });
});

// ── Merchant support chat ─────────────────────────────────────────────────────

app.get('/api/support/messages', merchantAuth, (req, res) => {
  const msgs = getMessages(req.merchantShop);
  markMessagesRead(req.merchantShop, 'merchant');
  res.json({ messages: msgs });
});

app.post('/api/support/messages', merchantAuth, (req, res) => {
  const { text } = req.body;
  if (!text?.trim()) return res.status(400).json({ error: 'Empty message' });
  const msg = addMessage(req.merchantShop, text.trim(), 'merchant');
  res.json({ ok: true, message: msg });
});

// ── Portal return submission (public — no merchant token on customer portal) ──

app.post('/api/portal/returns', async (req, res) => {
  const shop = shopFrom(req);
  if (!shop) return res.status(400).json({ error: 'Missing shop' });
  if (!getToken(shop)) return res.status(404).json({ error: 'Shop not found' });
  const ret = req.body;
  if (!ret?.rma) return res.status(400).json({ error: 'Missing rma' });
  addReturn(shop, ret);
  res.json({ ok: true });
});

// ── Portal config (public read, merchant-authenticated write) ─────────────────

app.get('/api/portal/config', (req, res) => {
  const shop = shopFrom(req);
  if (!shop) return res.status(400).json({ error: 'Missing shop' });
  const config = getPortalConfig(shop);
  if (!config) return res.status(404).json({ error: 'Config not found' });
  res.json({ config });
});

app.post('/api/merchant/config', merchantAuth, (req, res) => {
  savePortalConfig(req.merchantShop, req.body);
  res.json({ ok: true });
});

app.post('/api/merchant/verify-domain', merchantAuth, async (req, res) => {
  const { domain, token } = req.body;
  if (!domain || !token) return res.status(400).json({ error: 'Missing domain or token' });

  let cnameOk = false;
  let txtOk = false;

  try {
    const cnames = await resolveCname(domain);
    cnameOk = cnames.some(c => c.includes('railway.app'));
  } catch { /* domain not yet pointing anywhere */ }

  try {
    const records = await dnsResolve(`_verify-returns.${domain}`, 'TXT');
    const flat = records.flat();
    txtOk = flat.some(t => t === token);
  } catch { /* TXT record not yet added */ }

  res.json({ verified: cnameOk && txtOk, cname: cnameOk, txt: txtOk });
});

// ── Health ────────────────────────────────────────────────────────────────────

app.get('/health', (_, res) => {
  res.json({ ok: true, connectedShops: listShops().length });
});

// If Shopify embeds the app at the root URL with ?shop=, redirect to the merchant dashboard.
// This handles the case where the App URL in Shopify Partners is set to the root domain.
app.get('/', (req, res, next) => {
  const { shop } = req.query;
  if (shop && shop.endsWith('.myshopify.com')) {
    return res.redirect(`/auth/shopify?shop=${encodeURIComponent(shop)}`);
  }
  next();
});

// SPA fallback — serve index.html for any non-API route
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, 'public', 'index.html'));
});

// ── Start ─────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  const base = HOST || `http://localhost:${PORT}`;
  console.log(`\nReturns Center backend on port ${PORT}`);
  console.log(`\nPaste these into Shopify Partners → App setup:`);
  console.log(`  App URL:              ${base}/auth/shopify`);
  console.log(`  Allowed redirect URL: ${base}/auth/shopify/callback`);
  console.log(`\nGDPR webhook URLs (Partners → App setup → GDPR webhooks):`);
  console.log(`  Customer data request: ${base}/webhooks/customers.data_request`);
  console.log(`  Customer redact:       ${base}/webhooks/customers.redact`);
  console.log(`  Shop redact:           ${base}/webhooks/shop.redact`);
  console.log(`\nTest install link:`);
  console.log(`  ${base}/auth/shopify?shop=DEVSTORE.myshopify.com\n`);
});
