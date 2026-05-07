import { useState, useEffect } from 'react';
import { MerchantProvider } from './MerchantContext';
import MerchantApp from './MerchantApp';
import { verifyMerchantSession, setMerchantToken } from '../utils/returnsApi';

// Pull session token from URL on fresh OAuth redirect, then clean the URL.
function consumeUrlToken() {
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token');
  const shop  = params.get('shop');
  if (token && shop) {
    localStorage.setItem(`merchant-session:${shop}`, token);
    params.delete('token');
    const clean = `${window.location.pathname}?${params.toString()}`.replace(/\?$/, '');
    window.history.replaceState({}, '', clean);
    return { token, shop };
  }
  return null;
}

// Find the most recently stored merchant session for the shop in the URL.
function storedSession() {
  const params = new URLSearchParams(window.location.search);
  const shop = params.get('shop');
  if (shop) {
    const token = localStorage.getItem(`merchant-session:${shop}`);
    if (token) return { token, shop };
  }
  // Fallback: any stored session (for bookmarked /merchant without ?shop=)
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith('merchant-session:')) {
      const s = key.slice('merchant-session:'.length);
      const t = localStorage.getItem(key);
      if (t && s) return { token: t, shop: s };
    }
  }
  return null;
}

function Spinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function NotConnected({ shop }) {
  const installUrl = shop
    ? `/auth/shopify?shop=${encodeURIComponent(shop)}`
    : null;
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full mx-4 text-center">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-10">
          <div className="w-14 h-14 rounded-full bg-indigo-100 flex items-center justify-center mx-auto mb-5">
            <svg className="w-7 h-7 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Returns Center</h1>
          <p className="text-gray-500 text-sm mb-6">
            {shop
              ? 'Your session has expired. Please reconnect through Shopify to continue.'
              : 'Access this dashboard through your Shopify Admin to get started.'}
          </p>
          {installUrl && (
            <a
              href={installUrl}
              className="inline-block bg-indigo-600 text-white text-sm font-semibold px-6 py-3 rounded-xl hover:bg-indigo-700 transition-colors"
            >
              Connect via Shopify
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MerchantRoot() {
  const [status, setStatus] = useState('loading'); // loading | ok | unauth
  const [session, setSession] = useState(null);

  useEffect(() => {
    const fresh = consumeUrlToken();
    const sess  = fresh || storedSession();

    if (!sess) { setStatus('unauth'); return; }

    verifyMerchantSession(sess.token)
      .then(data => {
        if (data.ok) {
          setMerchantToken(sess.token);
          setSession(sess);
          setStatus('ok');
        } else {
          localStorage.removeItem(`merchant-session:${sess.shop}`);
          setStatus('unauth');
        }
      })
      .catch(() => {
        // Network error — assume still valid and let API calls fail gracefully
        setMerchantToken(sess.token);
        setSession(sess);
        setStatus('ok');
      });
  }, []);

  if (status === 'loading') return <Spinner />;

  if (status === 'unauth') {
    const shop = new URLSearchParams(window.location.search).get('shop');
    return <NotConnected shop={shop} />;
  }

  return (
    <MerchantProvider shopOverride={session.shop}>
      <MerchantApp
        onViewPortal={() => {
          const url = `/?shop=${encodeURIComponent(session.shop)}`;
          window.open(url, '_blank');
        }}
      />
    </MerchantProvider>
  );
}
