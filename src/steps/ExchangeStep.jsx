import { useState, useEffect } from 'react';
import { useMerchant } from '../merchant/MerchantContext';
import { fetchProductVariants } from '../utils/returnsApi';

function VariantPicker({ item, primaryColor, onSelect, selectedVariantId }) {
  const { shop } = useMerchant();
  const [loading, setLoading] = useState(false);
  const [variants, setVariants] = useState([]);
  const [options, setOptions] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!item.productId || !shop) return;
    setLoading(true);
    fetchProductVariants(shop, item.productId)
      .then(data => {
        setVariants(data.variants || []);
        setOptions(data.options || []);
      })
      .catch(() => setError('Could not load product variants.'))
      .finally(() => setLoading(false));
  }, [item.productId, shop]);

  if (!item.productId) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
        <p className="text-sm text-gray-500">This item doesn't support variant selection.</p>
        <input
          type="text"
          placeholder="Describe what you'd like instead (e.g. Size M in Blue)"
          className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          onChange={e => onSelect({ note: e.target.value })}
        />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex items-center gap-2">
        <svg className="animate-spin w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
        <span className="text-sm text-gray-500">Loading variants…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-4">
        <p className="text-sm text-red-600">{error}</p>
        <input
          type="text"
          placeholder="Describe what you'd like instead (e.g. Size M in Blue)"
          className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          onChange={e => onSelect({ note: e.target.value })}
        />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {variants.map(v => {
        const isSelected = selectedVariantId === v.id;
        const isOutOfStock = !v.available;
        return (
          <button
            key={v.id}
            type="button"
            onClick={() => !isOutOfStock && onSelect({ id: v.id, title: v.title, sku: v.sku, price: parseFloat(v.price), variantId: String(v.id) })}
            disabled={isOutOfStock}
            className={`w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all ${
              isSelected
                ? 'border-indigo-500 bg-indigo-50'
                : isOutOfStock
                ? 'border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            {v.image && (
              <img src={v.image} alt={v.title} className="w-10 h-10 rounded-lg object-cover shrink-0 bg-gray-100" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900">{v.title}</p>
              {v.sku && <p className="text-xs text-gray-400">SKU: {v.sku}</p>}
            </div>
            <div className="shrink-0 text-right">
              {isOutOfStock ? (
                <span className="text-xs font-medium text-red-500 bg-red-50 px-2 py-0.5 rounded-full">Out of stock</span>
              ) : isSelected ? (
                <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: primaryColor }}>
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              ) : (
                <div className="w-5 h-5 rounded-full border-2 border-gray-300" />
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}

export default function ExchangeStep({ returnItems, primaryColor, onNext, onBack }) {
  const [selections, setSelections] = useState({});
  const [note, setNote] = useState('');

  const exchangeableItems = returnItems.filter(item =>
    item.returnReason === 'wrong_size' || item.returnReason === 'ordered_multiple'
  );
  const allSelected = exchangeableItems.every(item => selections[item.id]);

  function handleNext() {
    const firstItem = exchangeableItems[0];
    const selection = firstItem ? selections[firstItem.id] : null;
    onNext({
      method: 'exchange',
      exchangeVariant: selection && selection.variantId ? selection : null,
      exchangeNote: selection?.note || note || null,
    });
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10" style={{ backgroundColor: '#f9fafb' }}>
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">

        {/* Header */}
        <div className="flex items-center px-5 py-4 border-b border-gray-100">
          <button onClick={onBack} className="text-gray-400 hover:text-gray-700 mr-4">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h2 className="text-lg font-bold text-gray-900 flex-1 text-center">Choose Exchange Item</h2>
          <div className="w-9" />
        </div>

        <div className="p-5 space-y-5 max-h-[70vh] overflow-y-auto">
          <p className="text-sm text-gray-500">
            Select the variant you'd like to receive as an exchange. Out-of-stock options are not available.
          </p>

          {exchangeableItems.map(item => (
            <div key={item.id}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-gray-100 overflow-hidden shrink-0">
                  {item.image
                    ? <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center">
                        <svg className="w-5 h-5 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                  }
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{item.name}</p>
                  {item.variant && <p className="text-xs text-gray-400">Currently: {item.variant}</p>}
                </div>
              </div>
              <VariantPicker
                item={item}
                primaryColor={primaryColor}
                selectedVariantId={selections[item.id]?.id}
                onSelect={v => setSelections(prev => ({ ...prev, [item.id]: v }))}
              />
            </div>
          ))}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Additional notes <span className="text-gray-400 font-normal">(optional)</span></label>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Any additional details about your exchange request..."
              rows={2}
              className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>
        </div>

        <div className="px-5 py-4 border-t border-gray-100">
          <button
            onClick={handleNext}
            disabled={!allSelected}
            className="w-full py-3.5 rounded-xl text-sm font-semibold text-white transition-opacity disabled:opacity-40"
            style={{ backgroundColor: allSelected ? primaryColor : '#9ca3af' }}
          >
            {allSelected ? 'Confirm Exchange' : 'Select a variant to continue'}
          </button>
        </div>
      </div>
    </div>
  );
}
