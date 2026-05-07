const BASE = import.meta.env.VITE_BACKEND_URL ?? (import.meta.env.DEV ? 'http://localhost:3001' : '');

// Set once after merchant session is verified; included on all protected calls.
let _merchantToken = null;
export function setMerchantToken(token) { _merchantToken = token; }

async function req(path, options = {}, authenticated = false) {
  const headers = { 'Content-Type': 'application/json' };
  if (authenticated && _merchantToken) headers['Authorization'] = `Bearer ${_merchantToken}`;
  const res = await fetch(`${BASE}${path}`, { headers, ...options });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Request failed: ${res.status}`);
  return data;
}

// ── Merchant session ──────────────────────────────────────────────────────────

export function verifyMerchantSession(token) {
  return fetch(`${BASE}/api/merchant/verify`, {
    headers: { 'Authorization': `Bearer ${token}` },
  }).then(r => r.json());
}

// ── Returns (merchant-authenticated) ─────────────────────────────────────────

export function fetchReturns() {
  return req('/api/returns', {}, true);
}

export function createReturn(ret) {
  return req('/api/returns', { method: 'POST', body: JSON.stringify(ret) }, true);
}

export function patchReturn(rma, updates) {
  return req(`/api/returns/${encodeURIComponent(rma)}`, { method: 'PUT', body: JSON.stringify(updates) }, true);
}

export function deleteReturns() {
  return req('/api/returns', { method: 'DELETE' }, true);
}

// ── Orders (merchant-authenticated) ──────────────────────────────────────────

export function syncOrders() {
  return req('/api/orders/sync', { method: 'POST' }, true);
}

export function syncReturnTracking(rma) {
  return req('/api/tracking/sync', { method: 'POST', body: JSON.stringify({ rma }) }, true);
}

export function processRefund(orderId, refundPayload) {
  return req(`/api/orders/${encodeURIComponent(orderId)}/refund`, {
    method: 'POST',
    body: JSON.stringify(refundPayload),
  }, true);
}

// ── Portal config ─────────────────────────────────────────────────────────────

export function fetchPortalConfig(shop) {
  return req(`/api/portal/config?shop=${encodeURIComponent(shop)}`);
}

export function pushPortalConfig(config) {
  return req('/api/merchant/config', { method: 'POST', body: JSON.stringify(config) }, true);
}

export function verifyDomain(domain, token) {
  return req('/api/merchant/verify-domain', { method: 'POST', body: JSON.stringify({ domain, token }) }, true);
}

export function submitPortalReturn(shop, returnData) {
  return req(`/api/portal/returns?shop=${encodeURIComponent(shop)}`, { method: 'POST', body: JSON.stringify(returnData) });
}

export function createExchangeOrder(customer, items, note, originalOrderId, rma) {
  return req('/api/orders/exchange', { method: 'POST', body: JSON.stringify({ customer, items, note, originalOrderId, rma }) }, true);
}

// ── Order lookup (public — customer portal uses this) ─────────────────────────

export function lookupOrder(shop, orderNumber, email) {
  return req(`/api/orders/lookup?shop=${encodeURIComponent(shop)}&order_number=${encodeURIComponent(orderNumber)}&email=${encodeURIComponent(email)}`);
}

// ── Public portal return status ───────────────────────────────────────────────

export function lookupReturnByOrder(shop, orderId) {
  return req(`/api/portal/returns/status?shop=${encodeURIComponent(shop)}&order_id=${encodeURIComponent(orderId)}`);
}

export function lookupReturnByRma(shop, rma) {
  return req(`/api/portal/returns/lookup?shop=${encodeURIComponent(shop)}&rma=${encodeURIComponent(rma)}`);
}

export function uploadPublicTracking(shop, rma, tracking, carrier) {
  return req(
    `/api/portal/returns/tracking?shop=${encodeURIComponent(shop)}&rma=${encodeURIComponent(rma)}`,
    { method: 'PATCH', body: JSON.stringify({ tracking, carrier }) }
  );
}

export function fetchProductVariants(shop, productId) {
  return req(`/api/portal/products/variants?shop=${encodeURIComponent(shop)}&product_id=${encodeURIComponent(productId)}`);
}
