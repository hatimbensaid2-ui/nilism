import { useState, useRef } from 'react';
import { useMerchant } from '../MerchantContext';
import { verifyDomain } from '../../utils/returnsApi';
import { DEFAULT_MERCHANT_CONFIG } from '../../data/mockOrders';

function CopyBlock({ label, value, mono = true }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }
  return (
    <div>
      <p className="text-xs font-medium text-gray-500 mb-1.5">{label}</p>
      <div className="flex items-start gap-2">
        <pre className={`flex-1 text-xs bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-gray-800 overflow-x-auto whitespace-pre-wrap break-all ${mono ? 'font-mono' : ''}`}>
          {value}
        </pre>
        <button
          type="button"
          onClick={copy}
          className="shrink-0 flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg border transition-colors border-gray-300 text-gray-600 hover:border-indigo-400 hover:text-indigo-600 mt-0.5"
        >
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
      <p className="text-xs font-medium text-gray-500 mb-1">{label}</p>
      <div className="flex items-center gap-2">
        <code className="flex-1 text-xs bg-white border border-gray-200 rounded-lg px-3 py-2 font-mono text-gray-700 truncate">{value}</code>
        <button
          type="button"
          onClick={copy}
          className="shrink-0 flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg border border-gray-300 text-gray-600 hover:border-indigo-400 hover:text-indigo-600 transition-colors"
        >
          {copied
            ? <><svg className="w-3.5 h-3.5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg><span className="text-emerald-600">Copied</span></>
            : <><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>Copy</>
          }
        </button>
      </div>
    </div>
  );
}

const PRESET_COLORS = [
  '#4f46e5', '#7c3aed', '#db2777', '#dc2626',
  '#ea580c', '#ca8a04', '#16a34a', '#0891b2',
];

const FONTS = [
  { value: 'Inter', label: 'Inter' },
  { value: 'Plus Jakarta Sans', label: 'Plus Jakarta Sans' },
  { value: 'Lato', label: 'Lato' },
  { value: 'Poppins', label: 'Poppins' },
  { value: 'Roboto', label: 'Roboto' },
];

const PLATFORM_HOST = 'nilism-production-1996.up.railway.app';

function generateToken() {
  return 'returns-verify=' + Math.random().toString(36).slice(2, 18);
}

function parseDomain(raw) {
  return raw.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '');
}

