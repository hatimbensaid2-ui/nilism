import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import crypto from 'crypto';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));

// In-memory token store. In production use a database (PostgreSQL, Redis, etc.)
const tokenStore = new Map(); // shop -> accessToken

function getShopify(shop) {
  const token = tokenStore.get(shop);
  return { token, shop };
}

// ── Shopify OAuth ─────────────────────────────────────────────────────────────

const SCOPES = 'read_orders,write_orders,read_customers,write_customers,read_products';

// Step 1: redirect the merchant to Shopify's OAuth consent screen
app.get('/auth/shopify', (req, res) => {
  const { shop } = req.query;
  if (!shop) return res.status(400).json({ error: 'Missing shop parameter' });

  const normalised = shop.includes('.myshopify.com') ? shop : `${shop}.myshopify.com`;
  const state = crypto.randomBytes(16).toString('hex');
  const redirectUri = `${process.env.HOST}/auth/shopify/callback`;

  const url = new URL(`https://${normalised}/admin/oauth/authorize`);
  url.searchParams.set('client_id', process.env.SHOPIFY_API_KEY);
  url.searchParams.set('scope', SCOPES);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('state', state);

  res.redirect(url.toString());
});

// Step 2: Shopify redirects back here with a code, exchange it for an access token
app.get('/auth/shopify/callback', async (req, res) => {
  const { shop, code } = req.query;
  if (!shop || !code) return res.status(400).json({ error: 'Missing shop or code' });

  try {
    const tokenRes = await fetch(`https://${shop}/admin/oauth/access_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: process.env.SHOPIFY_API_KEY,
        client_secret: process.env.SHOPIFY_API_SECRET,
        code,
      }),
    });
    const { access_token } = await tokenRes.json();
    if (!access_token) throw new Error('No access_token in response');

    tokenStore.set(shop, access_token);

    // Redirect the merchant back to the frontend with connection info
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}/#merchant?shopify_connected=1&shop=${encodeURIComponent(shop)}`);
  } catch (err) {
    console.error('OAuth callback error:', err);
    res.status(500).json({ error: 'OAuth failed', detail: err.message });
  }
});

// ── Shopify API proxy ─────────────────────────────────────────────────────────
// All routes below expect { shop } in the query string.
// The token is looked up server-side — never sent to the browser.

function shopifyFetch(shop, path, options = {}) {
  const token = tokenStore.get(shop);
  if (!token) throw Object.assign(new Error('Shop not connected'), { status: 401 });
  return fetch(`https://${shop}/admin/api/2024-07/${path}`, {
    ...options,
    headers: {
      'X-Shopify-Access-Token': token,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
}

// GET /api/shop-info?shop=...  — verify connection and return shop metadata
app.get('/api/shop-info', async (req, res) => {
  const { shop } = req.query;
  if (!shop) return res.status(400).json({ error: 'Missing shop' });
  try {
    const r = await shopifyFetch(shop, 'shop.json');
    const data = await r.json();
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// GET /api/orders?shop=...&limit=50&status=any
app.get('/api/orders', async (req, res) => {
  const { shop, ...params } = req.query;
  if (!shop) return res.status(400).json({ error: 'Missing shop' });
  const qs = new URLSearchParams({ limit: 50, status: 'any', ...params }).toString();
  try {
    const r = await shopifyFetch(shop, `orders.json?${qs}`);
    const data = await r.json();
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// GET /api/orders/:id?shop=...
app.get('/api/orders/:id', async (req, res) => {
  const { shop } = req.query;
  if (!shop) return res.status(400).json({ error: 'Missing shop' });
  try {
    const r = await shopifyFetch(shop, `orders/${req.params.id}.json`);
    const data = await r.json();
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// POST /api/orders/:id/refund?shop=...
// Body: { notify, note, shipping, refund_line_items, transactions }
app.post('/api/orders/:id/refund', async (req, res) => {
  const { shop } = req.query;
  if (!shop) return res.status(400).json({ error: 'Missing shop' });
  try {
    // Calculate refund amounts first to get transaction parent IDs
    const calcRes = await shopifyFetch(shop, `orders/${req.params.id}/refunds/calculate.json`, {
      method: 'POST',
      body: JSON.stringify({ refund: req.body }),
    });
    const calc = await calcRes.json();

    // Build the final refund payload with transactions from the calculation
    const refundPayload = {
      ...req.body,
      transactions: calc.refund?.transactions?.map(t => ({
        parent_id: t.parent_id,
        amount: t.amount,
        kind: 'refund',
        gateway: t.gateway,
      })) || [],
    };

    const refundRes = await shopifyFetch(shop, `orders/${req.params.id}/refunds.json`, {
      method: 'POST',
      body: JSON.stringify({ refund: refundPayload }),
    });
    const data = await refundRes.json();
    res.status(refundRes.ok ? 200 : 422).json(data);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// POST /api/orders/:id/cancel?shop=...
app.post('/api/orders/:id/cancel', async (req, res) => {
  const { shop } = req.query;
  if (!shop) return res.status(400).json({ error: 'Missing shop' });
  try {
    const r = await shopifyFetch(shop, `orders/${req.params.id}/cancel.json`, {
      method: 'POST',
      body: JSON.stringify(req.body),
    });
    const data = await r.json();
    res.status(r.ok ? 200 : 422).json(data);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/health', (_, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`Returns Center backend running on port ${PORT}`);
  console.log(`  OAuth start:    GET  /auth/shopify?shop=yourstore.myshopify.com`);
  console.log(`  OAuth callback: GET  /auth/shopify/callback`);
  console.log(`  Orders:         GET  /api/orders?shop=...`);
  console.log(`  Refund:         POST /api/orders/:id/refund?shop=...`);
});
