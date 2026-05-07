import { useEffect, useState } from 'react';
import { useMerchant } from '../MerchantContext';
import { getShopInfo } from '../../utils/shopifyApi';

const BACKEND = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

const SCOPES = 'read_orders, write_orders, read_customers, write_customers, read_products';

function CopyField({ label, value, mono = true }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }
  return (
    <div>
      <p className="text-xs font-medium text-slate-500 mb-1">{label}</p>
      <div className="flex items-center gap-2">
        <code className={`flex-1 text-xs bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 truncate ${mono ? 'font-mono' : ''}`}>
          {value}
        </code>
        <button onClick={copy}
          className="shrink-0 flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg border transition-colors border-slate-300 text-slate-600 hover:border-indigo-400 hover:text-indigo-600">
          {copied ? (
            <><svg className="w-3.5 h-3.5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg><span className="text-emerald-600">Copied</span></>
          ) : (
            <><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>Copy</>
          )}
        </button>
      </div>
    </div>
  );
}

function Check({ done }) {
  return done
    ? <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center shrink-0"><svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg></div>
    : <div className="w-5 h-5 rounded-full border-2 border-slate-300 shrink-0" />;
}

export default function ShopifySettings() {
  const { config, updateShopify } = useMerchant();
  const shopify = config.shopify || {};
  const [shopData, setShopData] = useState(null);
  const [verifying, setVerifying] = useState(false);

  // After OAuth callback the server redirects to:
  // /?shopify_installed=1&shop=STORE.myshopify.com#merchant
  // Read the query string (before the hash) to detect this.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('shopify_installed') === '1') {
      const shop = params.get('shop');
      if (shop) {
        updateShopify({ connected: true, shop, connectedAt: new Date().toISOString() });
        // Clean the URL so a refresh doesn't re-trigger this
        const clean = window.location.pathname + '#merchant';
        window.history.replaceState(null, '', clean);
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Verify connection health whenever shop changes
  useEffect(() => {
    if (!shopify.connected || !shopify.shop) return;
    setVerifying(true);
    getShopInfo(shopify.shop)
      .then(d => setShopData(d?.shop ?? null))
      .catch(() => setShopData(null))
      .finally(() => setVerifying(false));
  }, [shopify.shop]); // eslint-disable-line react-hooks/exhaustive-deps

  const backendReady = BACKEND && !BACKEND.includes('localhost');
  const installLink  = `${BACKEND}/auth/shopify?shop=DEVSTORE.myshopify.com`;

  return (
    <div className="flex-1 min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200 px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#008060]/10 flex items-center justify-center shrink-0">
            <ShopifyLogo className="w-5 h-5 text-[#008060]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Shopify Integration</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Publish to Shopify Partners so any merchant installs in one click.
            </p>
          </div>
        </div>
      </div>

      <div className="p-6 max-w-2xl space-y-5">

        {/* Connection status banner */}
        {shopify.connected ? (
          <ConnectedBanner shopify={shopify} shopData={shopData} verifying={verifying}
            onDisconnect={() => { updateShopify({ connected: false, shop: null }); setShopData(null); }} />
        ) : (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-3">
            <svg className="w-5 h-5 text-amber-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
            <p className="text-sm text-amber-800 font-medium">No store connected yet. Complete the setup below.</p>
          </div>
        )}

        {/* Setup checklist */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50">
            <h3 className="text-sm font-bold text-slate-800">Setup Checklist</h3>
            <p className="text-xs text-slate-500 mt-0.5">Complete these four steps once — then any merchant can install with a single click.</p>
          </div>
          <div className="divide-y divide-slate-100">

            {/* Step 1 */}
            <SetupStep n={1} title="Create a Shopify Partners account" done>
              <p className="text-xs text-slate-500">
                Go to <strong>partners.shopify.com</strong> → sign up → <strong>Apps → Create app → Create app manually</strong>.
                Choose a name (e.g. "Returns Center"). Copy the <strong>API key</strong> and <strong>API secret key</strong>.
              </p>
            </SetupStep>

            {/* Step 2 */}
            <SetupStep n={2} title="Deploy the backend to Railway" done={backendReady}>
              <p className="text-xs text-slate-500 mb-3">
                The <code className="font-mono bg-slate-100 px-1 rounded">server/</code> folder is ready to deploy. Push this repo to GitHub, then:
              </p>
              <ol className="text-xs text-slate-500 space-y-1 list-decimal list-inside">
                <li>Go to <strong>railway.app</strong> → New project → Deploy from GitHub repo → select <strong>server/</strong> folder.</li>
                <li>Add environment variables in Railway's dashboard (Variables tab):</li>
              </ol>
              <div className="mt-3 space-y-2">
                {[
                  ['SHOPIFY_API_KEY',    'From Partners dashboard'],
                  ['SHOPIFY_API_SECRET', 'From Partners dashboard'],
                  ['HOST',              'Your Railway URL  (e.g. https://returns-center.up.railway.app)'],
                  ['FRONTEND_URL',      'Your GitHub Pages URL'],
                ].map(([k, v]) => (
                  <div key={k} className="flex items-start gap-2">
                    <code className="text-xs font-mono bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-slate-800 shrink-0">{k}</code>
                    <span className="text-xs text-slate-500">{v}</span>
                  </div>
                ))}
              </div>
              {!backendReady && (
                <div className="mt-3 flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                  </svg>
                  <span><strong>VITE_BACKEND_URL</strong> is not set. Add it as a GitHub Actions secret then redeploy the frontend.</span>
                </div>
              )}
            </SetupStep>

            {/* Step 3 */}
            <SetupStep n={3} title="Paste URLs into Shopify Partners" done={backendReady}>
              <p className="text-xs text-slate-500 mb-3">
                In <strong>Shopify Partners → Apps → your app → Configuration</strong>, set these fields:
              </p>
              <div className="space-y-3">
                <CopyField label="App URL (where Shopify sends merchants on install)"
                  value={`${BACKEND}/auth/shopify`} />
                <CopyField label="Allowed redirection URL"
                  value={`${BACKEND}/auth/shopify/callback`} />
              </div>
              <p className="text-xs font-semibold text-slate-600 mt-4 mb-2">GDPR webhooks (required for App Store listing)</p>
              <div className="space-y-2">
                <CopyField label="Customer data request" value={`${BACKEND}/webhooks/customers.data_request`} />
                <CopyField label="Customer redact"        value={`${BACKEND}/webhooks/customers.redact`} />
                <CopyField label="Shop redact"            value={`${BACKEND}/webhooks/shop.redact`} />
              </div>
              <p className="text-xs font-semibold text-slate-600 mt-4 mb-1">Scopes to request</p>
              <CopyField label="" value={SCOPES} />
            </SetupStep>

            {/* Step 4 */}
            <SetupStep n={4} title="Test the install flow" done={shopify.connected}>
              <p className="text-xs text-slate-500 mb-3">
                Create a <strong>development store</strong> in Partners, then open the link below (replace DEVSTORE with your store name).
                The merchant sees the Shopify permission screen, clicks <strong>Install</strong>, and lands directly in this dashboard — no extra steps.
              </p>
              <CopyField label="Install link (replace DEVSTORE)" value={installLink} />
              <p className="text-xs text-slate-500 mt-3">
                For the <strong>App Store</strong>: submit your app under Partners → Distribution → Shopify App Store.
                Once approved, merchants click "Add app" and the same OAuth flow runs automatically.
              </p>
            </SetupStep>

          </div>
        </div>

        {/* Permissions card */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">Permissions shown to merchants on install</h3>
          <div className="space-y-3">
            {[
              { icon: '📦', label: 'View and manage orders',   desc: 'Read order details, update order status, add notes' },
              { icon: '💳', label: 'Issue refunds',            desc: 'Process full and partial refunds on your behalf' },
              { icon: '👤', label: 'View customer information',desc: 'Link returns to customer profiles' },
              { icon: '🛍️', label: 'View products',            desc: 'Display product images and names in the portal' },
            ].map(p => (
              <div key={p.label} className="flex items-start gap-3">
                <span className="text-base shrink-0 mt-0.5">{p.icon}</span>
                <div>
                  <p className="text-sm font-medium text-slate-800">{p.label}</p>
                  <p className="text-xs text-slate-500">{p.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-start gap-2 bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2.5">
            <svg className="w-4 h-4 text-indigo-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20 10 10 0 000-20z" />
            </svg>
            <p className="text-xs text-indigo-700">
              Shopify shows these permissions to the merchant before install. They click <strong>Install app</strong> and it's done — no API keys, no configuration needed on their end.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}

function SetupStep({ n, title, done, children }) {
  const [open, setOpen] = useState(!done);
  return (
    <div>
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-slate-50 transition-colors">
        <Check done={done} />
        <span className={`flex-1 text-sm font-semibold ${done ? 'text-slate-500 line-through' : 'text-slate-800'}`}>
          {title}
        </span>
        {done && <span className="text-xs font-semibold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">Done</span>}
        <svg className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && <div className="px-5 pb-5 space-y-2">{children}</div>}
    </div>
  );
}

function ConnectedBanner({ shopify, shopData, verifying, onDisconnect }) {
  return (
    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-bold text-emerald-900">Store connected</p>
            <p className="text-xs text-emerald-700 font-mono">{shopify.shop}</p>
          </div>
        </div>
        <button onClick={onDisconnect}
          className="text-xs text-red-500 hover:text-red-700 border border-red-200 hover:border-red-300 bg-white px-3 py-1.5 rounded-lg font-medium transition-colors">
          Disconnect
        </button>
      </div>

      {verifying && (
        <div className="flex items-center gap-2 text-xs text-emerald-700">
          <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
          </svg>
          Verifying…
        </div>
      )}

      {shopData && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { label: 'Store',    value: shopData.name },
            { label: 'Plan',     value: shopData.plan_display_name },
            { label: 'Currency', value: shopData.currency },
            { label: 'Country',  value: shopData.country_name },
          ].map(r => (
            <div key={r.label} className="bg-white/70 rounded-lg px-3 py-2">
              <p className="text-[10px] text-emerald-600 font-medium uppercase tracking-wider">{r.label}</p>
              <p className="text-sm font-semibold text-slate-800 truncate">{r.value || '—'}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ShopifyLogo({ className }) {
  return (
    <svg className={className} viewBox="0 0 109 124" fill="currentColor">
      <path d="M74.7 14.8s-.3-1.2-1.2-1.7c-.9-.5-1.4-.4-1.4-.4s-3.3.7-4.8 1.1c-.3-.9-.7-1.9-1.2-2.9-1.8-3.5-4.5-5.3-7.7-5.3h-.1c-.2-.3-.5-.5-.7-.8C56.3 3.5 54.7 3 52.9 3c-5.8.2-11.6 4.4-16.3 11.9-3.3 5.2-5.8 11.8-6.5 16.9l-11.3 3.5c-3.3 1-3.4 1.1-3.9 4.3C14.5 42 4 122 4 122l73.4 13.8 40-9.9S74.7 14.8 74.7 14.8zm-18.2 5.5c-3.9 1.2-8.2 2.5-12.4 3.8.9-4.8 2.7-9.5 5.3-12.8 1.1-1.3 2.6-2.7 4.4-3.5 1.7 3.5 2.8 8.5 2.7 12.5zm-7.2-15c1.4 0 2.7.5 3.7 1.3-1.6.9-3.2 2.2-4.7 3.9-3.8 4.3-6.7 10.9-7.6 17.3l-10.2 3.1c1.4-9.4 8.8-25.1 18.8-25.6zm3.3 56.7c.3 5.2-1.4 9.3-3.9 9.5-2.5.1-4.7-3.7-5-8.9-.3-5.2 1.4-9.7 3.9-9.8 2.5-.2 4.7 3.9 5 9.2zm20-46.4c-1.4-6.5-3.8-11.2-6.5-14.2l-.1.1c2.2 3.6 3.6 8.6 4.3 14.9l2.3-.8z"/>
    </svg>
  );
}