export default function PortalSettings() {
  const { config, updateStore, setDomains, setRefundConfig } = useMerchant();
  const [form, setForm] = useState({ ...config.store });
  const [saved, setSaved] = useState(false);
  const [logoPreview, setLogoPreview] = useState(form.logoData || form.logoUrl || '');
  const [logoUploading, setLogoUploading] = useState(false);
  const fileRef = useRef(null);

  // Domain state
  const domains = config.domains || [];
  const [showAddDomain, setShowAddDomain] = useState(false);
  const [inputDomain, setInputDomain] = useState('');
  const [inputError, setInputError] = useState('');
  const [expandedDomain, setExpandedDomain] = useState(null);

  function handleAddDomain() {
    const domain = parseDomain(inputDomain);
    if (!domain) { setInputError('Please enter a domain or subdomain.'); return; }
    if (!/^[a-z0-9]([a-z0-9-]*\.)+[a-z]{2,}$/.test(domain)) {
      setInputError('Enter a valid domain, e.g. returns.mystore.com');
      return;
    }
    if (domains.find(d => d.domain === domain)) { setInputError('This domain is already added.'); return; }
    const nd = { id: 'dom-' + Date.now(), domain, token: generateToken(), status: 'pending', addedAt: new Date().toISOString() };
    setDomains([...domains, nd]);
    setExpandedDomain(nd.id);
    setShowAddDomain(false);
    setInputDomain('');
    setInputError('');
  }

  async function handleVerifyDomain(id) {
    const dom = domains.find(d => d.id === id);
    if (!dom) return;
    setDomains(domains.map(d => d.id === id ? { ...d, status: 'verifying' } : d));
    try {
      const result = await verifyDomain(dom.domain, dom.token);
      setDomains(prev => prev.map(d => d.id === id
        ? { ...d, status: result.verified ? 'active' : 'failed', checkResult: { cname: result.cname, txt: result.txt } }
        : d
      ));
    } catch {
      setDomains(prev => prev.map(d => d.id === id ? { ...d, status: 'failed' } : d));
    }
  }

  function handleRemoveDomain(id) {
    setDomains(domains.filter(d => d.id !== id));
    if (expandedDomain === id) setExpandedDomain(null);
  }

  function f(key) {
    return e => setForm(p => ({ ...p, [key]: e.target.value }));
  }

  function handleLogoFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return;
    setLogoUploading(true);
    const reader = new FileReader();
    reader.onload = ev => {
      const data = ev.target.result;
      setLogoPreview(data);
      setForm(p => ({ ...p, logoData: data, logoUrl: '' }));
      setLogoUploading(false);
    };
    reader.readAsDataURL(file);
  }

  function removeLogo() {
    setLogoPreview('');
    setForm(p => ({ ...p, logoData: '', logoUrl: '' }));
    if (fileRef.current) fileRef.current.value = '';
  }

  function handleSave(e) {
    e.preventDefault();
    updateStore(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  const previewLogo = logoPreview;
  const previewColor = form.primaryColor || '#4f46e5';

  // Portal URL = active custom domain (if any) or the app root (/), always with ?shop=
  // The customer portal lives at / not /merchant
  const shopParam = new URLSearchParams(window.location.search).get('shop');
  const activeDomain = config.domains.find(d => d.status === 'active');
  const portalBase = activeDomain
    ? `https://${activeDomain.domain}`
    : window.location.origin; // just the origin — customer portal is at /
  const portalUrl = shopParam ? `${portalBase}/?shop=${encodeURIComponent(shopParam)}` : portalBase;

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Portal Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Customise what customers see when they visit your return portal.</p>
      </div>

      {/* ── Portal Link ── */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-5 mb-5 space-y-3">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-indigo-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
          <h3 className="text-sm font-semibold text-indigo-800">Customer Portal Link</h3>
          <a
            href={portalUrl}
            target="_blank"
            rel="noreferrer"
            className="ml-auto flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
          >
            Open portal
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>

        <p className="text-xs text-indigo-700">
          Share this link with your customers — they'll use it to start a return.
          {activeDomain
            ? <> Now using your custom domain <span className="font-mono font-semibold">{activeDomain.domain}</span>.</>
            : <> Add a custom domain below to replace this URL with your own brand.</>
          }
        </p>

        <CopyBlock label="Portal URL" value={portalUrl} />
      </div>

      <form onSubmit={handleSave} className="space-y-5">

        {/* ── Logo & Store Name ── */}
        <Section title="Branding">
          {/* Logo upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Store Logo</label>
            <div className="flex items-start gap-4">
              {/* Preview box */}
              <div className="w-24 h-24 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 flex items-center justify-center overflow-hidden shrink-0">
                {previewLogo ? (
                  <img src={previewLogo} alt="logo" className="w-full h-full object-contain p-1" />
                ) : (
                  <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                )}
              </div>
              <div className="flex-1 space-y-2">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleLogoFile}
                />
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={logoUploading}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  {logoUploading ? (
                    <>
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                      </svg>
                      Uploading...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/>
                      </svg>
                      Upload Logo
                    </>
                  )}
                </button>
                {previewLogo && (
                  <button
                    type="button"
                    onClick={removeLogo}
                    className="w-full px-4 py-2 border border-red-200 text-red-500 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors"
                  >
                    Remove Logo
                  </button>
                )}
                <p className="text-xs text-gray-400">PNG, JPG, SVG — max 2MB. Displayed in portal header.</p>
              </div>
            </div>
          </div>

          {/* Or paste URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Or paste logo URL</label>
            <input
              value={form.logoUrl}
              onChange={e => {
                setForm(p => ({ ...p, logoUrl: e.target.value, logoData: '' }));
                setLogoPreview(e.target.value);
              }}
              placeholder="https://cdn.mystore.com/logo.png"
              className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Store Name</label>
            <input
              value={form.name}
              onChange={f('name')}
              placeholder="My Store"
              className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-400 mt-1">Shown as text when no logo is uploaded.</p>
          </div>
        </Section>

        {/* ── Colors ── */}
        <Section title="Colors">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Primary / Button Color</label>
            <div className="flex items-center gap-2 flex-wrap">
              {PRESET_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setForm(p => ({ ...p, primaryColor: c }))}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${form.primaryColor === c ? 'border-gray-900 scale-110 shadow' : 'border-transparent hover:scale-105'}`}
                  style={{ backgroundColor: c }}
                  title={c}
                />
              ))}
              <input
                type="color"
                value={form.primaryColor}
                onChange={f('primaryColor')}
                className="w-8 h-8 rounded cursor-pointer border border-gray-300"
                title="Custom color"
              />
              <span className="text-sm font-mono text-gray-500">{form.primaryColor}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Page Background</label>
              <div className="flex items-center gap-2">
                <input type="color" value={form.bgColor || '#f9fafb'} onChange={f('bgColor')}
                  className="w-9 h-9 rounded cursor-pointer border border-gray-300" />
                <input value={form.bgColor || '#f9fafb'} onChange={f('bgColor')}
                  className="flex-1 px-2.5 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Header Background</label>
              <div className="flex items-center gap-2">
                <input type="color" value={form.headerBg || '#ffffff'} onChange={f('headerBg')}
                  className="w-9 h-9 rounded cursor-pointer border border-gray-300" />
                <input value={form.headerBg || '#ffffff'} onChange={f('headerBg')}
                  className="flex-1 px-2.5 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
            </div>
          </div>
        </Section>

        {/* ── Typography ── */}
        <Section title="Typography">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Font Family</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {FONTS.map(font => (
                <button
                  key={font.value}
                  type="button"
                  onClick={() => setForm(p => ({ ...p, fontFamily: font.value }))}
                  className={`px-3 py-2.5 rounded-lg border text-sm transition-all ${
                    form.fontFamily === font.value
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700 font-semibold'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                  style={{ fontFamily: font.value }}
                >
                  {font.label}
                </button>
              ))}
            </div>
          </div>
        </Section>

        {/* ── Messaging ── */}
        <Section title="Customer Messaging">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Welcome Message</label>
            <input value={form.welcomeMessage} onChange={f('welcomeMessage')}
              placeholder="We make returns easy."
              className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Return Policy Text</label>
            <textarea value={form.policyText} onChange={f('policyText')} rows={3}
              placeholder="Items must be unworn and in original packaging..."
              className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Return Policy URL</label>
            <input
              type="url"
              value={form.policyUrl || ''}
              onChange={f('policyUrl')}
              placeholder="https://yourstore.com/policies/refund-policy"
              className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-400 mt-1">Customers will see a &ldquo;View policy here&rdquo; link that opens this URL.</p>
          </div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={form.showPolicyOnLookup !== false}
              onChange={e => setForm(p => ({ ...p, showPolicyOnLookup: e.target.checked }))}
              className="w-4 h-4 rounded text-indigo-600 border-gray-300 focus:ring-indigo-500" />
            <span className="text-sm text-gray-700">Show policy link on the order lookup page</span>
          </label>
        </Section>

        {/* ── Return Policy ── */}
        <Section title="Return Policy">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Return Window</label>
              <div className="flex items-center gap-2">
                <input type="number" min="1" max="365" value={form.returnWindowDays} onChange={f('returnWindowDays')}
                  className="w-20 px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                <span className="text-sm text-gray-500">days after delivery</span>
              </div>
              <p className="text-xs text-gray-400 mt-1">Orders not yet delivered or past this window will show as ineligible.</p>
            </div>
          </div>
        </Section>

        {/* ── Refund Options ── */}
        <Section title="Refund & Exchange Options">
          {(() => {
            const refund = config.refund || DEFAULT_MERCHANT_CONFIG.refund;
            return (
              <div className="space-y-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={!!refund.offerStoreCredit}
                    onChange={e => setRefundConfig({ offerStoreCredit: e.target.checked })}
                    className="w-4 h-4 rounded text-indigo-600 border-gray-300 focus:ring-indigo-500" />
                  <div>
                    <span className="text-sm font-medium text-gray-700">Offer store credit</span>
                    {refund.offerStoreCredit && (
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-gray-500">Bonus:</span>
                        <input type="number" min="0" max="100" value={refund.storeCreditBonusPct || 0}
                          onChange={e => setRefundConfig({ storeCreditBonusPct: parseInt(e.target.value) || 0 })}
                          className="w-16 px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                        <span className="text-xs text-gray-500">% bonus on store credit</span>
                      </div>
                    )}
                  </div>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={!!refund.offerExchange}
                    onChange={e => setRefundConfig({ offerExchange: e.target.checked })}
                    className="w-4 h-4 rounded text-indigo-600 border-gray-300 focus:ring-indigo-500" />
                  <div>
                    <span className="text-sm font-medium text-gray-700">Offer exchange for another size/color</span>
                    {refund.offerExchange && (
                      <div className="mt-2">
                        <p className="text-xs text-gray-500 mb-1.5">Exchange fulfillment mode</p>
                        <div className="flex gap-2">
                          {['auto', 'manual'].map(mode => (
                            <button key={mode} type="button"
                              onClick={() => setRefundConfig({ exchangeMode: mode })}
                              className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                                (refund.exchangeMode || 'manual') === mode
                                  ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                                  : 'border-gray-200 text-gray-600 hover:border-gray-300'
                              }`}
                            >
                              {mode === 'auto' ? 'Auto (create order automatically)' : 'Manual (merchant reviews first)'}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </label>
              </div>
            );
          })()}
        </Section>

        {/* ── Live Preview ── */}
        <Section title="Live Preview">
          <div className="rounded-xl overflow-hidden border border-gray-200 shadow-sm">
            {/* Header preview */}
            <div
              className="px-4 py-3 flex items-center justify-center border-b border-gray-200"
              style={{ backgroundColor: form.headerBg || '#ffffff' }}
            >
              {previewLogo ? (
                <img src={previewLogo} alt="logo" className="h-8 object-contain" onError={() => {}} />
              ) : (
                <span className="font-bold text-gray-900" style={{ fontFamily: form.fontFamily }}>
                  {form.name || 'My Store'}
                </span>
              )}
            </div>
            {/* Body preview */}
            <div
              className="px-6 py-8 text-center"
              style={{ backgroundColor: form.bgColor || '#f9fafb', fontFamily: form.fontFamily }}
            >
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full mb-3"
                style={{ backgroundColor: previewColor + '20' }}>
                <svg className="w-6 h-6" style={{ color: previewColor }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                    d="M3 10h2l1 2h13l1-4H6M7 18a1 1 0 100 2 1 1 0 000-2zm10 0a1 1 0 100 2 1 1 0 000-2z" />
                </svg>
              </div>
              <p className="font-bold text-gray-900 text-base mb-1" style={{ fontFamily: form.fontFamily }}>
                {form.welcomeMessage || 'Returns Center'}
              </p>
              {form.showPolicyOnLookup !== false && form.policyText && (
                <p className="text-xs text-gray-500 mb-4 max-w-xs mx-auto">{form.policyText}</p>
              )}
              <div className="space-y-2.5 text-left bg-white rounded-xl border border-gray-200 p-4 mt-3">
                <div className="h-8 bg-gray-100 rounded-md w-full" />
                <div className="h-8 bg-gray-100 rounded-md w-full" />
                <div className="w-full py-2.5 rounded-lg text-center text-sm font-semibold"
                  style={{ backgroundColor: previewColor, color: form.buttonTextColor || '#fff' }}>
                  Find My Order
                </div>
              </div>
            </div>
          </div>
        </Section>

        <div className="flex items-center gap-3 pt-1">
          <button
            type="submit"
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6 py-2.5 rounded-lg text-sm transition-colors"
          >
            Save Settings
          </button>
          {saved && (
            <span className="text-sm text-green-600 font-medium flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
              Saved!
            </span>
          )}
        </div>
      </form>

      {/* ── Custom Domain ── */}
      <div className="mt-6">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-base font-semibold text-gray-900">Custom Domain</h3>
            <p className="text-sm text-gray-500 mt-0.5">
              Host your return portal on your own branded subdomain, e.g.{' '}
              <span className="font-mono text-gray-700">returns.mystore.com</span>.
            </p>
          </div>
          <button
            onClick={() => { setShowAddDomain(true); setInputError(''); }}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors flex items-center gap-2 shrink-0"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            Add Domain
          </button>
        </div>

        {/* Add domain modal */}
        {showAddDomain && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowAddDomain(false)}>
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <h2 className="font-bold text-gray-900">Add Custom Domain</h2>
                <button onClick={() => setShowAddDomain(false)} className="text-gray-400 hover:text-gray-600">
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
                    onKeyDown={e => e.key === 'Enter' && handleAddDomain()}
                    placeholder="returns.mystore.com"
                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    autoFocus
                  />
                  {inputError && <p className="text-xs text-red-600 mt-1">{inputError}</p>}
                  <p className="text-xs text-gray-400 mt-1.5">Enter a subdomain you control. You'll add DNS records in the next step.</p>
                </div>
              </div>
              <div className="px-6 py-4 border-t border-gray-200 flex gap-3 justify-end">
                <button onClick={() => setShowAddDomain(false)} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50">Cancel</button>
                <button
                  onClick={handleAddDomain}
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
        {domains.length === 0 && !showAddDomain && (
          <div className="bg-white border border-dashed border-gray-300 rounded-2xl p-8 text-center">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-indigo-50 mb-3">
              <svg className="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                  d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
              </svg>
            </div>
            <p className="font-semibold text-gray-900 text-sm">No custom domain yet</p>
            <p className="text-xs text-gray-500 mt-1">Add a subdomain to use as your branded return portal URL.</p>
            <button onClick={() => setShowAddDomain(true)} className="mt-3 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
              Add Domain
            </button>
          </div>
        )}

        {/* Domain cards */}
        <div className="space-y-3">
          {domains.map(d => {
            const isExpanded = expandedDomain === d.id;
            const statusMap = {
              pending:   { label: 'Pending DNS',  cls: 'bg-yellow-100 text-yellow-700' },
              verifying: { label: 'Verifying…',   cls: 'bg-blue-100 text-blue-700' },
              active:    { label: 'Active',        cls: 'bg-green-100 text-green-700' },
              failed:    { label: 'Check Failed',  cls: 'bg-red-100 text-red-700' },
            };
            const st = statusMap[d.status] || statusMap.pending;
            return (
              <div key={d.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <div className="flex items-center gap-3 px-5 py-4">
                  <button
                    onClick={() => setExpandedDomain(isExpanded ? null : d.id)}
                    className="flex-1 flex items-center gap-3 text-left min-w-0"
                  >
                    <svg className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    <span className="font-mono font-semibold text-gray-900 text-sm truncate">{d.domain}</span>
                  </button>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${st.cls}`}>{st.label}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    {(d.status === 'pending' || d.status === 'failed') && (
                      <button onClick={() => handleVerifyDomain(d.id)}
                        className="text-xs text-indigo-600 hover:text-indigo-700 border border-indigo-200 px-2.5 py-1.5 rounded-lg font-medium transition-colors">
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
                    <button onClick={() => handleRemoveDomain(d.id)}
                      className="text-xs text-red-500 hover:text-red-600 border border-red-200 px-2.5 py-1.5 rounded-lg transition-colors">
                      Remove
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-gray-100 px-5 py-5 bg-gray-50 space-y-4">
                    {d.status === 'active' ? (
                      <div className="flex items-start gap-3 bg-green-50 border border-green-200 rounded-xl p-4">
                        <svg className="w-5 h-5 text-green-600 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                        <div>
                          <p className="text-sm font-semibold text-green-800">Domain verified and active</p>
                          <p className="text-sm text-green-700 mt-0.5">
                            Your return portal is live at{' '}
                            <a href={`https://${d.domain}`} target="_blank" rel="noreferrer" className="font-mono font-semibold underline">
                              https://{d.domain}
                            </a>
                          </p>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="text-sm font-semibold text-gray-800">Add these DNS records at your provider</p>
                        <div className="overflow-x-auto rounded-xl border border-gray-200">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="bg-gray-100 text-left">
                                {['Type', 'Name / Host', 'Value', 'TTL'].map(h => (
                                  <th key={h} className="px-4 py-2.5 text-xs font-semibold text-gray-600 uppercase tracking-wider">{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 bg-white font-mono">
                              <tr>
                                <td className="px-4 py-3"><span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded font-semibold">CNAME</span></td>
                                <td className="px-4 py-3 text-xs text-gray-700">{d.domain}</td>
                                <td className="px-4 py-3 text-xs text-gray-700">{PLATFORM_HOST}</td>
                                <td className="px-4 py-3 text-xs text-gray-500">3600</td>
                              </tr>
                              <tr>
                                <td className="px-4 py-3"><span className="bg-purple-100 text-purple-700 text-xs px-2 py-0.5 rounded font-semibold">TXT</span></td>
                                <td className="px-4 py-3 text-xs text-gray-700">_verify-returns.{d.domain}</td>
                                <td className="px-4 py-3 text-xs text-gray-700 max-w-xs truncate">{d.token}</td>
                                <td className="px-4 py-3 text-xs text-gray-500">3600</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                        <div className="space-y-2.5">
                          <CopyField label="CNAME Value" value={PLATFORM_HOST} />
                          <CopyField label="TXT Record Name" value={`_verify-returns.${d.domain}`} />
                          <CopyField label="TXT Record Value" value={d.token} />
                        </div>
                        {d.status === 'failed' && (
                          <div className="bg-red-50 border border-red-200 rounded-xl p-3 space-y-1.5">
                            <p className="text-xs font-semibold text-red-700">DNS check failed — records not detected yet:</p>
                            <div className="flex items-center gap-2">
                              {d.checkResult?.cname
                                ? <svg className="w-3.5 h-3.5 text-green-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/></svg>
                                : <svg className="w-3.5 h-3.5 text-red-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12"/></svg>
                              }
                              <span className="text-xs text-red-700 font-mono">CNAME → {PLATFORM_HOST}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              {d.checkResult?.txt
                                ? <svg className="w-3.5 h-3.5 text-green-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/></svg>
                                : <svg className="w-3.5 h-3.5 text-red-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12"/></svg>
                              }
                              <span className="text-xs text-red-700 font-mono">TXT _verify-returns.{d.domain}</span>
                            </div>
                          </div>
                        )}
                        <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-xl p-3">
                          <svg className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20 10 10 0 000-20z" />
                          </svg>
                          <p className="text-xs text-blue-700">DNS changes can take up to <strong>48 hours</strong> to propagate. Click <strong>Verify DNS</strong> once your records are added.</p>
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
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{title}</h3>
      {children}
    </div>
  );
}
