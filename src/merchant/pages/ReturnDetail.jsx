import { useEffect, useState } from 'react';
import { useMerchant } from '../MerchantContext';
import { STATUS_CONFIG } from './Returns';
import { DEFAULT_RETURN_REASONS } from '../../data/mockOrders';
import { getTrackingUrl } from '../../utils/trackingSync';

const NEXT_STATUSES = {
  submitted:      ['awaiting_items', 'rejected'],
  awaiting_items: ['rejected'],
  in_transit:     ['rejected'],
  received:       ['refunded', 'rejected'],
  refunded:       [],
  rejected:       [],
};

const STATUS_LABELS = {
  awaiting_items: 'Mark Awaiting Items',
  received:       'Mark Received',
  refunded:       'Process Refund',
  rejected:       'Reject Return',
};

const EVENT_ICONS = {
  info:      <circle cx="12" cy="12" r="4" fill="currentColor" />,
  pickup:    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8l1 12a2 2 0 002 2h8a2 2 0 002-2L19 8" />,
  transit:   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414A1 1 0 0121 11.414V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />,
  delivery:  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />,
  delivered: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />,
};

function EventIcon({ type }) {
  const path = EVENT_ICONS[type] || EVENT_ICONS.info;
  const isDelivered = type === 'delivered';
  return (
    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isDelivered ? 'bg-green-500' : 'bg-indigo-500'}`}>
      <svg className="w-4 h-4 text-white" fill={type === 'info' ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke={type === 'info' ? 'none' : 'currentColor'}>
        {path}
      </svg>
    </div>
  );
}

function formatTs(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' · ' +
    d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function ReturnDetail({ rma, onBack }) {
  const { config, updateReturn, syncTracking } = useMerchant();
  const [syncing, setSyncing] = useState(false);
  const ret = config.returns.find(r => r.rma === rma);

  // Auto-sync tracking on mount if tracking exists and return isn't finalized
  useEffect(() => {
    if (!ret) return;
    const FINAL = ['refunded', 'rejected'];
    if (ret.tracking && ret.carrier && !FINAL.includes(ret.status)) {
      setSyncing(true);
      syncTracking(rma).finally(() => setSyncing(false));
    }
  }, [rma]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!ret) {
    return (
      <div className="p-6">
        <BackBtn onBack={onBack} />
        <p className="text-gray-500">Return not found.</p>
      </div>
    );
  }

  const s = STATUS_CONFIG[ret.status] || STATUS_CONFIG.submitted;
  const wh = config.warehouses.find(w => w.id === ret.warehouseId);
  const nextStatuses = NEXT_STATUSES[ret.status] || [];
  const FINAL = ['refunded', 'rejected'];
  const canSync = ret.tracking && ret.carrier && !FINAL.includes(ret.status);

  function getReasonLabel(id) {
    return (config.returnReasons || DEFAULT_RETURN_REASONS).find(r => r.id === id)?.label || id;
  }

  function handleSync() {
    setSyncing(true);
    syncTracking(rma).finally(() => setSyncing(false));
  }

  return (
    <div className="p-6 max-w-3xl">
      <BackBtn onBack={onBack} />

      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-mono">{ret.rma}</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Order {ret.orderNumber} · {ret.customer.name} · {ret.customer.email}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-sm font-semibold px-3 py-1.5 rounded-full ${s.color}`}>{s.label}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {/* Items */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
            <p className="text-sm font-semibold text-gray-700">Return Items</p>
          </div>
          <div className="divide-y divide-gray-100">
            {ret.items.map(item => (
              <div key={item.id} className="flex items-start gap-3 p-4">
                <img src={item.image} alt={item.name}
                  className="w-12 h-12 rounded-lg object-cover bg-gray-100 shrink-0"
                  onError={e => { e.target.style.display = 'none'; }} />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 text-sm truncate">{item.name}</p>
                  <p className="text-xs text-gray-500">{item.variant}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Reason: <span className="text-gray-700">{getReasonLabel(item.returnReason)}</span>
                  </p>
                </div>
                <span className="text-sm font-semibold text-gray-700 shrink-0">${(item.price * item.quantity).toFixed(2)}</span>
              </div>
            ))}
          </div>
          <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 flex justify-between">
            <span className="text-sm font-semibold text-gray-700">Refund amount</span>
            <span className="text-sm font-bold text-green-700">${ret.refundAmount.toFixed(2)}</span>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-3">
          {/* Tracking */}
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-gray-700">Tracking</p>
              {canSync && (
                <button
                  onClick={handleSync}
                  disabled={syncing}
                  className="flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-700 font-medium disabled:opacity-50 transition-colors"
                >
                  <svg className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582M20 20v-5h-.581M5.635 15A9 9 0 1118.364 9H13" />
                  </svg>
                  {syncing ? 'Syncing...' : 'Sync'}
                </button>
              )}
            </div>
            {ret.tracking ? (
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs text-gray-500 font-medium">{ret.carrier}</span>
                </div>
                <a
                  href={getTrackingUrl(ret.carrier, ret.tracking)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 font-mono text-sm font-semibold text-indigo-600 hover:text-indigo-800 hover:underline break-all transition-colors"
                >
                  {ret.tracking}
                  <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
                {ret.lastSynced && (
                  <p className="text-xs text-gray-400 mt-1.5">
                    {syncing ? 'Syncing...' : `Last synced ${timeAgo(ret.lastSynced)}`}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-400 italic">No tracking uploaded yet</p>
            )}
          </div>

          {/* Warehouse */}
          {wh && (
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <p className="text-sm font-semibold text-gray-700 mb-2">Destination Warehouse</p>
              <p className="text-sm text-gray-900 font-medium">{wh.name}</p>
              <p className="text-sm text-gray-500">{wh.address}, {wh.city}{wh.state ? `, ${wh.state}` : ''}</p>
              <p className="text-sm text-gray-500">{wh.country}</p>
            </div>
          )}

          {/* Dates */}
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-sm font-semibold text-gray-700 mb-2">Timeline</p>
            <p className="text-xs text-gray-500">Submitted: <span className="text-gray-700">{new Date(ret.submittedAt).toLocaleDateString()}</span></p>
            <p className="text-xs text-gray-500 mt-1">Last updated: <span className="text-gray-700">{new Date(ret.updatedAt).toLocaleDateString()}</span></p>
          </div>
        </div>
      </div>

      {/* Tracking events timeline */}
      {ret.trackingEvents?.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-4">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-700">Shipment Events</p>
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {ret.carrier} · auto-synced
            </span>
          </div>
          <div className="p-4">
            <div className="relative">
              <div className="absolute left-4 top-4 bottom-4 w-0.5 bg-gray-200 z-0" />
              <div className="space-y-4">
                {[...ret.trackingEvents].reverse().map((ev, i) => (
                  <div key={i} className="flex items-start gap-4 relative z-10">
                    <EventIcon type={ev.icon} />
                    <div className="flex-1 pt-1">
                      <p className="text-sm font-semibold text-gray-900">{ev.label}</p>
                      <p className="text-xs text-gray-500">{ev.detail}</p>
                    </div>
                    <p className="text-xs text-gray-400 pt-1 shrink-0 tabular-nums">{formatTs(ev.timestamp)}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Manual status actions — only show for things tracking can't auto-do */}
      {nextStatuses.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-sm font-semibold text-gray-700 mb-1">Manual Actions</p>
          <p className="text-xs text-gray-400 mb-3">
            Status updates from tracking are automatic. Use these for manual overrides.
          </p>
          <div className="flex flex-wrap gap-2">
            {nextStatuses.map(ns => (
              <button
                key={ns}
                onClick={() => updateReturn(rma, { status: ns })}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  ns === 'rejected'
                    ? 'border border-red-300 text-red-600 hover:bg-red-50'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                }`}
              >
                {STATUS_LABELS[ns] || ns}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function BackBtn({ onBack }) {
  return (
    <button onClick={onBack}
      className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-5 transition-colors">
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
      </svg>
      Back to Returns
    </button>
  );
}
