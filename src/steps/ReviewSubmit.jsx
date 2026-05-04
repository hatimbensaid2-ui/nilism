import { useState } from 'react';
import { RETURN_REASONS, RETURN_METHODS } from '../data/mockOrders';

export default function ReviewSubmit({ order, returnItems, methodId, onSubmit, onBack }) {
  const [submitting, setSubmitting] = useState(false);
  const method = RETURN_METHODS.find(m => m.id === methodId);
  const subtotal = returnItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const fee = method?.fee || 0;
  const refundTotal = subtotal - fee;

  function getReasonLabel(reasonId) {
    return RETURN_REASONS.find(r => r.id === reasonId)?.label || reasonId;
  }

  function handleSubmit() {
    setSubmitting(true);
    setTimeout(() => {
      onSubmit();
    }, 1200);
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900">Review Your Return</h2>
        <p className="text-sm text-gray-500 mt-1">Please confirm the details below before submitting.</p>
      </div>

      <div className="space-y-4">
        {/* Items */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
            <p className="text-sm font-semibold text-gray-700">Returning {returnItems.length} item{returnItems.length !== 1 ? 's' : ''}</p>
          </div>
          <div className="divide-y divide-gray-100">
            {returnItems.map(item => (
              <div key={item.id} className="flex items-start gap-3 p-4">
                <img
                  src={item.image}
                  alt={item.name}
                  className="w-14 h-14 rounded-lg object-cover bg-gray-100 shrink-0"
                  onError={e => { e.target.style.display = 'none'; }}
                />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm">{item.name}</p>
                  <p className="text-xs text-gray-500">{item.variant}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Reason: <span className="text-gray-700">{getReasonLabel(item.returnReason)}</span>
                  </p>
                </div>
                <span className="text-sm font-semibold text-gray-900 shrink-0">${(item.price * item.quantity).toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Return method */}
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-sm font-semibold text-gray-700 mb-2">Return Method</p>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-900 font-medium">{method?.label}</p>
              <p className="text-xs text-gray-500">{method?.eta}</p>
            </div>
            <span className={`text-sm font-semibold ${fee === 0 ? 'text-green-600' : 'text-gray-700'}`}>
              {fee === 0 ? 'Free' : `-$${fee.toFixed(2)}`}
            </span>
          </div>
        </div>

        {/* Refund summary */}
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-sm font-semibold text-gray-700 mb-3">Refund Summary</p>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Item subtotal</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            {fee > 0 && (
              <div className="flex justify-between text-gray-600">
                <span>Return fee</span>
                <span>-${fee.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-gray-900 pt-2 border-t border-gray-100">
              <span>Estimated refund</span>
              <span className="text-green-600">${refundTotal.toFixed(2)}</span>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-3">
            Refunds are processed to your original payment method within 5–10 business days.
          </p>
        </div>

        {/* Ship to */}
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-sm font-semibold text-gray-700 mb-1">Return From</p>
          <p className="text-sm text-gray-600">{order.customer.name}</p>
          <p className="text-sm text-gray-500">{order.customer.address}</p>
        </div>
      </div>

      <div className="flex gap-3 mt-8">
        <button
          onClick={onBack}
          disabled={submitting}
          className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          Back
        </button>
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
        >
          {submitting ? (
            <>
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Submitting...
            </>
          ) : (
            'Submit Return'
          )}
        </button>
      </div>
    </div>
  );
}
