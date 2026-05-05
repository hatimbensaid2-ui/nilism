import { useState } from 'react';
import { useMerchant } from '../MerchantContext';
import { getTrackingUrl } from '../../utils/trackingSync';

export const STATUS_CONFIG = {
  submitted:      { label: 'Submitted',      color: 'bg-slate-100 text-slate-600' },
  awaiting_items: { label: 'Awaiting Items', color: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200' },
  in_transit:     { label: 'In Transit',     color: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200' },
  received:       { label: 'Received',       color: 'bg-violet-50 text-violet-700 ring-1 ring-violet-200' },
  refunded:       { label: 'Refunded',       color: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' },
  rejected:       { label: 'Rejected',       color: 'bg-red-50 text-red-600 ring-1 ring-red-200' },
};

const STATUS_OPTIONS = ['all', 'submitted', 'awaiting_items', 'in_transit', 'received', 'refunded', 'rejected'];

function Avatar({ name }) {
  const initials = name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
  const colors = [
    'bg-violet-100 text-violet-700', 'bg-blue-100 text-blue-700',
    'bg-emerald-100 text-emerald-700', 'bg-amber-100 text-amber-700', 'bg-rose-100 text-rose-700',
  ];
  const color = colors[name.charCodeAt(0) % colors.length];
  return (
    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${color}`}>
      {initials}
    </div>
  );
}

export default function Returns({ onViewDetail }) {
  const { config, syncAllTracking, clearReturns } = useMerchant();
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const [confirmClear, setConfirmClear] = useState(false);

  const filtered = config.returns
    .filter(r => filter === 'all' || r.status === filter)
    .filter(r => {
      if (!search) return true;
      const q = search.toLowerCase();
      return r.rma.toLowerCase().includes(q) ||
        r.orderNumber.toLowerCase().includes(q) ||
        r.customer.name.toLowerCase().includes(q) ||
        (r.tracking || '').toLowerCase().includes(q);
    })
    .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));

  const pending = config.returns.filter(r => r.status === 'submitted' || r.status === 'awaiting_items').length;

  function handleSyncAll() {
    setSyncing(true);
    syncAllTracking().then(() => { setSyncing(false); setLastSync(new Date()); });
  }

  return (
    <div className="flex-1 min-h-screen bg-slate-50">
      {/* Page header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Returns</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {config.returns.length} total
              {pending > 0 && <span className="ml-2 text-amber-600 font-medium">· {pending} need attention</span>}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {config.returns.length > 0 && (
              <button
                onClick={() => setConfirmClear(true)}
                className="flex items-center gap-1.5 text-slate-500 hover:text-red-600 border border-slate-200 hover:border-red-300 text-sm font-medium px-3 py-2 rounded-lg transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Clear demo data
              </button>
            )}
            <div className="flex flex-col items-end gap-1">
              <button
                onClick={handleSyncAll}
                disabled={syncing}
                className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-sm font-semibold px-3.5 py-2 rounded-lg transition-colors"
              >
                <svg className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582M20 20v-5h-.581M5.635 15A9 9 0 1118.364 9H13" />
                </svg>
                {syncing ? 'Syncing...' : 'Sync Tracking'}
              </button>
              {lastSync && !syncing && (
                <span className="text-xs text-slate-400">Synced {lastSync.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              )}
            </div>
          </div>

          {/* Confirm clear dialog */}
          {confirmClear && (
            <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setConfirmClear(false)}>
              <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm mx-4" onClick={e => e.stopPropagation()}>
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-3">
                  <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                  </svg>
                </div>
                <h3 className="text-base font-bold text-slate-900 text-center mb-1">Clear all returns?</h3>
                <p className="text-sm text-slate-500 text-center mb-5">This permanently deletes all {config.returns.length} return records from this browser. Real customer submissions will appear fresh.</p>
                <div className="flex gap-2">
                  <button onClick={() => setConfirmClear(false)}
                    className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
                    Cancel
                  </button>
                  <button onClick={() => { clearReturns(); setConfirmClear(false); }}
                    className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-semibold transition-colors">
                    Clear All
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="flex gap-2 mt-4">
          <div className="relative flex-1 max-w-xs">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search RMA, order, customer..."
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-slate-50"
            />
          </div>
          <select
            value={filter}
            onChange={e => setFilter(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-slate-700"
          >
            {STATUS_OPTIONS.map(s => (
              <option key={s} value={s}>
                {s === 'all' ? 'All statuses' : STATUS_CONFIG[s]?.label || s}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="px-6 py-4">
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          {/* Column headers */}
          <div className="grid grid-cols-[1fr_140px_140px_100px] gap-4 px-4 py-2.5 border-b border-slate-100 bg-slate-50">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Customer / Order</span>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tracking</span>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</span>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Refund</span>
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <svg className="w-10 h-10 mx-auto mb-3 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
              </svg>
              {config.returns.length === 0 ? (
                <>
                  <p className="text-sm font-semibold text-slate-600 mb-1">No returns yet</p>
                  <p className="text-xs text-slate-400 max-w-xs mx-auto">
                    Share your portal link with customers — their submissions will appear here in real time.
                  </p>
                </>
              ) : (
                <p className="text-sm font-medium">No returns match your filters</p>
              )}
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filtered.map(r => {
                const s = STATUS_CONFIG[r.status] || STATUS_CONFIG.submitted;
                return (
                  <button
                    key={r.rma}
                    onClick={() => onViewDetail(r.rma)}
                    className="w-full grid grid-cols-[1fr_140px_140px_100px] gap-4 items-center px-4 py-3.5 hover:bg-slate-50 transition-colors text-left group"
                  >
                    {/* Customer */}
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar name={r.customer.name} />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate group-hover:text-indigo-600 transition-colors">
                          {r.customer.name}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-xs font-mono text-slate-500">{r.rma}</span>
                          <span className="text-slate-300">·</span>
                          <span className="text-xs text-slate-500">{r.orderNumber}</span>
                          <span className="text-slate-300">·</span>
                          <span className="text-xs text-slate-400">{r.items.length} item{r.items.length !== 1 ? 's' : ''}</span>
                        </div>
                      </div>
                    </div>

                    {/* Tracking */}
                    <div className="min-w-0">
                      {r.tracking ? (
                        <a
                          href={getTrackingUrl(r.carrier, r.tracking)}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={e => e.stopPropagation()}
                          className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 hover:underline font-mono truncate max-w-full transition-colors"
                        >
                          <span className="truncate">{r.tracking}</span>
                          <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Not uploaded</span>
                      )}
                    </div>

                    {/* Status */}
                    <div>
                      <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${s.color}`}>
                        {s.label}
                      </span>
                    </div>

                    {/* Refund */}
                    <div className="text-right">
                      <span className="text-sm font-semibold text-slate-800">${r.refundAmount.toFixed(2)}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
