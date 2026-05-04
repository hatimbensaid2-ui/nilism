import { useState } from 'react';
import { DEFAULT_RETURN_REASONS } from '../data/mockOrders';
import { useMerchant } from '../merchant/MerchantContext';

export default function ReturnReason({ order, selectedItemIds, onNext, onBack }) {
  const { config } = useMerchant();
  const RETURN_REASONS = (config.returnReasons || DEFAULT_RETURN_REASONS).filter(r => r.enabled);
  const items = order.items.filter(i => selectedItemIds.includes(i.id));
  const [reasons, setReasons] = useState({});
  const [notes, setNotes] = useState({});

  function setReason(itemId, reasonId) {
    setReasons(prev => ({ ...prev, [itemId]: reasonId }));
  }

  function setNote(itemId, note) {
    setNotes(prev => ({ ...prev, [itemId]: note }));
  }

  const allSelected = items.every(i => reasons[i.id]);

  function handleNext() {
    const result = items.map(item => ({
      ...item,
      returnReason: reasons[item.id],
      returnNote: notes[item.id] || '',
    }));
    onNext(result);
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900">Reason for Return</h2>
        <p className="text-sm text-gray-500 mt-1">Please tell us why you're returning each item.</p>
      </div>

      <div className="space-y-5">
        {items.map(item => (
          <div key={item.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="flex items-center gap-3 p-4 border-b border-gray-100">
              <img
                src={item.image}
                alt={item.name}
                className="w-12 h-12 rounded-lg object-cover bg-gray-100"
                onError={e => { e.target.style.display = 'none'; }}
              />
              <div>
                <p className="font-semibold text-gray-900 text-sm">{item.name}</p>
                <p className="text-xs text-gray-500">{item.variant}</p>
              </div>
            </div>

            <div className="p-4 space-y-2">
              <p className="text-sm font-medium text-gray-700 mb-3">Select a reason *</p>
              <div className="grid grid-cols-1 gap-2">
                {RETURN_REASONS.map(reason => {
                  const isSelected = reasons[item.id] === reason.id;
                  return (
                    <label
                      key={reason.id}
                      className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg border cursor-pointer transition-all ${
                        isSelected
                          ? 'border-indigo-500 bg-indigo-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                        isSelected ? 'border-indigo-600' : 'border-gray-300'
                      }`}>
                        {isSelected && <div className="w-2 h-2 rounded-full bg-indigo-600" />}
                      </div>
                      <input
                        type="radio"
                        className="sr-only"
                        name={`reason-${item.id}`}
                        value={reason.id}
                        checked={isSelected}
                        onChange={() => setReason(item.id, reason.id)}
                      />
                      <span className="text-sm text-gray-700">{reason.label}</span>
                    </label>
                  );
                })}
              </div>

              {reasons[item.id] === 'other' && (
                <textarea
                  value={notes[item.id] || ''}
                  onChange={e => setNote(item.id, e.target.value)}
                  placeholder="Please describe the issue..."
                  rows={3}
                  className="mt-3 w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                />
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-3 mt-8">
        <button
          onClick={onBack}
          className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
        >
          Back
        </button>
        <button
          onClick={handleNext}
          disabled={!allSelected}
          className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
