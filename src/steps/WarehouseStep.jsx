import { useState } from 'react';

export default function WarehouseStep({ warehouses, primaryColor, onNext, onBack }) {
  const [selected, setSelected] = useState(null);

  const selectedWarehouse = warehouses.find(w => w.id === selected) ?? null;

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10 bg-gray-50">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">

        <div className="flex items-center px-5 py-4 border-b border-gray-100">
          <button onClick={onBack} className="text-gray-400 hover:text-gray-700 mr-4">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h2 className="text-lg font-bold text-gray-900 flex-1 text-center">Choose a return address</h2>
          <div className="w-9" />
        </div>

        <div className="divide-y divide-gray-100 max-h-[60vh] overflow-y-auto">
          {warehouses.map(wh => {
            const isSelected = selected === wh.id;
            const addressLine = [
              wh.address,
              wh.city,
              [wh.state, wh.zip].filter(Boolean).join(' '),
              wh.country,
            ].filter(Boolean).join(', ');

            return (
              <button
                key={wh.id}
                onClick={() => setSelected(wh.id)}
                className="w-full flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors text-left"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900 text-sm leading-tight">{wh.name}</p>
                  <p className="text-sm text-gray-500 mt-0.5 truncate">{addressLine}</p>
                </div>

                <div
                  className="w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors"
                  style={isSelected
                    ? { borderColor: primaryColor, backgroundColor: primaryColor }
                    : { borderColor: '#d1d5db', backgroundColor: 'transparent' }
                  }
                >
                  {isSelected && (
                    <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        <div className="px-5 py-4 border-t border-gray-100">
          <button
            onClick={() => onNext(selectedWarehouse)}
            disabled={!selected}
            className="w-full py-3.5 rounded-xl text-sm font-semibold text-white transition-opacity disabled:opacity-40"
            style={{ backgroundColor: selected ? primaryColor : '#9ca3af' }}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
