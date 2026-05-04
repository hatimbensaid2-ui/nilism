import { useState } from 'react';
import { RETURN_METHODS } from '../data/mockOrders';

function LabelIcon() {
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
        d="M7 7h.01M7 3h5l8.5 8.5a2 2 0 010 2.83l-4.17 4.17a2 2 0 01-2.83 0L5 10V3h2z" />
    </svg>
  );
}
function StoreIcon() {
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
        d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 21V12h6v9" />
    </svg>
  );
}
function TruckIcon() {
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
        d="M1 3h15v13H1zM16 8h4l3 3v5h-7V8z" />
      <circle cx="5.5" cy="18.5" r="2.5" stroke="currentColor" strokeWidth={1.8} fill="none" />
      <circle cx="18.5" cy="18.5" r="2.5" stroke="currentColor" strokeWidth={1.8} fill="none" />
    </svg>
  );
}

const ICONS = { label: LabelIcon, store: StoreIcon, truck: TruckIcon };

export default function ReturnMethod({ onNext, onBack }) {
  const [selected, setSelected] = useState(null);

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900">Choose Return Method</h2>
        <p className="text-sm text-gray-500 mt-1">Select how you'd like to send back your items.</p>
      </div>

      <div className="space-y-3">
        {RETURN_METHODS.map(method => {
          const Icon = ICONS[method.icon];
          const isSelected = selected === method.id;
          return (
            <button
              key={method.id}
              onClick={() => setSelected(method.id)}
              className={`w-full text-left bg-white border-2 rounded-xl p-5 flex items-start gap-4 transition-all duration-200 ${
                isSelected
                  ? 'border-indigo-500 shadow-sm ring-1 ring-indigo-100'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className={`p-2.5 rounded-lg shrink-0 ${isSelected ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600'}`}>
                <Icon />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-gray-900 text-sm">{method.label}</p>
                  <span className={`text-sm font-semibold shrink-0 ${method.fee === 0 ? 'text-green-600' : 'text-gray-700'}`}>
                    {method.fee === 0 ? 'Free' : `$${method.fee.toFixed(2)}`}
                  </span>
                </div>
                <p className="text-sm text-gray-500 mt-1">{method.description}</p>
                <div className="flex items-center gap-1.5 mt-2">
                  <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-xs text-gray-500">{method.eta}</span>
                </div>
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
