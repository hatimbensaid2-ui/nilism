import { useMerchant } from '../MerchantContext';
import { STATUS_CONFIG } from './Returns';
import { DEFAULT_RETURN_REASONS } from '../../data/mockOrders';

const NEXT_STATUSES = {
  submitted:      ['awaiting_items', 'rejected'],
  awaiting_items: ['in_transit', 'rejected'],
  in_transit:     ['received', 'rejected'],
  received:       ['refunded', 'rejected'],
  refunded:       [],
  rejected:       [],
};

const STATUS_LABELS = {
  awaiting_items: 'Mark Awaiting Items',
  in_transit:     'Mark In Transit',
  received:       'Mark Received',
  refunded:       'Process Refund',
  rejected:       'Reject Return',
};

export default function ReturnDetail({ rma, onBack }) {
  const { config, updateReturn } = useMerchant();
  const ret = config.returns.find(r => r.rma === rma);

  if (!ret) {
    return (
      <div className="p-6">
        <button onClick={onBack} className="text-sm text-gray-500 hover:text-gray-700 mb-4 flex items-center gap-1.5">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
        <p className="text-gray-500">Return not found.</p>
      </div>
    );
  }

  const s = STATUS_CONFIG[ret.status] || STATUS_CONFIG.submitted;
  const wh = config.warehouses.find(w => w.id === ret.warehouseId);
  const nextStatuses = NEXT_STATUSES[ret.status] || [];

  function getReasonLabel(id) {
    return (config.returnReasons || DEFAULT_RETURN_REASONS).find(r => r.id === id)?.label || id;
  }

  return (
    <div className="p-6 max-w-3xl">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-5 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Returns
      </button>

      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-mono">{ret.rma}</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Order {ret.orderNumber} · {ret.customer.name} · {ret.customer.email}
          </p>
        </div>
        <span className={`text-sm font-semibold px-3 py-1.5 rounded-full ${s.color}`}>{s.label}</span>
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

        {/* Details */}
        <div className="space-y-3">
          {/* Warehouse */}
          {wh && (
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <p className="text-sm font-semibold text-gray-700 mb-2">Destination Warehouse</p>
              <p className="text-sm text-gray-900 font-medium">{wh.name}</p>
              <p className="text-sm text-gray-500">{wh.address}, {wh.city}{wh.state ? `, ${wh.state}` : ''}</p>
              <p className="text-sm text-gray-500">{wh.country}</p>
            </div>
          )}

          {/* Tracking */}
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-sm font-semibold text-gray-700 mb-2">Tracking</p>
            {ret.tracking ? (
              <div>
                <p className="text-xs text-gray-500 mb-0.5">Carrier: <span className="font-medium text-gray-700">{ret.carrier}</span></p>
                <p className="font-mono text-sm font-semibold text-gray-900 break-all">{ret.tracking}</p>
              </div>
            ) : (
              <p className="text-sm text-gray-400 italic">No tracking uploaded yet</p>
            )}
          </div>

          {/* Dates */}
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-sm font-semibold text-gray-700 mb-2">Timeline</p>
            <p className="text-xs text-gray-500">Submitted: <span className="text-gray-700">{new Date(ret.submittedAt).toLocaleDateString()}</span></p>
            <p className="text-xs text-gray-500 mt-1">Last updated: <span className="text-gray-700">{new Date(ret.updatedAt).toLocaleDateString()}</span></p>
          </div>
        </div>
      </div>

      {/* Status actions */}
      {nextStatuses.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-sm font-semibold text-gray-700 mb-3">Update Status</p>
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
