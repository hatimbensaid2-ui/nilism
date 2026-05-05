import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { getToken, saveShop, removeShop, listShops } from './store.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const app  = express();
const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST;                                    // e.g. https://your-app.railway.app
const KEY  = process.env.SHOPIFY_API_KEY;
const SEC  = process.env.SHOPIFY_API_SECRET;
const FRONTEND = process.env.FRONTEND_URL || 'http://localhost:5173';

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
app.use(cors({ origin: FRONTEND, credentials: true }));

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

  // Already installed — send merchant straight to the frontend
  if (getToken(shop)) {
    return res.redirect(`/?shopify_installed=1&shop=${encodeURIComponent(shop)}#merchant`);
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

    // Send merchant to the returns center frontend
    // Use query params before the hash so the frontend can read them reliably
    const redirect = `${FRONTEND}/?shopify_installed=1&shop=${encodeURIComponent(shop)}#merchant`;
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

// ── Health / admin ────────────────────────────────────────────────────────────

app.get('/health', (_, res) => {
  res.json({ ok: true, connectedShops: listShops().length });
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
