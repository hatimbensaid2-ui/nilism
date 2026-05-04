import { useState } from 'react';
import { useMerchant } from '../MerchantContext';
import { getTrackingUrl } from '../../utils/trackingSync';

export const STATUS_CONFIG = {
  submitted:      { label: 'Submitted',       color: 'bg-gray-100 text-gray-700' },
  awaiting_items: { label: 'Awaiting Items',  color: 'bg-yellow-100 text-yellow-700' },
  in_transit:     { label: 'In Transit',      color: 'bg-blue-100 text-blue-700' },
  received:       { label: 'Received',        color: 'bg-purple-100 text-purple-700' },
  refunded:       { label: 'Refunded',        color: 'bg-green-100 text-green-700' },
  rejected:       { label: 'Rejected',        color: 'bg-red-100 text-red-700' },
};

const STATUS_OPTIONS = ['all', 'submitted', 'awaiting_items', 'in_transit', 'received', 'refunded', 'rejected'];

export default function Returns({ onViewDetail }) {
  const { config, syncAllTracking } = useMerchant();
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState(null);

  function handleSyncAll() {
    setSyncing(true);
    syncAllTracking().then(() => {
      setSyncing(false);
      setLastSync(new Date());
    });
  }

  const filtered = config.returns
    .filter(r => filter === 'all' || r.status === filter)
    .filter(r => {
      if (!search) return true;
      const q = search.toLowerCase();
      return r.rma.toLowerCase().includes(q) || r.orderNumber.toLowerCase().includes(q) || r.customer.name.toLowerCase().includes(q);
    })
    .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));

  return (
    <div className="p-6 max-w-5xl">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Returns</h1>
          <p className="text-sm text-gray-500 mt-1">{config.returns.length} total return{config.returns.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <button
            onClick={handleSyncAll}
            disabled={syncing}
            className="flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-700 border border-indigo-200 hover:border-indigo-300 px-3 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            <svg className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582M20 20v-5h-.581M5.635 15A9 9 0 1118.364 9H13" />
            </svg>
            {syncing ? 'Syncing...' : 'Sync All Tracking'}
          </button>
          {lastSync && !syncing && (
            <span className="text-xs text-gray-400">
              Last synced {lastSync.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search RMA, order, customer..."
          className="flex-1 px-3.5 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        />
        <select
          value={filter}
          onChange={e => setFilter(e.target.value)}
          className="px-3.5 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
        >
          {STATUS_OPTIONS.map(s => (
            <option key={s} value={s}>
              {s === 'all' ? 'All statuses' : STATUS_CONFIG[s]?.label || s}
            </option>
          ))}
        </select>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400 text-sm">No returns found.</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filtered.map(r => {
              const s = STATUS_CONFIG[r.status] || STATUS_CONFIG.submitted;
              const wh = config.warehouses.find(w => w.id === r.warehouseId);
              return (
                <button
                  key={r.rma}
                  onClick={() => onViewDetail(r.rma)}
                  className="w-full text-left flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-sm font-bold text-gray-900">{r.rma}</span>
                      <span className="text-gray-400 text-xs">·</span>
                      <span className="text-sm text-gray-600">{r.orderNumber}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                      <p className="text-xs text-gray-500">{r.customer.name}</p>
                      {wh && <p className="text-xs text-gray-400">{wh.name}</p>}
                      {r.tracking && (
                        <a
                          href={getTrackingUrl(r.carrier, r.tracking)}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={e => e.stopPropagation()}
                          className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 hover:underline font-mono transition-colors"
                        >
                          {r.carrier}: {r.tracking}
                          <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${s.color}`}>{s.label}</span>
                    <span className="text-sm font-semibold text-gray-700">${r.refundAmount.toFixed(2)}</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
