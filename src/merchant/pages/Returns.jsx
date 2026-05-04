import { useState } from 'react';
import { useMerchant } from '../MerchantContext';

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
  const { config } = useMerchant();
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

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
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Returns</h1>
        <p className="text-sm text-gray-500 mt-1">{config.returns.length} total return{config.returns.length !== 1 ? 's' : ''}</p>
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
                        <p className="text-xs text-blue-600 font-mono">{r.carrier}: {r.tracking}</p>
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
