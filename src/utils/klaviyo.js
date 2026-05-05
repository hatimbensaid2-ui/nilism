/**
 * Klaviyo integration utility.
 *
 * In production, Klaviyo API calls should go through your backend
 * (server-side) to keep the Private API key secret. The Track/Identify
 * API using the Public (site) key can be called client-side.
 *
 * Docs: https://developers.klaviyo.com/en/docs/overview
 */

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
  rejected:       'return_rejected',
};

/**
 * Build a standard Klaviyo event payload.
 * Replace the console.log with a real fetch() to your backend endpoint
 * which proxies to POST https://a.klaviyo.com/api/events
 */
export async function sendKlaviyoEvent({ apiKey, publicKey, eventName, customer, returnData, extra = {} }) {
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
              first_name: customer.name.split(' ')[0],
              last_name: customer.name.split(' ').slice(1).join(' '),
            },
          },
        },
        properties: {
          rma:           returnData.rma,
          order_number:  returnData.orderNumber,
          refund_amount: returnData.refundAmount,
          items:         returnData.items.map(i => ({ name: i.name, variant: i.variant, price: i.price })),
          ...extra,
        },
        value: returnData.refundAmount,
      },
    },
  };

  // ── Demo mode: log + resolve ──────────────────────────────────────────────
  if (!apiKey && !publicKey) {
    console.info('[Klaviyo DEMO] Event fired:', eventName, payload);
    return { success: true, simulated: true, payload };
  }

  // ── Production: call your backend proxy ──────────────────────────────────
  // const res = await fetch('/api/klaviyo/events', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify(payload),
  // });
  // return res.json();

  console.info('[Klaviyo] Would POST event:', eventName, payload);
  return { success: true, simulated: true, payload };
}
