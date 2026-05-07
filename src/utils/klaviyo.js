export const KLAVIYO_EVENTS = {
  RETURN_SUBMITTED:  'Return Submitted',
  RETURN_APPROVED:   'Return Approved',
  TRACKING_RECEIVED: 'Tracking Received',
  ITEMS_RECEIVED:    'Items Received',
  REFUND_PROCESSED:  'Refund Processed',
  RETURN_REJECTED:   'Return Rejected',
  PHOTO_REQUESTED:   'Photo Requested',
};

export const KLAVIYO_STATUS_EVENT_MAP = {
  awaiting_items: 'return_approved',
  in_transit:     'tracking_received',
  received:       'items_received',
  refunded:       'refund_processed',
  // 'rejected' is handled directly in handleReject (includes rejection reason)
};

const BASE = import.meta.env.VITE_BACKEND_URL ?? (import.meta.env.DEV ? 'http://localhost:3001' : '');

export async function sendKlaviyoEvent({ shop, eventName, customer, returnData, extra = {} }) {
  if (!shop) return;

  const payload = {
    data: {
      type: 'event',
      attributes: {
        metric: { data: { type: 'metric', attributes: { name: eventName } } },
        profile: {
          data: {
            type: 'profile',
            attributes: {
              email: customer.email,
              first_name: customer.name?.split(' ')[0] || '',
              last_name: customer.name?.split(' ').slice(1).join(' ') || '',
            },
          },
        },
        properties: {
          rma:           returnData?.rma,
          order_number:  returnData?.orderNumber,
          refund_amount: returnData?.refundAmount,
          items:         (returnData?.items || []).map(i => ({ name: i.name, variant: i.variant, price: i.price })),
          ...extra,
        },
        value: returnData?.refundAmount ?? 0,
      },
    },
  };

  const res = await fetch(`${BASE}/api/klaviyo/event?shop=${encodeURIComponent(shop)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ payload }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Klaviyo error: ${res.status}`);
  return data;
}
