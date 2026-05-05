const BASE = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

async function req(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Request failed: ${res.status}`);
  return data;
}

export function startOAuth(shop) {
  const normalised = shop.includes('.myshopify.com') ? shop : `${shop}.myshopify.com`;
  window.location.href = `${BASE}/auth/shopify?shop=${encodeURIComponent(normalised)}`;
}

export async function getShopInfo(shop) {
  return req(`/api/shop-info?shop=${encodeURIComponent(shop)}`);
}

export async function getOrders(shop, params = {}) {
  const qs = new URLSearchParams({ shop, ...params }).toString();
  return req(`/api/orders?${qs}`);
}

export async function getOrder(shop, orderId) {
  return req(`/api/orders/${orderId}?shop=${encodeURIComponent(shop)}`);
}

/**
 * Process a refund via Shopify Admin API.
 *
 * @param {string} shop  - e.g. "yourstore.myshopify.com"
 * @param {string} orderId
 * @param {object} refund
 *   {
 *     notify: true,
 *     note: "Return processed",
 *     shipping: { full_refund: false, amount: "0.00" },
 *     refund_line_items: [
 *       { line_item_id: 123, quantity: 1, restock_type: "return" }
 *     ],
 *   }
 */
export async function processShopifyRefund(shop, orderId, refund) {
  return req(`/api/orders/${orderId}/refund?shop=${encodeURIComponent(shop)}`, {
    method: 'POST',
    body: JSON.stringify(refund),
  });
}
