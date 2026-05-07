import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { resolveCname, resolve as dnsResolve } from 'dns/promises';
import { initStore, getToken, saveShop, removeShop, listShops, getReturns, addReturn, updateReturn, clearReturns, cacheOrders, getCachedOrders, savePortalConfig, getPortalConfig, findReturnByOrderId, findReturnByRma, createMerchantSession, verifyMerchantSession, deleteMerchantSession, createAdminSession, isValidAdminSession, getMessages, getAllMessages, addMessage, markMessagesRead, unreadCountForAdmin } from './store.js';

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
  'write_draft_orders',
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

// Appends a note to a Shopify order's note field (visible in the order timeline)
async function appendOrderNote(shop, orderId, message) {
  try {
    const r = await shopifyFetch(shop, `orders/${orderId}.json?fields=id,note`);
    if (!r.ok) return;
    const { order } = await r.json();
    const stamp = new Date().toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit', timeZone: 'UTC', timeZoneName: 'short',
    });
    const entry = `[Returns App · ${stamp}]\n${message}`;
    const note = order.note ? `${order.note}\n\n${entry}` : entry;
    await shopifyFetch(shop, `orders/${orderId}.json`, {
      method: 'PUT',
      body: JSON.stringify({ order: { id: orderId, note } }),
    });
  } catch { /* supplementary — never block the main flow */ }
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

// ── Tracking sync (real carrier API via 17track, with simulation fallback) ────

const CARRIER_17TRACK = { UPS: 100011, FedEx: 100002, USPS: 100003, DHL: 100027 };

function guessTrackingIcon(text) {
  const t = (text || '').toLowerCase();
  if (t.includes('delivered') || t.includes('delivery')) return 'delivered';
  if (t.includes('out for delivery')) return 'delivery';
  if (t.includes('transit') || t.includes('in transit') || t.includes('departed') || t.includes('arrived')) return 'transit';
  if (t.includes('picked up') || t.includes('pickup') || t.includes('accepted')) return 'pickup';
  return 'info';
}

function parse17TrackDate(str) {
  if (!str) return new Date().toISOString();
  // 17track sends "2024-05-01 10:30" or ISO format
  return new Date(str.replace(' ', 'T') + (str.includes('T') ? '' : ':00Z')).toISOString();
}

// Deterministic simulation fallback (same as client-side logic)
function simulateTrackingServer(carrier, tracking) {
  const hash = tracking.split('').reduce((acc, c) => (acc * 31 + c.charCodeAt(0)) & 0xffffff, 0);
  const stage = 1 + (hash % 5);
  const STAGES = [
    { label: 'Label Created',           detail: 'Shipment information received by carrier',  icon: 'info',      daysAgo: 6   },
    { label: 'Picked Up',               detail: 'Package picked up from sender',              icon: 'pickup',    daysAgo: 5   },
    { label: 'Arrived at Origin Facility', detail: 'Package processing at origin sorting center', icon: 'transit', daysAgo: 4 },
    { label: 'In Transit',              detail: 'Package in transit to destination',          icon: 'transit',   daysAgo: 2.5 },
    { label: 'Out for Delivery',        detail: 'Package out for final delivery',             icon: 'delivery',  daysAgo: 0.5 },
    { label: 'Delivered',               detail: 'Package delivered to warehouse',             icon: 'delivered', daysAgo: 0.1 },
  ];
  const now = Date.now();
  const MS = 3600000 * 24;
  const events = STAGES.slice(0, stage + 1).map(ev => ({
    label: ev.label, detail: ev.detail, icon: ev.icon,
    timestamp: new Date(now - ev.daysAgo * MS).toISOString(),
  }));
  return { events, returnStatus: stage >= 5 ? 'received' : 'in_transit', synced: new Date().toISOString() };
}

