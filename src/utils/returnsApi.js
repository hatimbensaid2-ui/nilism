const BASE = import.meta.env.VITE_BACKEND_URL ?? (import.meta.env.DEV ? 'http://localhost:3001' : '');

async function req(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Request failed: ${res.status}`);
  return data;
}

export function fetchReturns(shop) {
  return req(`/api/returns?shop=${encodeURIComponent(shop)}`);
}

export function createReturn(shop, ret) {
  return req(`/api/returns?shop=${encodeURIComponent(shop)}`, {
    method: 'POST',
    body: JSON.stringify(ret),
  });
}

export function patchReturn(shop, rma, updates) {
  return req(`/api/returns/${encodeURIComponent(rma)}?shop=${encodeURIComponent(shop)}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
}

export function deleteReturns(shop) {
  return req(`/api/returns?shop=${encodeURIComponent(shop)}`, { method: 'DELETE' });
}

export function lookupOrder(shop, orderNumber, email) {
  return req(`/api/orders/lookup?shop=${encodeURIComponent(shop)}&order_number=${encodeURIComponent(orderNumber)}&email=${encodeURIComponent(email)}`);
}

export function syncOrders(shop) {
  return req(`/api/orders/sync?shop=${encodeURIComponent(shop)}`, { method: 'POST' });
}
