import { useState, useEffect } from 'react';
import { useMerchant } from '../MerchantContext';
import { verifyDomain, registerDomain, fetchCnameTarget } from '../../utils/returnsApi';

function generateToken() {
  return 'returns-verify=' + Math.random().toString(36).slice(2, 18);
}

function parseDomain(raw) {
  return raw.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '');
}

function StatusBadge({ status }) {
  const map = {
    pending:   { label: 'Pending',     cls: 'bg-yellow-100 text-yellow-700' },
    verifying: { label: 'Verifying…',  cls: 'bg-blue-100 text-blue-700' },
    active:    { label: 'Active',       cls: 'bg-green-100 text-green-700' },
    failed:    { label: 'DNS Failed',   cls: 'bg-red-100 text-red-700' },
  };
  const s = map[status] || map.pending;
  return <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${s.cls}`}>{s.label}</span>;
}

function CopyField({ label, value }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }
  return (
    <div>
      <p className="text-xs text-gray-500 font-medium mb-1">{label}</p>
      <div className="flex items-center gap-2">
        <code className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs font-mono text-gray-800 break-all">
          {value}
        </code>
        <button
          onClick={copy}
          className="shrink-0 px-2.5 py-2 border border-gray-300 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
        >
          {copied ? '✓' : 'Copy'}
        </button>
      </div>
    </div>
  );
}

export default function DomainSettings() {
  const { config, setDomains } = useMerchant();
  const domains = config.domains || [];

  const [showAddForm, setShowAddForm] = useState(false);
  const [inputDomain, setInputDomain] = useState('');
  const [inputError, setInputError] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [cnameTarget, setCnameTarget] = useState('your-service.up.railway.app');
  const [registerStatus, setRegisterStatus] = useState({}); // domainId → {ok, message}

  useEffect(() => {
    fetchCnameTarget().then(d => { if (d.host) setCnameTarget(d.host); }).catch(() => {});
  }, []);

  async function handleAdd() {
    const domain = parseDomain(inputDomain);
    if (!domain) { setInputError('Please enter a domain or subdomain.'); return; }
    if (!/^[a-z0-9]([a-z0-9-]*\.)+[a-z]{2,}$/.test(domain)) {
      setInputError('Enter a valid domain, e.g. returns.mystore.com');
      return;
    }
    if (domains.find(d => d.domain === domain)) {
      setInputError('This domain is already added.');
      return;
    }
    const newDomain = {
      id: 'dom-' + Date.now(),
      domain,
      token: generateToken(),
      status: 'pending',
      addedAt: new Date().toISOString(),
    };
    const next = [...domains, newDomain];
    setDomains(next);
    setExpandedId(newDomain.id);
    setShowAddForm(false);
    setInputDomain('');
    setInputError('');

    // Attempt auto-register with Railway
    try {
      const result = await registerDomain(domain);
      setRegisterStatus(prev => ({ ...prev, [newDomain.id]: result }));
    } catch {
      setRegisterStatus(prev => ({ ...prev, [newDomain.id]: { ok: false } }));
    }
  }

  async function handleVerify(id) {
    const d = domains.find(x => x.id === id);
    if (!d) return;
    setDomains(domains.map(x => x.id === id ? { ...x, status: 'verifying' } : x));
    try {
      const result = await verifyDomain(d.domain, d.token);
      setDomains(prev => prev.map(x => x.id === id ? { ...x, status: result.verified ? 'active' : 'failed' } : x));
    } catch {
      setDomains(prev => prev.map(x => x.id === id ? { ...x, status: 'failed' } : x));
    }
  }

  async function handleReregister(id) {
    const d = domains.find(x => x.id === id);
    if (!d) return;
    setRegisterStatus(prev => ({ ...prev, [id]: { loading: true } }));
    try {
      const result = await registerDomain(d.domain);
      setRegisterStatus(prev => ({ ...prev, [id]: result }));
    } catch {
      setRegisterStatus(prev => ({ ...prev, [id]: { ok: false } }));
    }
  }

  function handleDelete(id) {
    setDomains(domains.filter(d => d.id !== id));
    if (expandedId === id) setExpandedId(null);
  }

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Custom Domains</h1>
          <p className="text-sm text-gray-500 mt-1">
            Host your return portal on your own branded subdomain, e.g.{' '}
            <span className="font-mono text-gray-700">returns.mystore.com</span>.
          </p>
        </div>
        <button
          onClick={() => { setShowAddForm(true); setInputError(''); }}
          className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors flex items-center gap-2 shrink-0"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
          Add Domain
        </button>
      </div>

      {/* Add domain modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="font-bold text-gray-900">Add Custom Domain</h2>
              <button onClick={() => setShowAddForm(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Domain or Subdomain</label>
                <input
                  type="text"
                  value={inputDomain}
                  onChange={e => { setInputDomain(e.target.value); setInputError(''); }}
                  onKeyDown={e => e.key === 'Enter' && handleAdd()}
                  placeholder="returns.mystore.com"
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  autoFocus
                />
                {inputError && <p className="text-xs text-red-600 mt-1">{inputError}</p>}
                <p className="text-xs text-gray-400 mt-1.5">
                  Enter a subdomain you control. You'll configure DNS in the next step.
                </p>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex gap-3 justify-end">
              <button onClick={() => setShowAddForm(false)} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50">Cancel</button>
              <button
                onClick={handleAdd}
                disabled={!inputDomain.trim()}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white rounded-lg text-sm font-semibold transition-colors"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {domains.length === 0 && !showAddForm && (
        <div className="bg-white border border-dashed border-gray-300 rounded-2xl p-10 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-indigo-50 mb-3">
            <svg className="w-6 h-6 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064" />
            </svg>
          </div>
          <p className="font-semibold text-gray-900">No custom domains yet</p>
          <p className="text-sm text-gray-500 mt-1">Add a subdomain to brand your return portal.</p>
          <button
            onClick={() => setShowAddForm(true)}
            className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors"
          >
            Add Your First Domain
          </button>
        </div>
      )}

      {/* Domain cards */}
      <div className="space-y-3">
        {domains.map(d => {
          const isExpanded = expandedId === d.id;
          const regStatus = registerStatus[d.id];
          return (
            <div key={d.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              {/* Header row */}
              <div className="flex items-center gap-3 px-5 py-4">
                <button
                  onClick={() => setExpandedId(isExpanded ? null : d.id)}
                  className="flex-1 flex items-center gap-3 text-left min-w-0"
                >
                  <svg className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  <span className="font-mono font-semibold text-gray-900 text-sm truncate">{d.domain}</span>
                </button>
                <StatusBadge status={d.status} />
                <div className="flex items-center gap-2 shrink-0">
                  {(d.status === 'pending' || d.status === 'failed') && (
                    <button
                      onClick={() => handleVerify(d.id)}
                      className="text-xs text-indigo-600 hover:text-indigo-700 border border-indigo-200 px-2.5 py-1.5 rounded-lg font-medium transition-colors"
                    >
                      Verify DNS
                    </button>
                  )}
                  {d.status === 'verifying' && (
                    <span className="text-xs text-blue-600 flex items-center gap-1">
                      <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                      </svg>
                      Checking…
                    </span>
                  )}
                  <button
                    onClick={() => handleDelete(d.id)}
                    className="text-xs text-red-500 hover:text-red-600 border border-red-200 px-2.5 py-1.5 rounded-lg transition-colors"
                  >
                    Remove
                  </button>
                </div>
              </div>

              {/* Expanded instructions */}
              {isExpanded && (
                <div className="border-t border-gray-100 px-5 py-5 bg-gray-50 space-y-5">
                  {d.status === 'active' ? (
                    <div className="flex items-start gap-3 bg-green-50 border border-green-200 rounded-xl p-4">
                      <svg className="w-5 h-5 text-green-600 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                      <div>
                        <p className="text-sm font-semibold text-green-800">Domain verified and active</p>
                        <p className="text-sm text-green-700 mt-0.5">
                          Your return portal is live at{' '}
                          <a href={`https://${d.domain}`} target="_blank" rel="noopener noreferrer"
                            className="font-mono font-semibold underline">
                            https://{d.domain}
                          </a>
                        </p>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Step 1: DNS */}
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center shrink-0">1</div>
                          <p className="text-sm font-semibold text-gray-800">Add DNS records at your domain provider</p>
                        </div>
                        <p className="text-sm text-gray-500 mb-4 ml-8">
                          Log in to Cloudflare, GoDaddy, Namecheap, etc. and add these records for{' '}
                          <span className="font-mono font-semibold text-gray-700">{d.domain}</span>:
                        </p>

                        <div className="overflow-x-auto rounded-xl border border-gray-200 mb-4 ml-8">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="bg-gray-100 text-left">
                                <th className="px-4 py-2.5 text-xs font-semibold text-gray-600 uppercase tracking-wider">Type</th>
                                <th className="px-4 py-2.5 text-xs font-semibold text-gray-600 uppercase tracking-wider">Name / Host</th>
                                <th className="px-4 py-2.5 text-xs font-semibold text-gray-600 uppercase tracking-wider">Value</th>
                                <th className="px-4 py-2.5 text-xs font-semibold text-gray-600 uppercase tracking-wider">TTL</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 bg-white font-mono">
                              <tr>
                                <td className="px-4 py-3"><span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded font-semibold">CNAME</span></td>
                                <td className="px-4 py-3 text-xs text-gray-700">{d.domain}</td>
                                <td className="px-4 py-3 text-xs text-gray-700">{cnameTarget}</td>
                                <td className="px-4 py-3 text-xs text-gray-500">Auto</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>

                        <div className="ml-8">
                          <CopyField label="CNAME Value (point your domain here)" value={cnameTarget} />
                        </div>
                      </div>

                      {/* Step 2: Railway dashboard */}
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center shrink-0">2</div>
                          <p className="text-sm font-semibold text-gray-800">Add the domain in your Railway service</p>
                        </div>

                        {regStatus?.loading ? (
                          <div className="ml-8 flex items-center gap-2 text-sm text-blue-600">
                            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                            </svg>
                            Registering with Railway…
                          </div>
                        ) : regStatus?.ok ? (
                          <div className="ml-8 flex items-start gap-2 bg-green-50 border border-green-200 rounded-xl p-3">
                            <svg className="w-4 h-4 text-green-600 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                            </svg>
                            <p className="text-sm text-green-700">Automatically registered with Railway. Once DNS propagates, your domain will work.</p>
                          </div>
                        ) : (
                          <div className="ml-8 space-y-3">
                            {/* Not configured = missing RAILWAY_API_TOKEN */}
                            {regStatus && !regStatus.railwayConfigured ? (
                              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                                <p className="text-sm font-semibold text-amber-800 mb-1">One-time setup needed</p>
                                <p className="text-sm text-amber-700 mb-3">
                                  Add <code className="bg-amber-100 px-1.5 py-0.5 rounded font-mono text-xs">RAILWAY_API_TOKEN</code> to your Railway service environment variables. After that, every new merchant domain registers automatically — no manual steps ever again.
                                </p>
                                <ol className="text-sm text-amber-700 space-y-1 list-none mb-3">
                                  <li className="flex items-start gap-2"><span className="font-bold shrink-0">1.</span> Go to <a href="https://railway.app/account/tokens" target="_blank" rel="noopener noreferrer" className="underline font-semibold">railway.app/account/tokens</a> → create a token</li>
                                  <li className="flex items-start gap-2"><span className="font-bold shrink-0">2.</span> In your Railway service → <strong>Variables</strong> → add <code className="bg-amber-100 px-1 rounded font-mono text-xs">RAILWAY_API_TOKEN = your-token</code></li>
                                  <li className="flex items-start gap-2"><span className="font-bold shrink-0">3.</span> Redeploy — all future domains register automatically</li>
                                </ol>
                                <p className="text-xs text-amber-600 mb-3">Until then, add this domain manually in Railway dashboard:</p>
                                <ol className="text-sm text-amber-700 space-y-1 list-none mb-3">
                                  <li className="flex items-start gap-2"><span className="font-bold shrink-0">→</span> Railway project → service → Settings → Networking → Custom Domains → <strong>+ {d.domain}</strong></li>
                                </ol>
                                <div className="flex items-center gap-3">
                                  <a href="https://railway.app/dashboard" target="_blank" rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 bg-amber-700 hover:bg-amber-800 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-colors">
                                    Open Railway Dashboard
                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                    </svg>
                                  </a>
                                  <button onClick={() => handleReregister(d.id)} className="text-xs text-amber-700 underline hover:text-amber-900">
                                    Try auto-register again
                                  </button>
                                </div>
                              </div>
                            ) : regStatus?.error ? (
                              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                                <p className="text-sm font-semibold text-red-800 mb-1">Railway registration failed</p>
                                <p className="text-sm text-red-700 mb-2">{regStatus.error}</p>
                                <button onClick={() => handleReregister(d.id)} className="text-xs text-red-700 underline hover:text-red-900">
                                  Try again
                                </button>
                              </div>
                            ) : (
                              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                                <p className="text-sm text-gray-500">Registering with Railway…</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Step 3: Verify */}
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center shrink-0">3</div>
                          <p className="text-sm font-semibold text-gray-800">Verify DNS and activate</p>
                        </div>
                        <div className="ml-8 space-y-3">
                          {d.status === 'failed' && (
                            <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4">
                              <svg className="w-5 h-5 text-red-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <div>
                                <p className="text-sm font-semibold text-red-800">DNS not detected yet</p>
                                <p className="text-sm text-red-700 mt-0.5">Make sure the CNAME record is saved and Railway has the domain added. DNS can take up to 48 hours.</p>
                              </div>
                            </div>
                          )}
                          <p className="text-sm text-gray-500">
                            Once you've added the DNS record and added the domain in Railway, click the button to verify.
                          </p>
                          <button
                            onClick={() => handleVerify(d.id)}
                            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Verify DNS
                          </button>
                          <p className="text-xs text-gray-400">DNS propagation can take up to 48 hours.</p>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
