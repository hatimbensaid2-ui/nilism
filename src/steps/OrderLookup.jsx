import { useState } from 'react';
import { useMerchant } from '../merchant/MerchantContext';
import { lookupOrder } from '../utils/returnsApi';

export default function OrderLookup({ onOrderFound, onUploadTracking }) {
  const { config, shop } = useMerchant();
  const store = config.store;
  const primary = store.primaryColor || '#4f46e5';
  const logo = store.logoData || store.logoUrl;

  const [tab, setTab] = useState('start');
  const [orderNumber, setOrderNumber] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!orderNumber.trim() || !email.trim()) { setError('Please fill in all fields.'); return; }
    setLoading(true);
    try {
      if (!shop) { setError('Store not configured. Please use the link provided by the store.'); setLoading(false); return; }
      const result = await lookupOrder(shop, orderNumber.trim(), email.trim());
      if (!result?.order) throw new Error('No order in response');
      onOrderFound(result.order);
    } catch {
      setError("We couldn't find an order matching those details. Please check and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center px-4 py-10" style={{ backgroundColor: store.bgColor || '#f5f5f5' }}>

      {/* Back to shop */}
      {store.shopUrl && (
        <div className="w-full max-w-md mb-2 self-start">
          <a
            href={store.shopUrl}
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 bg-white/70 px-3 py-1.5 rounded-full border border-gray-200 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to shop
          </a>
        </div>
      )}

      {/* Logo */}
      <div className="mb-8 mt-4 text-center">
        {logo ? (
          <img src={logo} alt={store.name} className="h-16 object-contain mx-auto" />
        ) : (
          <h1 className="text-2xl font-bold text-gray-900">{store.name || 'Returns Center'}</h1>
        )}
      </div>

      {/* Card */}
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">

        {/* Tabs */}
        <div className="flex border-b border-gray-100">
          {['start', 'tracking'].map(t => (
            <button
              key={t}
              onClick={() => { setTab(t); setError(''); }}
              className={`flex-1 py-3.5 text-sm font-medium transition-colors ${tab === t ? 'text-gray-900 border-b-2' : 'text-gray-400 hover:text-gray-600'}`}
              style={tab === t ? { borderColor: primary } : {}}
            >
              {t === 'start' ? 'Start a Return' : 'Upload Tracking'}
            </button>
          ))}
        </div>

        {tab === 'start' ? (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">Returns Center</h2>
              <p className="text-sm text-gray-400">{store.lookupIntroText || 'Enter your order details to get started.'}</p>
            </div>
            <Input
              placeholder={store.orderNumberLabel || 'Order number'}
              value={orderNumber}
              onChange={e => setOrderNumber(e.target.value)}
              primary={primary}
            />
            <Input
              type="email"
              placeholder={store.emailLabel || 'Email'}
              value={email}
              onChange={e => setEmail(e.target.value)}
              primary={primary}
            />
            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">{error}</p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl text-sm font-semibold text-white transition-opacity disabled:opacity-60"
              style={{ backgroundColor: loading ? '#9ca3af' : primary }}
            >
              {loading ? 'Searching…' : (store.findOrderText || 'Find your order')}
            </button>
          </form>
        ) : (
          <div className="p-6 space-y-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">Upload Tracking</h2>
              <p className="text-sm text-gray-400">Enter your RMA number to check status and upload tracking.</p>
            </div>
            <button
              onClick={() => onUploadTracking(null)}
              className="w-full py-3.5 rounded-xl text-sm font-semibold text-white transition-opacity"
              style={{ backgroundColor: primary }}
            >
              Continue
            </button>
          </div>
        )}

        {/* Policy link */}
        {store.showPolicyOnLookup !== false && (store.policyUrl || store.policyText) && (
          <div className="px-6 pb-6 text-center">
            <p className="text-xs text-gray-400">For more details on our return policy</p>
            {store.policyUrl ? (
              <a
                href={store.policyUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs underline text-gray-500 hover:text-gray-700"
              >
                View policy here
              </a>
            ) : (
              <button
                className="text-xs underline text-gray-500 hover:text-gray-700"
                onClick={() => alert(store.policyText)}
              >
                View policy here
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Input({ placeholder, value, onChange, type = 'text', primary }) {
  const [focused, setFocused] = useState(false);
  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      placeholder={placeholder}
      className="w-full px-4 py-3 rounded-xl border text-sm bg-white outline-none transition-all"
      style={{
        borderColor: focused ? primary : '#e5e7eb',
        boxShadow: focused ? `0 0 0 3px ${primary}20` : 'none',
      }}
    />
  );
}
