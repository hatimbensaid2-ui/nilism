const STATUSES = [
  { id: 'submitted', label: 'Return Submitted', description: 'Your return request has been received.' },
  { id: 'approved', label: 'Return Approved', description: "We've approved your return and sent shipping instructions." },
  { id: 'in_transit', label: 'In Transit', description: "Your items are on the way to our warehouse." },
  { id: 'received', label: 'Items Received', description: "We've received your return at our warehouse." },
  { id: 'refunded', label: 'Refund Processed', description: 'Your refund has been issued to your original payment method.' },
];

export default function ReturnStatus({ order, returnItems, onBack }) {
  const currentStatusIndex = 1;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-6">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
        <h2 className="text-xl font-bold text-gray-900">Return Status</h2>
        <p className="text-sm text-gray-500 mt-1">Order {order.orderNumber}</p>
      </div>

      {/* Status timeline */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-4">
        <div className="relative">
          <div className="absolute left-4 top-5 bottom-5 w-0.5 bg-gray-200" />
          <div
            className="absolute left-4 top-5 w-0.5 bg-indigo-500 transition-all duration-700"
            style={{ height: `${(currentStatusIndex / (STATUSES.length - 1)) * 100}%` }}
          />

          <div className="space-y-6">
            {STATUSES.map((status, idx) => {
              const done = idx <= currentStatusIndex;
              const active = idx === currentStatusIndex;

              return (
                <div key={status.id} className="flex items-start gap-4 relative">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 z-10 shrink-0 transition-colors ${
                    done
                      ? 'bg-indigo-600 border-indigo-600'
                      : 'bg-white border-gray-300'
                  }`}>
                    {done ? (
                      <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <div className="w-2 h-2 rounded-full bg-gray-300" />
                    )}
                  </div>
                  <div className={`pt-1 ${done ? '' : 'opacity-50'}`}>
                    <div className="flex items-center gap-2">
                      <p className={`text-sm font-semibold ${active ? 'text-indigo-700' : 'text-gray-900'}`}>
                        {status.label}
                      </p>
                      {active && (
                        <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium">
                          Current
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{status.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Items */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
          <p className="text-sm font-semibold text-gray-700">Returned Items</p>
        </div>
        <div className="divide-y divide-gray-100">
          {returnItems.map(item => (
            <div key={item.id} className="flex items-center gap-3 p-4">
              <img
                src={item.image}
                alt={item.name}
                className="w-12 h-12 rounded-lg object-cover bg-gray-100 shrink-0"
                onError={e => { e.target.style.display = 'none'; }}
              />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 text-sm truncate">{item.name}</p>
                <p className="text-xs text-gray-500">{item.variant}</p>
              </div>
              <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium">Pending</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 text-center">
        <p className="text-xs text-gray-400">
          Questions? Contact us at <span className="text-gray-600 font-medium">support@store.com</span>
        </p>
      </div>
    </div>
  );
}
