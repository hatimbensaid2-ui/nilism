import { useMerchant } from '../MerchantContext';

const STATUS_CONFIG = {
  submitted:     { label: 'Submitted',      color: 'bg-gray-100 text-gray-700' },
  awaiting_items:{ label: 'Awaiting Items', color: 'bg-yellow-100 text-yellow-700' },
  in_transit:    { label: 'In Transit',     color: 'bg-blue-100 text-blue-700' },
  received:      { label: 'Received',       color: 'bg-purple-100 text-purple-700' },
  refunded:      { label: 'Refunded',       color: 'bg-green-100 text-green-700' },
  rejected:      { label: 'Rejected',       color: 'bg-red-100 text-red-700' },
};

export default function Dashboard({ onNavigate }) {
  const { config } = useMerchant();
  const returns = config.returns;

  const stats = {
    total: returns.length,
    submitted: returns.filter(r => r.status === 'submitted').length,
    awaiting: returns.filter(r => r.status === 'awaiting_items').length,
    inTransit: returns.filter(r => r.status === 'in_transit').length,
    received: returns.filter(r => r.status === 'received').length,
    refunded: returns.filter(r => r.status === 'refunded').length,
  };

  const recent = [...returns].sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt)).slice(0, 5);
  const totalRefunds = returns.filter(r => r.status === 'refunded').reduce((s, r) => s + r.refundAmount, 0);

  return (
    <div className="p-6 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Overview of your return portal activity.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <StatCard label="Total Returns" value={stats.total} color="indigo" />
        <StatCard label="Awaiting Items" value={stats.awaiting + stats.submitted} color="yellow" />
        <StatCard label="In Transit" value={stats.inTransit} color="blue" />
        <StatCard label="Received" value={stats.received} color="purple" />
        <StatCard label="Refunded" value={stats.refunded} color="green" />
        <StatCard label="Total Refunded" value={`$${totalRefunds.toFixed(2)}`} color="gray" />
      </div>

      {/* Recent returns */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Recent Returns</h2>
          <button
            onClick={() => onNavigate('returns')}
            className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
          >
            View all
          </button>
        </div>
        <div className="divide-y divide-gray-100">
          {recent.map(r => {
            const s = STATUS_CONFIG[r.status] || STATUS_CONFIG.submitted;
            return (
              <div key={r.rma} className="flex items-center gap-4 px-5 py-3.5">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-semibold text-gray-900">{r.rma}</span>
                    <span className="text-gray-400 text-xs">·</span>
                    <span className="text-sm text-gray-600">{r.orderNumber}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{r.customer.name} · {r.items.length} item{r.items.length !== 1 ? 's' : ''}</p>
                </div>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full shrink-0 ${s.color}`}>{s.label}</span>
                <span className="text-sm font-semibold text-gray-700 shrink-0">${r.refundAmount.toFixed(2)}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, color }) {
  const colors = {
    indigo: 'bg-indigo-50 text-indigo-700',
    yellow: 'bg-yellow-50 text-yellow-700',
    blue: 'bg-blue-50 text-blue-700',
    purple: 'bg-purple-50 text-purple-700',
    green: 'bg-green-50 text-green-700',
    gray: 'bg-gray-50 text-gray-700',
  };
  return (
    <div className={`rounded-xl p-4 ${colors[color]}`}>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-sm font-medium mt-1 opacity-80">{label}</p>
    </div>
  );
}