app.post('/api/tracking/sync', merchantAuth, async (req, res) => {
  const shop = req.merchantShop;
  const { rma } = req.body;
  if (!rma) return res.status(400).json({ error: 'Missing rma' });

  const ret = getReturns(shop).find(r => r.rma === rma);
  if (!ret) return res.status(404).json({ error: 'Return not found' });
  if (!ret.tracking || !ret.carrier) return res.status(400).json({ error: 'No tracking info on return' });

  const FINAL = ['refunded', 'rejected'];
  if (FINAL.includes(ret.status)) return res.json({ events: ret.trackingEvents || [], returnStatus: ret.status, synced: ret.lastSynced });

  const apiKey = process.env.TRACK17_API_KEY;

  let events, returnStatus, synced;

  if (apiKey) {
    try {
      const carrierId = CARRIER_17TRACK[ret.carrier] || 0;
      // Register tracking number
      await fetch('https://api.17track.net/track/v2.2/register', {
        method: 'POST',
        headers: { '17token': apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify([{ number: ret.tracking, carrier: carrierId }]),
      });
      // Get tracking info
      const r = await fetch('https://api.17track.net/track/v2.2/gettrackinfo', {
        method: 'POST',
        headers: { '17token': apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify([{ number: ret.tracking }]),
      });
      const data = await r.json();
      const trackData = data.data?.accepted?.[0]?.track;
      const rawEvents = (trackData?.z1 || []).reverse();
      events = rawEvents.map(ev => ({
        label: ev.c || 'Update',
        detail: [ev.b, ev.d].filter(Boolean).join(' — '),
        icon: guessTrackingIcon(ev.c || ''),
        timestamp: parse17TrackDate(ev.a),
      }));
      const latestStatus = trackData?.z0?.a || '';
      const isDelivered = latestStatus.toLowerCase().includes('delivered') ||
                          rawEvents.some(e => (e.c || '').toLowerCase().includes('delivered'));
      returnStatus = isDelivered ? 'received' : (events.length ? 'in_transit' : 'in_transit');
      synced = new Date().toISOString();
    } catch (e) {
      console.warn('17track API error, falling back to simulation:', e.message);
      const sim = simulateTrackingServer(ret.carrier, ret.tracking);
      events = sim.events; returnStatus = sim.returnStatus; synced = sim.synced;
    }
  } else {
    const sim = simulateTrackingServer(ret.carrier, ret.tracking);
    events = sim.events; returnStatus = sim.returnStatus; synced = sim.synced;
  }

  const updates = { trackingEvents: events, status: returnStatus, lastSynced: synced, updatedAt: synced };
  updateReturn(shop, rma, updates);
  res.json({ events, returnStatus, synced });
});

// ── Orders ────────────────────────────────────────────────────────────────────
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

    // Determine delivery status and date from fulfillments
    const fulfillments = order.fulfillments || [];
    const deliveredFulfillment = fulfillments.find(f => f.shipment_status === 'delivered');
    const deliveredAt = deliveredFulfillment?.updated_at || null;
    const shipmentStatus = fulfillments[0]?.shipment_status || null;
    const isDelivered = !!deliveredFulfillment;

    // Build line items; fetch product images (with variant-specific images) for all items
    const lineItems = order.line_items ?? [];
    const productIds = [...new Set(lineItems.filter(i => i.product_id).map(i => String(i.product_id)))];
    // productData[pid] = { mainImage, variantImages: { variantId -> src } }
    const productData = {};
    await Promise.all(productIds.map(async pid => {
      try {
        const pr = await shopifyFetch(shop, `products/${pid}.json?fields=id,image,images,variants`);
        if (!pr.ok) return;
        const pd = await pr.json();
        const product = pd.product;
        if (!product) return;
        const imageMap = {};
        (product.images || []).forEach(img => { imageMap[img.id] = img.src; });
        const variantImages = {};
        (product.variants || []).forEach(v => {
          if (v.image_id && imageMap[v.image_id]) variantImages[String(v.id)] = imageMap[v.image_id];
        });
        productData[pid] = {
          mainImage: product.image?.src || (product.images?.[0]?.src) || null,
          variantImages,
        };
      } catch { /* ignore */ }
    }));

    function resolveItemImage(item) {
      if (item.image?.src) return item.image.src;
      const pd = productData[String(item.product_id)];
      if (!pd) return null;
      const variantImg = item.variant_id ? pd.variantImages[String(item.variant_id)] : null;
      return variantImg || pd.mainImage || null;
    }

    const normalised = {
      id: String(order.id),
      orderNumber: `#${order.order_number}`,
      email: order.email,
      date: new Date(order.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
      fulfillmentStatus: order.fulfillment_status || 'unfulfilled',
      shipmentStatus,
      isDelivered,
      fulfilledAt: fulfillments[0]?.updated_at || null,
      deliveredAt,
      customer: {
        name: `${order.customer?.first_name ?? ''} ${order.customer?.last_name ?? ''}`.trim() || order.billing_address?.name || 'Customer',
        address: order.shipping_address
          ? `${order.shipping_address.address1}, ${order.shipping_address.city}, ${order.shipping_address.province_code} ${order.shipping_address.zip}`
          : '',
      },
      items: lineItems.map(item => ({
        id: String(item.id),
        name: item.name,
        variant: item.variant_title || '',
        variantId: item.variant_id ? String(item.variant_id) : null,
        productId: item.product_id ? String(item.product_id) : null,
        sku: item.sku || '',
        price: parseFloat(item.price),
        quantity: item.quantity,
        image: resolveItemImage(item),
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

// Create a draft Shopify order for an exchange (no charge)
app.post('/api/orders/exchange', merchantAuth, async (req, res) => {
  const shop = req.merchantShop;
  const { customer, items, note, originalOrderId, rma } = req.body;
  if (!items?.length) return res.status(400).json({ error: 'Missing items' });
  try {
    const draftOrder = {
      line_items: items.map(item => ({
        variant_id: item.variantId ? parseInt(item.variantId) : undefined,
        title: item.name,
        quantity: item.quantity || 1,
        price: '0.00',
      })),
      customer: customer ? { email: customer.email } : undefined,
      note: note || 'Exchange order — no charge',
      tags: 'exchange,returns-center',
      applied_discount: {
        amount: items.reduce((s, i) => s + (parseFloat(i.price) || 0) * (i.quantity || 1), 0).toFixed(2),
        title: 'Exchange — No Charge',
        description: 'Full discount applied for exchange',
        value_type: 'fixed_amount',
        value: items.reduce((s, i) => s + (parseFloat(i.price) || 0) * (i.quantity || 1), 0).toFixed(2),
      },
    };
    const r = await shopifyFetch(shop, 'draft_orders.json', {
      method: 'POST',
      body: JSON.stringify({ draft_order: draftOrder }),
    });
    const data = await r.json();
    res.status(r.ok ? 200 : 422).json(data);

    // Write note to the original order timeline
    if (r.ok && originalOrderId) {
      const itemLines = items
        .map(i => `  • ${i.name}${i.variantTitle ? ` (${i.variantTitle})` : ''} ×${i.quantity || 1}`)
        .join('\n');
      const draftId = data.draft_order?.id;
      appendOrderNote(shop, originalOrderId,
        `Exchange order created${rma ? ` — RMA: ${rma}` : ''}.\nReplacement items:\n${itemLines}${draftId ? `\nDraft order #${data.draft_order.name || draftId}` : ''}`
      );
    }
  } catch (e) { res.status(e.status || 500).json({ error: e.message }); }
});

app.post('/api/orders/:id/refund', merchantAuth, async (req, res) => {
  const shop = req.merchantShop;
  try {
    // Ensure line_item_id values are integers — Shopify rejects string IDs with 422
    const body = {
      ...req.body,
      refund_line_items: (req.body.refund_line_items || [])
        .map(li => ({ ...li, line_item_id: parseInt(li.line_item_id, 10) }))
        .filter(li => !isNaN(li.line_item_id) && li.quantity > 0),
    };

    // Step 1: let Shopify calculate transactions so we get the right parent IDs
    const calcR = await shopifyFetch(shop, `orders/${req.params.id}/refunds/calculate.json`, {
      method: 'POST',
      body: JSON.stringify({ refund: body }),
    });
    const calc = await calcR.json();

    if (!calcR.ok) {
      const msg = JSON.stringify(calc.errors || calc.error || calc);
      return res.status(calcR.status).json({ error: `Shopify calculate failed: ${msg}` });
    }

    const payload = {
      ...body,
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

    if (!refR.ok) {
      const msg = JSON.stringify(data.errors || data.error || data);
      return res.status(refR.status).json({ error: `Shopify refund failed: ${msg}` });
    }

    // Shopify automatically adds a "Refunded $X" event to the order timeline.

    res.json(data);
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
  const shop = req.merchantShop;
  const updated = updateReturn(shop, req.params.rma, req.body);
  if (!updated) return res.status(404).json({ error: 'Return not found' });
  res.json({ ok: true, return: updated });

  // Write status-change note to Shopify order timeline (fire-and-forget)
  const orderId = updated.shopifyOrderId || updated.orderId;
  const newStatus = req.body.status;
  if (orderId && newStatus) {
    const statusMessages = {
      approved:  'Return approved — customer may now ship items back.',
      rejected:  'Return rejected.',
      received:  'Return package received at warehouse.',
      refunded:  `Refund processed — $${(updated.refundAmount || 0).toFixed(2)} USD.`,
      exchanged: 'Exchange order created.',
    };
    const msg = statusMessages[newStatus];
    if (msg) appendOrderNote(shop, orderId, `${msg} RMA: ${updated.rma}`);
  }
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

// ── Klaviyo event proxy ───────────────────────────────────────────────────────
// Public: shop comes from ?shop= query param; private API key read from server config.
app.post('/api/klaviyo/event', async (req, res) => {
  const shop = shopFrom(req);
  if (!shop) return res.status(400).json({ error: 'Missing shop' });

  const portalConfig = getPortalConfig(shop);
  const privateKey = portalConfig?.klaviyo?.apiKey;
  if (!privateKey) return res.status(400).json({ error: 'Klaviyo private API key not configured for this shop' });

  const { payload } = req.body;
  if (!payload) return res.status(400).json({ error: 'Missing payload' });

  try {
    const r = await fetch('https://a.klaviyo.com/api/events/', {
      method: 'POST',
      headers: {
        'Authorization': `Klaviyo-API-Key ${privateKey}`,
        'Content-Type': 'application/json',
        'revision': '2024-02-15',
      },
      body: JSON.stringify(payload),
    });

    if (!r.ok) {
      const body = await r.json().catch(() => ({}));
      const msg = JSON.stringify(body.errors || body.detail || body);
      return res.status(r.status).json({ error: `Klaviyo error: ${msg}` });
    }

    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Public portal return status endpoints ────────────────────────────────────

// Check if a return already exists for an order (duplicate prevention)
app.get('/api/portal/returns/status', (req, res) => {
  const shop = shopFrom(req);
  const { order_id } = req.query;
  if (!shop) return res.status(400).json({ error: 'Missing shop' });
  if (!order_id) return res.status(400).json({ error: 'Missing order_id' });
  const ret = findReturnByOrderId(shop, order_id);
  if (!ret) return res.json({ found: false });
  res.json({
    found: true,
    return: {
      rma: ret.rma,
      status: ret.status,
      submittedAt: ret.submittedAt,
      items: ret.items,
      refundMethod: ret.refundMethod,
      tracking: ret.tracking,
      carrier: ret.carrier,
      trackingEvents: ret.trackingEvents || [],
    },
  });
});

// Look up a return by RMA (for upload tracking tab)
app.get('/api/portal/returns/lookup', (req, res) => {
  const shop = shopFrom(req);
  const { rma } = req.query;
  if (!shop) return res.status(400).json({ error: 'Missing shop' });
  if (!rma) return res.status(400).json({ error: 'Missing rma' });
  const ret = findReturnByRma(shop, rma.trim());
  if (!ret) return res.json({ found: false });
  res.json({
    found: true,
    return: {
      rma: ret.rma,
      status: ret.status,
      submittedAt: ret.submittedAt,
      items: ret.items,
      refundMethod: ret.refundMethod,
      tracking: ret.tracking,
      carrier: ret.carrier,
      trackingEvents: ret.trackingEvents || [],
    },
  });
});

// Upload tracking publicly (customer submits tracking number)
app.patch('/api/portal/returns/tracking', (req, res) => {
  const shop = shopFrom(req);
  const { rma } = req.query;
  if (!shop || !rma) return res.status(400).json({ error: 'Missing shop or rma' });
  const { tracking, carrier } = req.body;
  if (!tracking || !carrier) return res.status(400).json({ error: 'Missing tracking or carrier' });
  const updated = updateReturn(shop, rma, { tracking: tracking.trim(), carrier, status: 'in_transit' });
  if (!updated) return res.status(404).json({ error: 'Return not found' });
  res.json({ ok: true });
});

// Get product variants for exchange picker (public)
app.get('/api/portal/products/variants', async (req, res) => {
  const shop = shopFrom(req);
  const { product_id } = req.query;
  if (!shop || !product_id) return res.status(400).json({ error: 'Missing shop or product_id' });
  try {
    const r = await shopifyFetch(shop, `products/${product_id}.json?fields=id,title,variants,images,options`);
    const body = await r.json();
    if (!r.ok) {
      const msg = JSON.stringify(body.errors || body.error || body);
      return res.status(r.status).json({ error: `Shopify error: ${msg}` });
    }
    const { product } = body;
    if (!product) return res.status(404).json({ error: 'Product not found or has been deleted' });
    const images = (product.images || []).reduce((acc, img) => { acc[img.id] = img.src; return acc; }, {});
    const variants = (product.variants || []).map(v => ({
      id: v.id,
      title: v.title,
      sku: v.sku,
      price: v.price,
      available: v.inventory_management === null || v.inventory_quantity > 0,
      inventory_quantity: v.inventory_quantity,
      option1: v.option1,
      option2: v.option2,
      option3: v.option3,
      image: v.image_id ? images[v.image_id] : null,
    }));
    res.json({ variants, images, options: product.options || [] });
  } catch (e) { res.status(e.status || 500).json({ error: e.message }); }
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

  // Write to Shopify order timeline (fire-and-forget)
  const orderId = ret.shopifyOrderId || ret.orderId;
  if (orderId) {
    const itemLines = (ret.items || [])
      .map(i => `  • ${i.name}${i.variant ? ` (${i.variant})` : ''} ×${i.quantity}${i.returnReasonLabel ? ` — ${i.returnReasonLabel}` : ''}`)
      .join('\n');
    const method = ret.refundMethod === 'store_credit' ? 'Store credit'
      : ret.refundMethod === 'exchange' ? 'Exchange'
      : 'Original payment method';
    appendOrderNote(shop, orderId,
      `Return submitted — RMA: ${ret.rma}\nRefund method: ${method}\nItems:\n${itemLines}`
    );
  }
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

// ── Railway API helpers (auto-register custom domains) ───────────────────────

const RAILWAY_API = 'https://backboard.railway.app/graphql/v2';
const RAILWAY_TOKEN = process.env.RAILWAY_API_TOKEN;
const RAILWAY_SERVICE_ID = process.env.RAILWAY_SERVICE_ID;
const RAILWAY_ENVIRONMENT_ID = process.env.RAILWAY_ENVIRONMENT_ID;

async function railwayGql(query, variables = {}) {
  if (!RAILWAY_TOKEN || !RAILWAY_SERVICE_ID || !RAILWAY_ENVIRONMENT_ID) return null;
  const res = await fetch(RAILWAY_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${RAILWAY_TOKEN}` },
    body: JSON.stringify({ query, variables }),
  });
  return res.json();
}

async function railwayAddDomain(domain) {
  const data = await railwayGql(
    `mutation($input: CustomDomainCreateInput!) { customDomainCreate(input: $input) { id domain } }`,
    { input: { domain, serviceId: RAILWAY_SERVICE_ID, environmentId: RAILWAY_ENVIRONMENT_ID } }
  );
  return data?.data?.customDomainCreate ?? null;
}

async function railwayRemoveDomain(domain) {
  // First find the domain ID
  const data = await railwayGql(
    `query($serviceId: String!, $environmentId: String!) {
       service(id: $serviceId) {
         serviceInstances { edges { node { customDomains { edges { node { id domain } } } } } }
       }
     }`,
    { serviceId: RAILWAY_SERVICE_ID, environmentId: RAILWAY_ENVIRONMENT_ID }
  );
  const edges = data?.data?.service?.serviceInstances?.edges ?? [];
  let domainId = null;
  for (const e of edges) {
    const found = e.node?.customDomains?.edges?.find(d => d.node?.domain === domain);
    if (found) { domainId = found.node.id; break; }
  }
  if (!domainId) return null;
  const del = await railwayGql(
    `mutation($id: String!) { customDomainDelete(id: $id) }`,
    { id: domainId }
  );
  return del?.data?.customDomainDelete ?? null;
}

app.post('/api/merchant/verify-domain', merchantAuth, async (req, res) => {
  const { domain, token } = req.body;
  if (!domain || !token) return res.status(400).json({ error: 'Missing domain or token' });

  let cnameOk = false;
  let txtOk = false;

  try {
    const cnames = await resolveCname(domain);
    // Accept CNAME pointing to railway.app OR to any of our own custom app domains
    cnameOk = cnames.some(c => c.includes('railway.app') || c.includes(HOST.replace('https://', '')));
  } catch { /* domain not yet pointing anywhere */ }

  try {
    const records = await dnsResolve(`_verify-returns.${domain}`, 'TXT');
    const flat = records.flat();
    txtOk = flat.some(t => t === token);
  } catch { /* TXT record not yet added */ }

  const verified = cnameOk && txtOk;

  // Auto-register in Railway when verified so no manual dashboard step is needed
  let railwayDomainId = null;
  if (verified) {
    try {
      const created = await railwayAddDomain(domain);
      railwayDomainId = created?.id ?? null;
    } catch (e) {
      console.warn('Railway domain auto-register failed:', e.message);
    }
  }

  res.json({ verified, cname: cnameOk, txt: txtOk, railwayDomainId });
});

// Remove domain from Railway when merchant deletes it
app.delete('/api/merchant/domains/:domain', merchantAuth, async (req, res) => {
  const domain = decodeURIComponent(req.params.domain);
  try {
    await railwayRemoveDomain(domain);
  } catch (e) {
    console.warn('Railway domain removal failed:', e.message);
  }
  res.json({ ok: true });
});

// ── Resolve shop from custom domain (public) ──────────────────────────────────

app.get('/api/resolve-domain', (req, res) => {
  const { hostname } = req.query;
  if (!hostname) return res.status(400).json({ error: 'hostname required' });
  const shops = listShops();
  const match = shops.find(s => {
    const domains = s.portalConfig?.domains || [];
    return domains.some(d => d.domain === hostname);
  });
  if (!match) return res.status(404).json({ error: 'No shop configured for this domain' });
  res.json({ shop: match.shop });
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

initStore().then(() => {
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
}).catch(err => {
  console.error('Failed to initialise store:', err.message);
  process.exit(1);
});
