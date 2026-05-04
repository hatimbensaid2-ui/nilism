// ── Carrier tracking URLs ───────────────────────────────────────────────────

export const CARRIER_TRACKING_URLS = {
  UPS:   'https://www.ups.com/track?tracknum={t}&requester=WT/trackdetails',
  FedEx: 'https://www.fedex.com/fedextrack/?tracknumbers={t}',
  USPS:  'https://tools.usps.com/go/TrackConfirmAction?tLabels={t}',
  DHL:   'https://www.dhl.com/en/express/tracking.html?AWB={t}&brand=DHL',
  Other: 'https://google.com/search?q=track+package+{t}',
};

export function getTrackingUrl(carrier, tracking) {
  const template = CARRIER_TRACKING_URLS[carrier] || CARRIER_TRACKING_URLS.Other;
  return template.replace('{t}', encodeURIComponent(tracking));
}

// ── Deterministic hash so the same tracking number always gives same result ─

function hashStr(s) {
  return s.split('').reduce((acc, c) => (acc * 31 + c.charCodeAt(0)) & 0xffffff, 0);
}

// ── Tracking stages ─────────────────────────────────────────────────────────

const STAGE_EVENTS = [
  {
    label:    'Label Created',
    detail:   'Shipment information received by carrier',
    icon:     'info',
    daysAgo:  6,
  },
  {
    label:    'Picked Up',
    detail:   'Package picked up from sender',
    icon:     'pickup',
    daysAgo:  5,
  },
  {
    label:    'Arrived at Origin Facility',
    detail:   'Package processing at origin sorting center',
    icon:     'transit',
    daysAgo:  4,
  },
  {
    label:    'In Transit',
    detail:   'Package in transit to destination',
    icon:     'transit',
    daysAgo:  2.5,
  },
  {
    label:    'Out for Delivery',
    detail:   'Package out for final delivery',
    icon:     'delivery',
    daysAgo:  0.5,
  },
  {
    label:    'Delivered',
    detail:   'Package delivered to warehouse',
    icon:     'delivered',
    daysAgo:  0.1,
  },
];

// Map stage index → return status
function stageToReturnStatus(stage) {
  if (stage >= 5) return 'received';
  if (stage >= 1) return 'in_transit';
  return 'in_transit';
}

/**
 * Simulate a carrier tracking API call.
 * Returns { events, returnStatus, synced } deterministically for the same
 * tracking number so the demo is consistent across page loads.
 *
 * In production you would replace this with a real carrier API call
 * (UPS Tracking API, FedEx Track API, USPS Web Tools, etc.) or a
 * multi-carrier aggregator like EasyPost / Shippo.
 */
export function simulateTracking(carrier, tracking) {
  // Use hash to pick a stage 1-5 (never 0 — customer already shipped it)
  const h = hashStr(tracking);
  const stage = 1 + (h % 5); // 1..5

  const now = Date.now();
  const MS = 3600000 * 24;

  const events = STAGE_EVENTS.slice(0, stage + 1).map(ev => ({
    label:     ev.label,
    detail:    ev.detail,
    icon:      ev.icon,
    timestamp: new Date(now - ev.daysAgo * MS).toISOString(),
  }));

  return {
    events,
    returnStatus: stageToReturnStatus(stage),
    stage,
    synced: new Date().toISOString(),
  };
}
