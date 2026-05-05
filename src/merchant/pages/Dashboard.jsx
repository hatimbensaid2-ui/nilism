import { useMerchant } from '../MerchantContext';
import { STATUS_CONFIG } from './Returns';

const STAT_CARDS = [
  {
    key: 'total',
    label: 'Total Returns',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
      </svg>
    ),
    bg: 'bg-indigo-50', icon_color: 'text-indigo-600', value_color: 'text-indigo-700',
  },
  {
    key: 'pending',
    label: 'Need Attention',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      </svg>
    ),
    bg: 'bg-amber-50', icon_color: 'text-amber-600', value_color: 'text-amber-700',
  },
  {
    key: 'inTransit',
    label: 'In Transit',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414A1 1 0 0121 11.414V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
      </svg>
    ),
    bg: 'bg-blue-50', icon_color: 'text-blue-600', value_color: 'text-blue-700',
  },
  {
    key: 'received',
    label: 'Received',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8l1 12a2 2 0 002 2h8a2 2 0 002-2L19 8m-9 4v4m4-4v4" />
      </svg>
    ),
    bg: 'bg-violet-50', icon_color: 'text-violet-600', value_color: 'text-violet-700',
  },
  {
    key: 'refunded',
    label: 'Refunded',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    bg: 'bg-emerald-50', icon_color: 'text-emerald-600', value_color: 'text-emerald-700',
  },
  {
    key: 'totalAmount',
    label: 'Total Refunded',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    bg: 'bg-slate-50', icon_color: 'text-slate-600', value_color: 'text-slate-800',
  },
];

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

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function Dashboard({ onNavigate }) {
  const { config } = useMerchant();
  const returns = config.returns;

  const stats = {
    total: returns.length,
    pending: returns.filter(r => r.status === 'submitted' || r.status === 'awaiting_items').length,
    inTransit: returns.filter(r => r.status === 'in_transit').length,
    received: returns.filter(r => r.status === 'received').length,
    refunded: returns.filter(r => r.status === 'refunded').length,
    totalAmount: returns.filter(r => r.status === 'refunded').reduce((s, r) => s + r.refundAmount, 0),
  };

  const recent = [...returns]
    .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt))
    .slice(0, 6);

  const needsAttention = returns.filter(r => r.status === 'submitted' || r.status === 'awaiting_items')
    .sort((a, b) => new Date(a.submittedAt) - new Date(b.submittedAt));

  return (
    <div className="flex-1 min-h-screen bg-slate-50">
      {/* Page header */}
      <div className="bg-white border-b border-slate-200 px-6 py-5">
        <h1 className="text-xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
      </div>

      <div className="p-6 space-y-6 max-w-6xl">

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {STAT_CARDS.map(card => {
            const raw = stats[card.key];
            const value = card.key === 'totalAmount' ? `$${raw.toFixed(2)}` : raw;
            return (
              <div key={card.key} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow">
                <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl mb-3 ${card.bg}`}>
                  <span className={card.icon_color}>{card.icon}</span>
                </div>
                <p className={`text-2xl font-bold tabular-nums ${card.value_color}`}>{value}</p>
                <p className="text-sm text-slate-500 mt-1 font-medium">{card.label}</p>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

          {/* Recent returns — wider column */}
          <div className="lg:col-span-3 bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h2 className="font-semibold text-slate-900">Recent Returns</h2>
              <button
                onClick={() => onNavigate('returns')}
                className="text-sm text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
              >
                View all
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
            <div className="divide-y divide-slate-100">
              {recent.map(r => {
                const s = STATUS_CONFIG[r.status] || STATUS_CONFIG.submitted;
                return (
                  <div key={r.rma} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition-colors cursor-pointer"
                    onClick={() => onNavigate('returns')}>
                    <Avatar name={r.customer.name} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-semibold text-slate-800 truncate">{r.customer.name}</p>
                        <span className="text-slate-300 text-xs">·</span>
                        <span className="text-xs font-mono text-slate-500">{r.orderNumber}</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">{formatDate(r.submittedAt)} · {r.items.length} item{r.items.length !== 1 ? 's' : ''}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${s.color}`}>{s.label}</span>
                      <span className="text-sm font-bold text-slate-700">${r.refundAmount.toFixed(2)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Needs attention — narrow column */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100">
              <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <h2 className="font-semibold text-slate-900">Needs Attention</h2>
              {needsAttention.length > 0 && (
                <span className="ml-auto text-xs font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                  {needsAttention.length}
                </span>
              )}
            </div>
            {needsAttention.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-5 text-center">
                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center mb-3">
                  <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-sm font-semibold text-slate-700">All caught up!</p>
                <p className="text-xs text-slate-400 mt-1">No returns need attention.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {needsAttention.map(r => (
                  <div key={r.rma}
                    onClick={() => onNavigate('returns')}
                    className="flex items-start gap-3 px-5 py-3.5 hover:bg-amber-50/50 transition-colors cursor-pointer">
                    <div className="w-2 h-2 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{r.customer.name}</p>
                      <p className="text-xs font-mono text-slate-500">{r.rma}</p>
                      <p className="text-xs text-amber-600 font-medium mt-0.5">
                        {r.status === 'submitted' ? 'Awaiting approval' : 'Waiting for shipment'}
                      </p>
                    </div>
                    <p className="text-xs text-slate-400 shrink-0 mt-0.5">{formatDate(r.submittedAt)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
