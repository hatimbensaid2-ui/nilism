import { useState } from 'react';
import { useMerchant } from '../merchant/MerchantContext';
import { DEFAULT_RETURN_REASONS } from '../data/mockOrders';

function CheckCircle({ color }) {
  return (
    <div
      className="w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors"
      style={{ borderColor: color, backgroundColor: color }}
    >
      <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
      </svg>
    </div>
  );
}

function EmptyCircle() {
  return <div className="w-6 h-6 rounded-full border-2 border-gray-300 shrink-0" />;
}

export default function RefundMethodStep({
  returnItems,
  primaryColor,
  offerStoreCredit = true,
  storeCreditBonusPct = 0,
  offerExchange = true,
  onNext,
  onBack,
}) {
  const { config } = useMerchant();
  const reasons = config.returnReasons || DEFAULT_RETURN_REASONS;
  const [selected, setSelected] = useState(null);

  const subtotal = returnItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const storeCreditAmount = subtotal * (1 + storeCreditBonusPct / 100);
  const bonusAmount = storeCreditAmount - subtotal;

  // Show exchange only if merchant offers it AND at least one item has an exchange-eligible reason
  const hasExchangeableItem = returnItems.some(item => {
    const reason = reasons.find(r => r.id === item.returnReason);
    if (reason) return reason.allowExchange;
    return item.returnReason === 'wrong_size' || item.returnReason === 'ordered_multiple';
  });
  const showExchange = offerExchange && hasExchangeableItem;

  function handleContinue() {
    if (!selected) return;
    // For exchange: pass method only — ExchangeStep handles variant selection
    onNext({ method: selected });
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10 bg-gray-50">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">

        <div className="flex items-center px-5 py-4 border-b border-gray-100">
          <button onClick={onBack} className="text-gray-400 hover:text-gray-700 mr-4">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h2 className="text-lg font-bold text-gray-900 flex-1 text-center">Choose a refund method</h2>
          <div className="w-9" />
        </div>

        <div className="p-5 space-y-3">

          {offerStoreCredit && (
            <button
              onClick={() => setSelected('store_credit')}
              className="w-full text-left rounded-xl p-5 transition-all"
              style={selected === 'store_credit'
                ? { backgroundColor: '#111827', outline: `2px solid ${primaryColor}`, outlineOffset: '0px' }
                : { backgroundColor: '#111827' }
              }
            >
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Store credit</p>
                  <p className="text-2xl font-bold text-white mt-1">${storeCreditAmount.toFixed(2)}</p>
                  {storeCreditBonusPct > 0 && (
                    <span className="inline-block mt-2 px-2 py-0.5 rounded-full text-xs font-semibold text-white"
                      style={{ backgroundColor: primaryColor }}
                    >
                      ${bonusAmount.toFixed(2)} bonus included
                    </span>
                  )}
                </div>
                {selected === 'store_credit'
                  ? <CheckCircle color={primaryColor} />
                  : <div className="w-6 h-6 rounded-full border-2 border-gray-600 shrink-0" />
                }
              </div>
            </button>
          )}

          <button
            onClick={() => setSelected('original')}
            className="w-full text-left bg-gray-50 rounded-xl p-5 border-2 transition-all"
            style={{ borderColor: selected === 'original' ? primaryColor : '#f3f4f6' }}
          >
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Refund amount</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">${subtotal.toFixed(2)}</p>
                <p className="text-xs text-gray-500 mt-1">To your original payment method</p>
              </div>
              {selected === 'original'
                ? <CheckCircle color={primaryColor} />
                : <EmptyCircle />
              }
            </div>
          </button>

          {showExchange && (
            <button
              onClick={() => setSelected('exchange')}
              className="w-full text-left bg-gray-50 rounded-xl p-5 border-2 transition-all"
              style={{ borderColor: selected === 'exchange' ? primaryColor : '#f3f4f6' }}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Exchange</p>
                  <p className="text-sm font-bold text-gray-900 mt-1">Exchange for a different size / color</p>
                  <p className="text-xs text-gray-400 mt-1">Choose your replacement variant on the next step</p>
                </div>
                {selected === 'exchange'
                  ? <CheckCircle color={primaryColor} />
                  : <EmptyCircle />
                }
              </div>
            </button>
          )}
        </div>

        <div className="px-5 pb-5">
          <button
            onClick={handleContinue}
            disabled={!selected}
            className="w-full py-3.5 rounded-xl text-sm font-semibold text-white transition-opacity disabled:opacity-40"
            style={{ backgroundColor: selected ? primaryColor : '#9ca3af' }}
          >
            {selected === 'exchange' ? 'Choose Variant →' : 'Continue'}
          </button>
        </div>
      </div>
    </div>
  );
}
