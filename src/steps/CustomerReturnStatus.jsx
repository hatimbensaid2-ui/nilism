const STATUS_CONFIG = {
  submitted:      { label: 'Submitted',       color: 'bg-slate-100 text-slate-700',    dot: 'bg-slate-400' },
  awaiting_items: { label: 'Awaiting Items',  color: 'bg-amber-100 text-amber-700',    dot: 'bg-amber-500' },
  in_transit:     { label: 'In Transit',      color: 'bg-blue-100 text-blue-700',      dot: 'bg-blue-500' },
  received:       { label: 'Received',        color: 'bg-violet-100 text-violet-700',  dot: 'bg-violet-500' },
  refunded:       { label: 'Refunded',        color: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
  rejected:       { label: 'Rejected',        color: 'bg-red-100 text-red-600',        dot: 'bg-red-400' },
};

const REFUND_METHOD_LABELS = {
  store_credit: 'Store Credit',
  original: 'Original Payment',
  exchange: 'Exchange',
};

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

export default function CustomerReturnStatus({ returnData, primaryColor, onUploadTracking, onStartNew }) {
  const s = STATUS_CONFIG[returnData.status] || STATUS_CONFIG.submitted;
  const canUploadTracking = returnData.status === 'awaiting_items' || returnData.status === 'submitted';

  return (
    <div className="min-h-screen flex flex-col items-center px-4 py-10 bg-gray-50">
      <div className="w-full max-w-md">

        {/* Status card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-4">
          <div className="px-6 py-5 border-b border-gray-100">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">Return Request</p>
                <p className="text-lg font-bold text-gray-900 font-mono">{returnData.rma}</p>
                {returnData.submittedAt && (
                  <p className="text-xs text-gray-400 mt-0.5">Submitted {formatDate(returnData.submittedAt)}</p>
                )}
              </div>
              <span className={`flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-full shrink-0 ${s.color}`}>
                <span className={`w-2 h-2 rounded-full ${s.dot}`} />
                {s.label}
              </span>
            </div>
          </div>

          {/* Items */}
          {returnData.items?.length > 0 && (
            <div className="divide-y divide-gray-50">
              {returnData.items.map((item, i) => (
                <div key={i} className="flex items-center gap-3 px-6 py-3">
                  <div className="w-10 h-10 rounded-lg bg-gray-100 overflow-hidden shrink-0 flex items-center justify-center">
                    {item.image
                      ? <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                      : <svg className="w-5 h-5 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                    {item.variant && <p className="text-xs text-gray-400">{item.variant}</p>}
                  </div>
                  <span className="text-xs text-gray-500 shrink-0">×{item.quantity}</span>
                </div>
              ))}
            </div>
          )}

          {/* Details */}
          <div className="px-6 py-4 border-t border-gray-50 space-y-2 bg-gray-50/50">
            {returnData.refundMethod && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Refund method</span>
                <span className="font-medium text-gray-800">{REFUND_METHOD_LABELS[returnData.refundMethod] || returnData.refundMethod}</span>
              </div>
            )}
            {returnData.tracking && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Tracking</span>
                <span className="font-mono font-medium text-gray-800">{returnData.tracking}</span>
              </div>
            )}
          </div>
        </div>

        {/* Status messages */}
        {returnData.status === 'submitted' && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4 text-sm text-amber-800">
            Your return request has been received and is being reviewed.
          </div>
        )}
        {returnData.status === 'awaiting_items' && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 mb-4 text-sm text-blue-800">
            Your return has been approved. Please ship your items and upload the tracking number below.
          </div>
        )}
        {returnData.status === 'in_transit' && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 mb-4 text-sm text-blue-800">
            Your return shipment is on its way. We'll process it once received.
          </div>
        )}
        {returnData.status === 'refunded' && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 mb-4 text-sm text-emerald-800">
            Your refund has been processed. It may take 3-5 business days to appear.
          </div>
        )}
        {returnData.status === 'rejected' && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4 text-sm text-red-800">
            Unfortunately your return request was rejected. Please contact support for more information.
          </div>
        )}

        {/* Actions */}
        <div className="space-y-2">
          {canUploadTracking && (
            <button
              onClick={onUploadTracking}
              className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-opacity"
              style={{ backgroundColor: primaryColor || '#4f46e5' }}
            >
              Upload Tracking Number
            </button>
          )}
          <button
            onClick={onStartNew}
            className="w-full py-3 rounded-xl text-sm font-medium text-gray-600 border border-gray-200 bg-white hover:bg-gray-50 transition-colors"
          >
            Return a Different Order
          </button>
        </div>
      </div>
    </div>
  );
}
