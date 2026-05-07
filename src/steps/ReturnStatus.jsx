import { useEffect, useState } from 'react';
import { useMerchant } from '../merchant/MerchantContext';
import { getTrackingUrl } from '../utils/trackingSync';

const RETURN_FLOW = [
  { id: 'submitted',      label: 'Return Submitted',   description: 'Your return request has been received.' },
  { id: 'awaiting_items', label: 'Awaiting Items',      description: "We're waiting to receive your shipment." },
  { id: 'in_transit',     label: 'In Transit',          description: "Your items are on the way to our warehouse." },
  { id: 'received',       label: 'Items Received',      description: "We've received and are inspecting your return." },
  { id: 'refunded',       label: 'Refund Processed',    description: 'Your refund has been issued.' },
];

const STATUS_ORDER = ['submitted', 'awaiting_items', 'in_transit', 'received', 'refunded'];

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function formatTs(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
    ' · ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

export default function ReturnStatus({ rma: rmaProp, order, returnItems, onBack }) {
  const { config, syncTracking } = useMerchant();
  const [syncing, setSyncing] = useState(false);

  // Look up the live return from context (might have been updated)
  const ret = config.returns.find(r => r.rma === rmaProp) || null;
  const items = ret ? ret.items : (returnItems || []);
  const status = ret?.status || 'submitted';
  const currentIdx = STATUS_ORDER.indexOf(status);

  // Auto-sync on mount if tracking exists
  useEffect(() => {
    if (!ret?.tracking || !ret?.carrier) return;
    const FINAL = ['refunded', 'rejected'];
    if (FINAL.includes(ret.status)) return;
    setSyncing(true);
    syncTracking(rmaProp).finally(() => setSyncing(false));
  }, [rmaProp]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-6">
        <button onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4 transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
        <h2 className="text-xl font-bold text-gray-900">Return Status</h2>
        <p className="text-sm text-gray-500 mt-1 font-mono">{rmaProp}</p>
      </div>

      {/* Return progress */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-4">
        <div className="relative">
          <div className="absolute left-4 top-5 bottom-5 w-0.5 bg-gray-200 z-0" />
          <div className="space-y-5">
            {RETURN_FLOW.map((step, idx) => {
              const done = idx <= currentIdx;
              const active = idx === currentIdx;
              if (status === 'rejected' && idx > 0) return null;
              return (
                <div key={step.id} className="flex items-start gap-4 relative z-10">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 shrink-0 transition-colors ${
                    done ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-gray-300'
                  }`}>
                    {done ? (
                      <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <div className="w-2 h-2 rounded-full bg-gray-300" />
                    )}
                  </div>
                  <div className={`pt-1 ${done ? '' : 'opacity-40'}`}>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className={`text-sm font-semibold ${active ? 'text-indigo-700' : 'text-gray-900'}`}>
                        {step.label}
                      </p>
                      {active && (
                        <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium">
                          {syncing ? 'Syncing...' : 'Current'}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{step.description}</p>
                  </div>
                </div>
              );
            })}
            {status === 'rejected' && (
              <div className="flex items-start gap-4 relative z-10">
                <div className="w-8 h-8 rounded-full flex items-center justify-center bg-red-500 shrink-0">
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <div className="pt-1">
                  <p className="text-sm font-semibold text-red-700">Return Rejected</p>
                  <p className="text-xs text-gray-500 mt-0.5">Please contact support for more information.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tracking info */}
      {ret?.tracking && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-gray-700">Your Shipment</p>
            {syncing && (
              <span className="text-xs text-indigo-600 flex items-center gap-1">
                <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                </svg>
                Syncing...
              </span>
            )}
          </div>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Carrier: <span className="font-medium text-gray-700">{ret.carrier}</span></p>
              <a
                href={getTrackingUrl(ret.carrier, ret.tracking)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 font-mono text-sm font-semibold text-indigo-600 hover:text-indigo-800 hover:underline transition-colors"
              >
                {ret.tracking}
                <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
            <a
              href={getTrackingUrl(ret.carrier, ret.tracking)}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5"
            >
              Track on {ret.carrier}
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
          {ret.lastSynced && !syncing && (
            <p className="text-xs text-gray-400 mt-2">Status auto-updated from carrier · {timeAgo(ret.lastSynced)}</p>
          )}
        </div>
      )}

      {/* Shipment events */}
      {ret?.trackingEvents?.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-4">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-700">Shipment Events</p>
            <span className="text-xs text-gray-400">{ret.carrier}</span>
          </div>
          <div className="divide-y divide-gray-100">
            {[...ret.trackingEvents].reverse().map((ev, i) => (
              <div key={i} className="flex items-start gap-3 px-4 py-3">
                <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${ev.icon === 'delivered' ? 'bg-green-500' : 'bg-indigo-400'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{ev.label}</p>
                  <p className="text-xs text-gray-500">{ev.detail}</p>
                </div>
                <p className="text-xs text-gray-400 shrink-0 tabular-nums">{formatTs(ev.timestamp)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Items */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
          <p className="text-sm font-semibold text-gray-700">Returned Items</p>
        </div>
        <div className="divide-y divide-gray-100">
          {items.map(item => (
            <div key={item.id} className="flex items-center gap-3 p-4">
              <img src={item.image} alt={item.name}
                className="w-12 h-12 rounded-lg object-cover bg-gray-100 shrink-0"
                onError={e => { e.target.style.display = 'none'; }} />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 text-sm truncate">{item.name}</p>
                <p className="text-xs text-gray-500">{item.variant}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 text-center">
        <p className="text-xs text-gray-400">
          Questions? Contact <span className="text-gray-600 font-medium">support@store.com</span>
        </p>
      </div>
    </div>
  );
}
