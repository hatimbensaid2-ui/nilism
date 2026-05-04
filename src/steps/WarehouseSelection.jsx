import { useState } from 'react';
import { useMerchant } from '../merchant/MerchantContext';

export default function WarehouseSelection({ onNext, onBack }) {
  const { config } = useMerchant();
  const activeWarehouses = config.warehouses.filter(w => w.active);
  const [selected, setSelected] = useState(null);

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900">Choose a Return Warehouse</h2>
        <p className="text-sm text-gray-500 mt-1">
          Select the warehouse you'll ship your items to. You'll receive the full address after submitting.
        </p>
      </div>

      {activeWarehouses.length === 0 ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-yellow-800">
          No return warehouses are currently available. Please contact support.
        </div>
      ) : (
        <div className="space-y-3">
          {activeWarehouses.map(wh => {
            const isSelected = selected === wh.id;
            return (
              <button
                key={wh.id}
                onClick={() => setSelected(wh.id)}
                className={`w-full text-left bg-white border-2 rounded-xl p-5 flex items-start gap-4 transition-all duration-200 ${
                  isSelected
                    ? 'border-indigo-500 shadow-sm ring-1 ring-indigo-100'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className={`p-2.5 rounded-lg shrink-0 ${isSelected ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-500'}`}>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                      d="M3 3h18v4H3zM3 7v14h18V7M9 21V11h6v10" />
                  </svg>
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm">{wh.name}</p>
                  <p className="text-sm text-gray-500 mt-1">
                    {wh.address}, {wh.city}{wh.state ? `, ${wh.state}` : ''} {wh.zip}
                  </p>
                  <p className="text-sm text-gray-500">{wh.country}</p>
                  {wh.contact && (
                    <p className="text-xs text-gray-400 mt-1">Attn: {wh.contact}</p>
                  )}
                </div>

                <div className={`mt-1 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                  isSelected ? 'border-indigo-600' : 'border-gray-300'
                }`}>
                  {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-indigo-600" />}
                </div>
              </button>
            );
          })}
        </div>
      )}

      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
        <svg className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20A10 10 0 0012 2z" />
        </svg>
        <p className="text-sm text-blue-700">
          After submitting your return, ship the items using any carrier of your choice and then
          <strong> come back to upload your tracking number</strong> so we can process your refund faster.
        </p>
      </div>

      <div className="flex gap-3 mt-8">
        <button
          onClick={onBack}
          className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
        >
          Back
        </button>
        <button
          onClick={() => onNext(selected)}
          disabled={!selected}
          className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
