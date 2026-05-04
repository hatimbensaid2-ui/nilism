import { RETURN_METHODS } from '../data/mockOrders';

function generateRMA() {
  return 'RMA-' + Math.random().toString(36).slice(2, 8).toUpperCase();
}

export default function Confirmation({ order, returnItems, methodId, onTrackReturn, onStartNew }) {
  const method = RETURN_METHODS.find(m => m.id === methodId);
  const rma = generateRMA();

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      {/* Success icon */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
          <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Return Submitted!</h2>
        <p className="text-gray-500 text-sm mt-2">
          Your return request for order <span className="font-semibold text-gray-700">{order.orderNumber}</span> has been received.
        </p>
      </div>

      <div className="space-y-4">
        {/* RMA number */}
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 text-center">
          <p className="text-sm text-indigo-600 font-medium mb-1">Return Authorization Number</p>
          <p className="text-2xl font-bold text-indigo-700 font-mono tracking-widest">{rma}</p>
          <p className="text-xs text-indigo-500 mt-1">Save this for your records</p>
        </div>

        {/* Next steps */}
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-sm font-semibold text-gray-700 mb-3">Next Steps</p>
          {methodId === 'prepaid_label' && (
            <div className="space-y-3">
              <Step num={1} text="Check your email for a prepaid return label." />
              <Step num={2} text="Pack your items securely in a box." />
              <Step num={3} text="Affix the label and drop off at any carrier location." />
              <Step num={4} text="Your refund will be processed once we receive the items." />
            </div>
          )}
          {methodId === 'in_store' && (
            <div className="space-y-3">
              <Step num={1} text="Bring your items and order confirmation to any of our store locations." />
              <Step num={2} text="Show your RMA number at the returns desk." />
              <Step num={3} text="Your refund will be processed instantly." />
            </div>
          )}
          {methodId === 'home_pickup' && (
            <div className="space-y-3">
              <Step num={1} text="Check your email for pickup scheduling details." />
              <Step num={2} text="Pack your items and leave them at your door on the pickup day." />
              <Step num={3} text="Your refund will be processed once we receive the items." />
            </div>
          )}
        </div>

        {/* Items being returned */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
            <p className="text-sm font-semibold text-gray-700">Items Being Returned</p>
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
                <span className="text-sm font-semibold text-gray-700">${(item.price * item.quantity).toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Email note */}
        <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl p-4">
          <svg className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <p className="text-sm text-blue-700">
            A confirmation email with all return details has been sent to <span className="font-semibold">{order.email}</span>.
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mt-8">
        <button
          onClick={onTrackReturn}
          className="flex-1 border border-indigo-600 text-indigo-600 hover:bg-indigo-50 font-semibold py-2.5 rounded-lg text-sm transition-colors"
        >
          Track My Return
        </button>
        <button
          onClick={onStartNew}
          className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors"
        >
          Start Another Return
        </button>
      </div>
    </div>
  );
}

function Step({ num, text }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
        {num}
      </div>
      <p className="text-sm text-gray-600">{text}</p>
    </div>
  );
}
