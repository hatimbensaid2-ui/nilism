import { useState } from 'react';
import { useMerchant } from '../merchant/MerchantContext';

export default function ReviewSubmit({ order, returnItems, refundMethod, selectedWarehouse, primaryColor, onSubmit, onBack }) {
  const { config } = useMerchant();
  const [submitting, setSubmitting] = useState(false);
  const primary = primaryColor || config.store.primaryColor || '#4f46e5';
  const subtotal = returnItems.reduce((sum, i) => sum + i.price * i.quantity, 0);

  function handleSubmit() {
    setSubmitting(true);
    setTimeout(() => onSubmit(), 1000);
  }

  return (
    <div className="min-h-screen px-4 py-10" style={{ backgroundColor: config.store?.bgColor || '#f5f5f5' }}>
      <div className="max-w-3xl mx-auto">

        {/* Header */}
        <div className="flex items-center mb-6">
          <button onClick={onBack} className="text-gray-500 hover:text-gray-700 mr-4 p-1">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Review your return</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">

          {/* Left column */}
          <div className="md:col-span-3 space-y-4">

            {/* Items */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h2 className="font-bold text-gray-900">What you're returning</h2>
              </div>
              <div className="divide-y divide-gray-100">
                {returnItems.map(item => (
                  <div key={item.id} className="flex items-center gap-4 px-5 py-4">
                    <div className="w-14 h-14 rounded-lg bg-gray-100 overflow-hidden shrink-0">
                      {item.image
                        ? <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                        : null
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-sm leading-tight">{item.name}</p>
                      {item.returnReasonLabel && (
                        <p className="text-xs text-gray-400 mt-0.5">{item.returnReasonLabel}</p>
                      )}
                      {!isExchange && (
                        <p className="text-sm font-medium text-gray-700 mt-1">${item.price.toFixed(2)}</p>
                      )}
                    </div>
                    <span className="text-sm text-gray-500 shrink-0">x {item.quantity}</span>
                  </div>
                ))}
              </div>
              {/* Return method / warehouse */}
              <div className="px-5 py-4 border-t border-gray-100 bg-gray-50">
                <p className="text-sm font-semibold text-gray-800 mb-1">Return method</p>
                {selectedWarehouse ? (
                  <>
                    <p className="text-sm text-gray-600">Ship to: <span className="font-medium">{selectedWarehouse.name}</span></p>
                    <p className="text-xs text-gray-400 mt-0.5">{[selectedWarehouse.address, selectedWarehouse.city, selectedWarehouse.state, selectedWarehouse.zip].filter(Boolean).join(', ')}</p>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-gray-600">Ship with any carrier of your choice</p>
                    <p className="text-xs text-gray-400 mt-0.5">You will get shipping instructions after the request is approved.</p>
                  </>
                )}
              </div>
            </div>

            {/* Contact details */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h2 className="font-bold text-gray-900 mb-3">Contact details</h2>
              <div className="space-y-2.5">
                <ContactRow icon="person" text={order.customer.name} />
                <ContactRow icon="email" text={order.email} />
                {order.customer.address && (
                  <ContactRow icon="location" text={order.customer.address} />
                )}
              </div>
            </div>
          </div>

          {/* Right column — summary */}
          <div className="md:col-span-2 space-y-4">
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h2 className="font-bold text-gray-900 mb-4">Summary</h2>

              <div className="space-y-3 text-sm">
                {returnItems.map(item => (
                  <div key={item.id} className="flex justify-between text-gray-700">
                    <span>Return item ({item.quantity})</span>
                    <span>−${(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="border-t border-gray-100 mt-4 pt-4 flex justify-between">
                <span className="font-bold text-gray-900">Total refund</span>
                <span className="font-bold text-gray-900">${subtotal.toFixed(2)} USD</span>
              </div>
              <p className="text-xs text-gray-400 mt-1 text-right">
                {refundMethod?.method === 'store_credit' ? 'Refund as store credit' : refundMethod?.method === 'exchange' ? 'Exchange request' : 'Refund to original payment method'}
              </p>
              {refundMethod?.method === 'exchange' && refundMethod.exchangeNote && (
                <p className="text-xs text-gray-500 mt-1 bg-gray-50 rounded-lg px-3 py-2">Exchange for: {refundMethod.exchangeNote}</p>
              )}

              <p className="text-[11px] text-gray-400 mt-4">
                *Based on our store policy and any applicable discounts, taxes, and shipping costs.
              </p>

              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="w-full mt-5 py-3.5 rounded-xl text-sm font-semibold text-white transition-opacity disabled:opacity-60"
                style={{ backgroundColor: primary }}
              >
                {submitting ? 'Submitting…' : 'Submit'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ContactRow({ icon, text }) {
  const icons = {
    person: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />,
    email: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />,
    location: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />,
  };
  return (
    <div className="flex items-start gap-3">
      <svg className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        {icons[icon]}
      </svg>
      <span className="text-sm text-gray-700">{text}</span>
    </div>
  );
}
