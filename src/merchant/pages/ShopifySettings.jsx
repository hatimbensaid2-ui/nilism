import { useEffect, useState } from 'react';
import { useMerchant } from '../MerchantContext';
import { startOAuth, getShopInfo } from '../../utils/shopifyApi';

const SCOPES_NEEDED = [
  { label: 'Read orders',        desc: 'View order details and customer info' },
  { label: 'Write orders',       desc: 'Update order status and add notes' },
  { label: 'Write refunds',      desc: 'Issue full or partial refunds automatically' },
  { label: 'Read customers',     desc: 'Link returns to customer profiles' },
  { label: 'Read products',      desc: 'Show product details in the return portal' },
];

export default function ShopifySettings() {
  const { config, updateShopify } = useMerchant();
  const shopify = config.shopify || {};

  const [shopInput, setShopInput] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState('');
  const [shopData, setShopData] = useState(null);

  // Handle redirect back from OAuth (?shopify_connected=1&shop=...)
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes('shopify_connected=1')) {
      const params = new URLSearchParams(hash.split('?')[1] || '');
      const shop = params.get('shop');
      if (shop) {
        updateShopify({ connected: true, shop, connectedAt: new Date().toISOString() });
        // Clean the URL
        window.history.replaceState(null, '', window.location.pathname + '#merchant');
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Verify connection on load
  useEffect(() => {
    if (shopify.connected && shopify.shop && !shopData) {
      setVerifying(true);
      getShopInfo(shopify.shop)
        .then(d => setShopData(d.shop))
        .catch(() => setShopData(null))
        .finally(() => setVerifying(false));
    }
  }, [shopify.connected, shopify.shop]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleConnect() {
    const shop = shopInput.trim();
    if (!shop) return;
    startOAuth(shop);
  }

  function handleDisconnect() {
    updateShopify({ connected: false, shop: null, connectedAt: null });
    setShopData(null);
  }

  return (
    <div className="flex-1 min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200 px-6 py-5">
        <h1 className="text-xl font-bold text-slate-900">Shopify Integration</h1>
        <p className="text-sm text-slate-500 mt-0.5">Connect your Shopify store to process real refunds, read order data, and sync return statuses.</p>
      </div>

      <div className="p-6 max-w-2xl space-y-5">

        {shopify.connected ? (
          <ConnectedState
            shopify={shopify}
            shopData={shopData}
            verifying={verifying}
            onDisconnect={handleDisconnect}
          />
        ) : (
          <ConnectForm
            shopInput={shopInput}
            setShopInput={setShopInput}
            verifyError={verifyError}
            onConnect={handleConnect}
          />
        )}

        {/* Permissions required */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Permissions Required</h3>
          <div className="space-y-3">
            {SCOPES_NEEDED.map(s => (
              <div key={s.label} className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center shrink-0 mt-0.5">
                  <svg className="w-3 h-3 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-800">{s.label}</p>
                  <p className="text-xs text-slate-500">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Step-by-step guide */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">How to Go Live</h3>
          <div className="space-y-4">
            {[
              {
                n: 1,
                title: 'Create a Shopify Partners account',
                detail: 'Go to partners.shopify.com → sign up → create a new app (Custom App for a single store, or Public App for the App Store).',
              },
              {
                n: 2,
                title: 'Get your API credentials',
                detail: 'In Partners Dashboard → Apps → your app → API credentials. Copy the API key and API secret key.',
              },
              {
                n: 3,
                title: 'Deploy the backend server',
                detail: 'The server/ folder in this repo is a ready-to-deploy Express app. Push it to Railway (railway.app), Render (render.com), or any Node.js host. Set SHOPIFY_API_KEY, SHOPIFY_API_SECRET, HOST, and FRONTEND_URL environment variables.',
              },
              {
                n: 4,
                title: 'Set your App URL in Partners',
                detail: 'Back in Partners Dashboard → App setup → set App URL to your Railway/Render URL (e.g. https://your-app.railway.app). Set Allowed redirection URL to https://your-app.railway.app/auth/shopify/callback.',
              },
              {
                n: 5,
                title: 'Set VITE_BACKEND_URL and redeploy frontend',
                detail: 'Add VITE_BACKEND_URL=https://your-app.railway.app to your frontend environment (GitHub Actions secret or .env file), then push. This tells the returns portal where to send API calls.',
              },
              {
                n: 6,
                title: 'Connect your store above',
                detail: 'Enter your .myshopify.com URL and click Connect. You\'ll be redirected to Shopify to approve the permissions, then back here.',
              },
            ].map(step => (
              <div key={step.n} className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                  {step.n}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">{step.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{step.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}

function ConnectForm({ shopInput, setShopInput, verifyError, onConnect }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
          <ShopifyIcon />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-900">Connect your Shopify store</p>
          <p className="text-xs text-slate-500">You'll be redirected to Shopify to approve the connection.</p>
        </div>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={shopInput}
            onChange={e => setShopInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && onConnect()}
            placeholder="yourstore"
            className="w-full px-3.5 py-2.5 pr-32 border border-slate-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400 font-mono">.myshopify.com</span>
        </div>
        <button
          onClick={onConnect}
          disabled={!shopInput.trim()}
          className="bg-[#008060] hover:bg-[#006e52] disabled:bg-slate-300 text-white font-semibold px-4 py-2.5 rounded-lg text-sm transition-colors flex items-center gap-2 shrink-0"
        >
          <ShopifyIcon className="w-4 h-4" />
          Connect
        </button>
      </div>
      {verifyError && <p className="text-xs text-red-600">{verifyError}</p>}
    </div>
  );
}

function ConnectedState({ shopify, shopData, verifying, onDisconnect }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">Store connected</p>
            <p className="text-xs text-emerald-600 font-medium">{shopify.shop}</p>
          </div>
        </div>
        <button onClick={onDisconnect}
          className="text-xs text-red-500 hover:text-red-700 border border-red-200 hover:border-red-300 px-3 py-1.5 rounded-lg font-medium transition-colors">
          Disconnect
        </button>
      </div>

      {verifying && (
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
          </svg>
          Verifying connection…
        </div>
      )}

      {shopData && (
        <div className="grid grid-cols-2 gap-3 pt-1">
          {[
            { label: 'Store name',  value: shopData.name },
            { label: 'Plan',        value: shopData.plan_display_name },
            { label: 'Currency',    value: shopData.currency },
            { label: 'Country',     value: shopData.country_name },
          ].map(row => (
            <div key={row.label} className="bg-slate-50 rounded-lg px-3 py-2">
              <p className="text-xs text-slate-500">{row.label}</p>
              <p className="text-sm font-semibold text-slate-800">{row.value || '—'}</p>
            </div>
          ))}
        </div>
      )}

      {shopify.connectedAt && (
        <p className="text-xs text-slate-400">
          Connected {new Date(shopify.connectedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
        </p>
      )}
    </div>
  );
}

function ShopifyIcon({ className = 'w-5 h-5' }) {
  return (
    <svg className={className} viewBox="0 0 50 57" fill="currentColor">
      <path d="M43.5 10.5c0 0-0.4-0.3-1-0.3c-0.1 0-0.2 0-0.4 0c-0.4-1.4-1.4-5.3-4.7-5.3c-0.1 0-0.2 0-0.2 0C36.1 3.3 34.9 2.5 33.5 2.5c-3.6 0-5.4 4.5-5.9 6.8c-1.4 0.4-2.8 0.9-4.3 1.3c-0.8 0.2-1.7 0.5-2.5 0.8L20.3 12c-0.8-0.8-1.9-1.3-3.1-1.3c-2.4 0-4.4 2-4.4 4.4c0 0.6 0.1 1.1 0.3 1.6L7 18.6C4.8 19.4 3.2 21.5 3 23.9L0.2 49.8c-0.1 1.1 0.2 2.2 0.9 3c0.7 0.8 1.7 1.2 2.7 1.2h37.5c1.7 0 3.2-1.2 3.5-2.9l4.4-35.3C49.6 12.8 46.9 11.2 43.5 10.5zM34.1 6c1.4 0.5 2.1 2.3 2.5 3.7c-1.3 0.4-2.5 0.8-3.7 1.1V10.5C32.9 9.2 33 7.4 34.1 6zM28 5.5c0.8 0 1.5 0.4 2 1.1C29.2 6.9 28.5 7.1 27.7 7.3C28.4 5.9 29.3 4.5 28 5.5zM27.6 11.5l0.3-1.1c0.3-0.1 2.5-0.8 3.1-1l-0.2 1.6c-1 0.2-2 0.4-3.2 0.5z" />
    </svg>
  );
}
