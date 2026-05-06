import { useState, useEffect, useRef } from 'react';

const BASE = import.meta.env.VITE_BACKEND_URL ?? (import.meta.env.DEV ? 'http://localhost:3001' : '');

function api(path, opts = {}) {
  return fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...opts.headers },
    ...opts,
  }).then(r => r.json());
}

// ── Login ─────────────────────────────────────────────────────────────────────

function AdminLogin({ onLogin }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await api('/api/admin/login', {
        method: 'POST',
        body: JSON.stringify({ password }),
      });
      if (data.ok) {
        localStorage.setItem('admin-session', data.token);
        onLogin(data.token);
      } else {
        setError('Invalid password.');
      }
    } catch {
      setError('Connection error. Is the server running?');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f172a]">
      <div className="w-full max-w-sm px-4">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white">Returns Center</h1>
          <p className="text-slate-400 text-sm mt-1">Admin Dashboard</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white/[0.05] border border-white/[0.08] rounded-2xl p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-white/[0.07] border border-white/[0.12] rounded-xl px-4 py-3 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Admin password"
              required
            />
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 text-white text-sm font-semibold py-3 rounded-xl hover:bg-indigo-500 transition-colors disabled:opacity-50"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Shop card ─────────────────────────────────────────────────────────────────

function ShopCard({ shop, token, onRemoved }) {
  const [removing, setRemoving] = useState(false);
  const [expanded, setExpanded] = useState(false);

  async function handleRemove() {
    if (!window.confirm(`Remove ${shop.shop} and all its data?`)) return;
    setRemoving(true);
    try {
      await api(`/api/admin/shops/${encodeURIComponent(shop.shop)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      onRemoved(shop.shop);
    } catch {
      setRemoving(false);
    }
  }

  const installed = shop.installedAt
    ? new Date(shop.installedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
    : '—';

  const lastReturn = shop.lastReturn
    ? new Date(shop.lastReturn).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
    : null;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div
        className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setExpanded(v => !v)}
      >
        <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0">
          <span className="text-indigo-700 font-bold text-sm">
            {(shop.name || shop.shop)[0].toUpperCase()}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 truncate">{shop.name || shop.shop}</p>
          <p className="text-xs text-gray-500 truncate">{shop.shop}</p>
        </div>
        <div className="flex items-center gap-6 shrink-0">
          <div className="text-center">
            <p className="text-lg font-bold text-gray-900">{shop.returnCount}</p>
            <p className="text-[11px] text-gray-400">Returns</p>
          </div>
          <div className="text-center hidden sm:block">
            <p className="text-sm font-medium text-gray-700">{installed}</p>
            <p className="text-[11px] text-gray-400">Installed</p>
          </div>
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-gray-100 px-5 py-4 bg-gray-50 space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
            {shop.email && (
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Merchant email</p>
                <a href={`mailto:${shop.email}`} className="text-indigo-600 hover:underline truncate block">
                  {shop.email}
                </a>
              </div>
            )}
            {shop.phone && (
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Phone</p>
                <p className="text-gray-700">{shop.phone}</p>
              </div>
            )}
            {shop.country && (
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Country</p>
                <p className="text-gray-700">{shop.country}</p>
              </div>
            )}
            {shop.currency && (
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Currency</p>
                <p className="text-gray-700">{shop.currency}</p>
              </div>
            )}
            {lastReturn && (
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Last return</p>
                <p className="text-gray-700">{lastReturn}</p>
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-1">
            {shop.email && (
              <a
                href={`mailto:${shop.email}`}
                className="inline-flex items-center gap-1.5 text-xs font-medium bg-indigo-50 text-indigo-700 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Contact merchant
              </a>
            )}
            <button
              onClick={handleRemove}
              disabled={removing}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              {removing ? 'Removing…' : 'Remove shop'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Inbox (admin chat) ────────────────────────────────────────────────────────

function AdminInbox({ token }) {
  const [byShop, setByShop] = useState({});
  const [activeShop, setActiveShop] = useState(null);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef(null);
  const pollRef = useRef(null);

  function load() {
    api('/api/admin/messages', { headers: { Authorization: `Bearer ${token}` } })
      .then(d => { if (d.byShop) setByShop(d.byShop); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    pollRef.current = setInterval(load, 6000);
    return () => clearInterval(pollRef.current);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeShop, byShop]);

  async function handleSend(e) {
    e.preventDefault();
    if (!text.trim() || !activeShop || sending) return;
    setSending(true);
    try {
      const d = await api(`/api/admin/messages/${encodeURIComponent(activeShop)}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ text: text.trim() }),
      });
      if (d.ok) {
        setByShop(prev => ({ ...prev, [activeShop]: [...(prev[activeShop] || []), d.message] }));
        setText('');
      }
    } catch {}
    setSending(false);
  }

  const shopList = Object.keys(byShop).sort((a, b) => {
    const aLast = byShop[a].at(-1)?.createdAt || '';
    const bLast = byShop[b].at(-1)?.createdAt || '';
    return bLast.localeCompare(aLast);
  });

  const activeMessages = activeShop ? (byShop[activeShop] || []) : [];
  const unreadShops = shopList.filter(s => byShop[s].some(m => m.from === 'merchant' && !m.read));

  return (
    <div className="flex h-[calc(100vh-65px)] bg-white rounded-2xl border border-gray-200 overflow-hidden">
      {/* Shop list */}
      <div className="w-72 border-r border-gray-100 flex flex-col">
        <div className="px-4 py-3 border-b border-gray-100">
          <p className="text-sm font-semibold text-gray-900">Conversations</p>
          {unreadShops.length > 0 && (
            <p className="text-xs text-indigo-600 mt-0.5">{unreadShops.length} unread</p>
          )}
        </div>
        <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <div className="w-6 h-6 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : shopList.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-10 px-4">No messages yet.</p>
          ) : shopList.map(shop => {
            const msgs = byShop[shop];
            const last = msgs.at(-1);
            const hasUnread = msgs.some(m => m.from === 'merchant' && !m.read);
            return (
              <button
                key={shop}
                onClick={() => setActiveShop(shop)}
                className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${activeShop === shop ? 'bg-indigo-50' : ''}`}
              >
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center shrink-0">
                    {shop[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-semibold truncate ${hasUnread ? 'text-gray-900' : 'text-gray-600'}`}>{shop.replace('.myshopify.com', '')}</p>
                    <p className="text-xs text-gray-400 truncate">{last?.text}</p>
                  </div>
                  {hasUnread && <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col">
        {!activeShop ? (
          <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
            Select a conversation
          </div>
        ) : (
          <>
            <div className="px-5 py-3 border-b border-gray-100">
              <p className="text-sm font-semibold text-gray-900">{activeShop}</p>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 bg-gray-50">
              {activeMessages.map(m => (
                <div key={m.id} className={`flex ${m.from === 'admin' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[70%] px-3.5 py-2.5 rounded-2xl text-sm ${
                    m.from === 'admin'
                      ? 'bg-indigo-600 text-white rounded-br-sm'
                      : 'bg-white text-gray-800 border border-gray-200 rounded-bl-sm shadow-sm'
                  }`}>
                    <p className="text-xs font-semibold mb-0.5 opacity-70">{m.from === 'admin' ? 'You' : 'Merchant'}</p>
                    {m.text}
                    <p className={`text-[10px] mt-1 ${m.from === 'admin' ? 'text-indigo-200' : 'text-gray-400'}`}>
                      {new Date(m.createdAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
            <form onSubmit={handleSend} className="px-4 py-3 border-t border-gray-100 flex gap-2 bg-white">
              <input
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder="Reply to merchant…"
                className="flex-1 text-sm px-3.5 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                type="submit"
                disabled={!text.trim() || sending}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-200 text-white text-sm font-semibold rounded-xl transition-colors"
              >
                Send
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

function AdminDashboard({ token, onLogout }) {
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('shops'); // 'shops' | 'inbox'

  useEffect(() => {
    api('/api/admin/shops', { headers: { Authorization: `Bearer ${token}` } })
      .then(data => {
        if (data.shops) setShops(data.shops);
        else onLogout();
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = shops.filter(s =>
    !search ||
    s.shop.toLowerCase().includes(search.toLowerCase()) ||
    (s.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (s.email || '').toLowerCase().includes(search.toLowerCase())
  );

  const totalReturns = shops.reduce((sum, s) => sum + s.returnCount, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-[#0f172a] border-b border-white/[0.06]">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
              </svg>
            </div>
            <div>
              <p className="text-white font-bold text-sm">Returns Center</p>
              <p className="text-slate-400 text-[11px]">Admin Dashboard</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex gap-1 bg-white/[0.06] rounded-xl p-1">
              {['shops', 'inbox'].map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize ${
                    tab === t ? 'bg-white text-gray-900' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
            <button
              onClick={onLogout}
              className="text-slate-400 hover:text-slate-200 text-sm transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {tab === 'inbox' && <AdminInbox token={token} />}
        {tab === 'shops' && (<>
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {[
            { label: 'Connected shops', value: shops.length },
            { label: 'Total returns', value: totalReturns },
            { label: 'Active today', value: shops.filter(s => s.lastReturn && new Date(s.lastReturn) > new Date(Date.now() - 86400000)).length },
          ].map(stat => (
            <div key={stat.label} className="bg-white rounded-2xl border border-gray-200 px-5 py-4">
              <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
              <p className="text-sm text-gray-500 mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search shops by name, domain or email…"
            className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Shop list */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            {shops.length === 0 ? 'No shops connected yet.' : 'No shops match your search.'}
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-gray-500">{filtered.length} shop{filtered.length !== 1 ? 's' : ''}</p>
            {filtered.map(shop => (
              <ShopCard
                key={shop.shop}
                shop={shop}
                token={token}
                onRemoved={s => setShops(prev => prev.filter(x => x.shop !== s))}
              />
            ))}
          </div>
        )}
        </>)}
      </main>
    </div>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────

export default function AdminApp() {
  const [token, setToken] = useState(() => localStorage.getItem('admin-session'));

  function handleLogout() {
    localStorage.removeItem('admin-session');
    setToken(null);
  }

  if (!token) return <AdminLogin onLogin={setToken} />;
  return <AdminDashboard token={token} onLogout={handleLogout} />;
}
