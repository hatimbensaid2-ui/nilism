import { useState } from 'react';

export default function ItemSelection({ order, onNext, onBack }) {
  const returnableItems = order.items.filter(i => i.returnable);
  const nonReturnableItems = order.items.filter(i => !i.returnable);

  const [selected, setSelected] = useState({});

  function toggle(itemId) {
    setSelected(prev => ({ ...prev, [itemId]: !prev[itemId] }));
  }

  const selectedIds = Object.keys(selected).filter(id => selected[id]);

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900">Select Items to Return</h2>
        <p className="text-sm text-gray-500 mt-1">Order {order.orderNumber} · Placed {order.date}</p>
      </div>

      <div className="space-y-3">
        {returnableItems.map(item => {
          const isSelected = !!selected[item.id];
          return (
            <button
              key={item.id}
              onClick={() => toggle(item.id)}
              className={`w-full text-left bg-white border-2 rounded-xl p-4 flex items-start gap-4 transition-all duration-200 ${
                isSelected
                  ? 'border-indigo-500 shadow-sm ring-1 ring-indigo-100'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                isSelected ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300'
              }`}>
                {isSelected && (
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>

              <img
                src={item.image}
                alt={item.name}
                className="w-16 h-16 rounded-lg object-cover bg-gray-100 shrink-0"
                onError={e => { e.target.style.display = 'none'; }}
              />

              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 text-sm leading-tight">{item.name}</p>
                <p className="text-xs text-gray-500 mt-0.5">{item.variant}</p>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-sm font-semibold text-gray-900">${item.price.toFixed(2)}</span>
                  <span className="text-xs text-gray-400">Qty: {item.quantity}</span>
                </div>
              </div>
            </button>
          );
        })}

        {nonReturnableItems.length > 0 && (
          <div className="mt-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Not Eligible for Return</p>
            {nonReturnableItems.map(item => (
              <div
                key={item.id}
                className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex items-start gap-4 opacity-60"
              >
                <div className="w-5 h-5 mt-0.5 shrink-0" />
                <img
                  src={item.image}
                  alt={item.name}
                  className="w-16 h-16 rounded-lg object-cover bg-gray-100 shrink-0 grayscale"
                  onError={e => { e.target.style.display = 'none'; }}
                />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-700 text-sm leading-tight">{item.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{item.variant}</p>
                  <span className="inline-block mt-2 text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">
                    {item.nonReturnableReason}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-3 mt-8">
        <button
          onClick={onBack}
          className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
        >
          Back
        </button>
        <button
          onClick={() => onNext(selectedIds)}
          disabled={selectedIds.length === 0}
          className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors"
        >
          Continue with {selectedIds.length} item{selectedIds.length !== 1 ? 's' : ''}
        </button>
      </div>
    </div>
  );
}
