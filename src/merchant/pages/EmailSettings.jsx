import { useState, useRef } from 'react';
import { useMerchant } from '../MerchantContext';
import { sendKlaviyoEvent } from '../../utils/klaviyo';

const FLOW_META = [
  { id: 'return_submitted',  label: 'Return Submitted',  colorCls: 'bg-indigo-100 text-indigo-700',  desc: 'Sent when a customer submits a return request.' },
  { id: 'return_approved',   label: 'Return Approved',   colorCls: 'bg-emerald-100 text-emerald-700', desc: 'Sent when the merchant approves the return.' },
  { id: 'tracking_received', label: 'Tracking Received', colorCls: 'bg-blue-100 text-blue-700',       desc: 'Sent when the customer uploads a tracking number.' },
  { id: 'items_received',    label: 'Items Received',    colorCls: 'bg-violet-100 text-violet-700',   desc: 'Sent when items arrive at the warehouse.' },
  { id: 'refund_processed',  label: 'Refund Processed',  colorCls: 'bg-green-100 text-green-700',     desc: 'Sent when the refund is issued.' },
  { id: 'return_rejected',   label: 'Return Rejected',   colorCls: 'bg-red-100 text-red-700',         desc: 'Sent when a return is rejected.' },
  { id: 'photo_requested',   label: 'Photo Requested',   colorCls: 'bg-amber-100 text-amber-700',     desc: 'Sent when the merchant requests photos from the customer.' },
];

const VARIABLES = [
  { v: '{{customer_name}}',  desc: "Customer's full name" },
  { v: '{{rma}}',            desc: 'RMA number' },
  { v: '{{order_number}}',   desc: 'Order number' },
  { v: '{{refund_amount}}',  desc: 'Refund amount ($)' },
  { v: '{{store_name}}',     desc: 'Your store name' },
  { v: '{{portal_url}}',     desc: 'Link to return portal' },
];

function applyVars(text, store) {
  return (text || '')
    .replace(/\{\{customer_name\}\}/g, 'Alex Johnson')
    .replace(/\{\{rma\}\}/g, 'RMA-A1B2C3')
    .replace(/\{\{order_number\}\}/g, '#1001')
    .replace(/\{\{refund_amount\}\}/g, '89.99')
    .replace(/\{\{store_name\}\}/g, store?.name || 'My Store')
    .replace(/\{\{portal_url\}\}/g, 'https://returns.yourstore.com');
}

function EmailPreview({ tpl, store, emailBranding }) {
  const primaryColor = store?.primaryColor || '#4f46e5';
  const storeName = store?.name || 'My Store';
  const subject = applyVars(tpl?.subject, store) || '(subject line)';
  const body = applyVars(tpl?.body, store) || '';
  const ctaText = tpl?.ctaText || 'View Return';
  const showHeader = emailBranding?.showHeader !== false;
  // Email logo: email-specific first, then portal logo, then text
  const emailLogo = emailBranding?.logoData || emailBranding?.logoUrl || store?.logoData || store?.logoUrl || '';

  return (
    <div className="rounded-xl overflow-hidden border border-slate-200 shadow-sm bg-slate-100">
      {/* Mock email client chrome */}
      <div className="bg-slate-200 px-3 py-2 flex items-center gap-2">
        <div className="flex gap-1">
          <div className="w-2 h-2 rounded-full bg-red-400" />
          <div className="w-2 h-2 rounded-full bg-amber-400" />
          <div className="w-2 h-2 rounded-full bg-emerald-400" />
        </div>
        <div className="flex-1 bg-white rounded px-2 py-0.5 text-[10px] text-slate-500 truncate font-medium">
          {subject}
        </div>
      </div>

      {/* Email body */}
      <div className="bg-slate-100 p-3">
        <div className="bg-white rounded-lg overflow-hidden shadow-sm">

          {/* Header — togglable colored bar */}
          {showHeader && (
            <div className="px-6 py-4 text-center" style={{ backgroundColor: primaryColor }}>
              {emailLogo ? (
                <img src={emailLogo} alt={storeName} className="h-8 mx-auto object-contain" />
              ) : (
                <span className="text-white font-bold text-base tracking-tight">{storeName}</span>
              )}
            </div>
          )}

          {/* Logo-only row when header is hidden but a logo is set */}
          {!showHeader && emailLogo && (
            <div className="px-6 pt-5 pb-2 text-center border-b border-slate-100">
              <img src={emailLogo} alt={storeName} className="h-10 mx-auto object-contain" />
            </div>
          )}

          {/* Body */}
          <div className="px-5 py-4">
            {body ? (
              <p className="text-xs text-slate-700 whitespace-pre-line leading-relaxed">{body}</p>
            ) : (
              <p className="text-xs text-slate-300 italic">Email body will appear here…</p>
            )}
            {ctaText && (
              <div className="mt-4 text-center">
                <span
                  className="inline-block px-4 py-2 rounded-lg text-xs font-semibold text-white"
                  style={{ backgroundColor: primaryColor }}
                >
                  {ctaText}
                </span>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 text-center">
            <p className="text-[10px] text-slate-400">{storeName} · <span className="underline">Unsubscribe</span></p>
          </div>
        </div>
      </div>
    </div>
  );
}

function FlowEditor({ meta, ev, tpl, expanded, onToggleExpand, onToggleEvent, onUpdateTemplate, store, emailBranding }) {
  function insertVar(v) {
    onUpdateTemplate('body', (tpl?.body || '') + v);
  }

  return (
    <div className={`border rounded-xl overflow-hidden transition-all ${expanded ? 'border-indigo-300 shadow-md' : 'border-slate-200'}`}>
      {/* Flow header row */}
      <button
        type="button"
        onClick={onToggleExpand}
        className={`w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors ${expanded ? 'bg-indigo-50' : 'bg-white hover:bg-slate-50'}`}
      >
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${meta.colorCls}`}>{meta.label}</span>
        <span className="flex-1 text-xs text-slate-500 hidden sm:block">{meta.desc}</span>
        <div className="flex items-center gap-3 shrink-0" onClick={e => e.stopPropagation()}>
          <Toggle checked={ev.enabled} onChange={onToggleEvent} />
        </div>
        <svg className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Expanded editor */}
      {expanded && (
        <div className="border-t border-slate-200 grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
          {/* Left: editor */}
          <div className="p-5 space-y-4 bg-white">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">Subject Line</label>
              <input
                type="text"
                value={tpl?.subject || ''}
                onChange={e => onUpdateTemplate('subject', e.target.value)}
                placeholder="e.g. Your return {{rma}} has been submitted"
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">Preview Text</label>
              <input
                type="text"
                value={tpl?.previewText || ''}
                onChange={e => onUpdateTemplate('previewText', e.target.value)}
                placeholder="Short teaser shown in inbox before the email is opened"
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">Email Body</label>
              <textarea
                value={tpl?.body || ''}
                onChange={e => onUpdateTemplate('body', e.target.value)}
                rows={7}
                placeholder="Write your email message here. Use variables like {{customer_name}} to personalise."
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">Button Text</label>
              <input
                type="text"
                value={tpl?.ctaText || ''}
                onChange={e => onUpdateTemplate('ctaText', e.target.value)}
                placeholder="e.g. View Return Status"
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            {/* Variable chips */}
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Insert Variable</p>
              <div className="flex flex-wrap gap-1.5">
                {VARIABLES.map(({ v, desc }) => (
                  <button
                    key={v}
                    type="button"
                    title={desc}
                    onClick={() => insertVar(v)}
                    className="text-xs font-mono bg-slate-100 hover:bg-indigo-100 hover:text-indigo-700 text-slate-600 px-2 py-1 rounded-md border border-slate-200 hover:border-indigo-300 transition-colors"
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right: live preview */}
          <div className="p-5 bg-slate-50">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Live Preview</p>
            <EmailPreview tpl={tpl} store={store} emailBranding={emailBranding} />
            <p className="text-[10px] text-slate-400 mt-2 text-center">
              Logo & colors from <span className="font-medium">Portal Settings</span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function EmailSettings() {
  const { config, updateKlaviyo } = useMerchant();
  const kv = config.klaviyo;
  const [form, setForm] = useState({
    emailBranding: { showHeader: true, logoData: '', logoUrl: '' },
    ...kv,
    emailBranding: { showHeader: true, logoData: '', logoUrl: '', ...(kv.emailBranding || {}) },
  });
  const [saved, setSaved] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [testSending, setTestSending] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [testEmail, setTestEmail] = useState('');
  const [testFlowId, setTestFlowId] = useState('return_submitted');
  const [expandedFlow, setExpandedFlow] = useState(null);
  const logoFileRef = useRef(null);

  function updateBranding(key, value) {
    setForm(p => ({ ...p, emailBranding: { ...p.emailBranding, [key]: value } }));
  }

  function handleLogoFile(e) {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = ev => updateBranding('logoData', ev.target.result);
    reader.readAsDataURL(file);
  }

  function updateTemplate(flowId, field, value) {
    setForm(p => ({
      ...p,
      templates: { ...p.templates, [flowId]: { ...p.templates?.[flowId], [field]: value } },
    }));
  }

  function toggleEvent(id) {
    setForm(p => ({
      ...p,
      events: { ...p.events, [id]: { ...p.events[id], enabled: !p.events[id].enabled } },
    }));
  }

  function handleSave(e) {
    e.preventDefault();
    updateKlaviyo(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  async function handleTest() {
    const email = testEmail.trim() || form.replyTo || 'demo@store.com';
    const flowMeta = FLOW_META.find(f => f.id === testFlowId);
    setTestSending(true);
    setTestResult(null);
    try {
      await sendKlaviyoEvent({
        shop,
        eventName: flowMeta?.label || 'Return Submitted',
        customer: { email, name: 'Test Customer' },
        returnData: {
          rma: 'RMA-TEST',
          orderNumber: '#TEST-001',
          refundAmount: 49.99,
          items: [{ name: 'Test Product', variant: 'Default', price: 49.99 }],
        },
        extra: { test: true },
      });
      setTestResult({ success: true, event: flowMeta?.label || 'Return Submitted', email });
    } catch (err) {
      setTestResult({ success: false, error: err.message });
    } finally {
      setTestSending(false);
    }
  }

  return (
    <div className="flex-1 min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200 px-6 py-5">
        <h1 className="text-xl font-bold text-slate-900">Email Marketing</h1>
        <p className="text-sm text-slate-500 mt-0.5">Customise branded transactional emails sent to customers at every step of their return.</p>
      </div>

      <div className="p-6 max-w-5xl space-y-5">
        <form onSubmit={handleSave} className="space-y-5">

          {/* Klaviyo Connection */}
          <Section title="Klaviyo Connection">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-700">Enable Klaviyo Integration</p>
                <p className="text-xs text-slate-400 mt-0.5">Fire events on every return status change to trigger your flows</p>
              </div>
              <Toggle checked={form.enabled} onChange={v => setForm(p => ({ ...p, enabled: v }))} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Private API Key
                  <span className="text-xs text-slate-400 font-normal ml-1">(server-side only)</span>
                </label>
                <div className="relative">
                  <input
                    type={showKey ? 'text' : 'password'}
                    value={form.apiKey}
                    onChange={e => setForm(p => ({ ...p, apiKey: e.target.value }))}
                    placeholder="pk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                    className="w-full px-3.5 py-2.5 pr-10 border border-slate-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                  <button type="button" onClick={() => setShowKey(s => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      {showKey
                        ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        : <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></>
                      }
                    </svg>
                  </button>
                </div>
                <p className="text-xs text-slate-400 mt-1">Klaviyo → Settings → API Keys</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Public API Key (Site ID)</label>
                <input
                  type="text"
                  value={form.publicKey}
                  onChange={e => setForm(p => ({ ...p, publicKey: e.target.value }))}
                  placeholder="XXXXXX"
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
                <p className="text-xs text-slate-400 mt-1">Klaviyo → Settings → API Keys</p>
              </div>
            </div>

            <div className="space-y-3 pt-1">
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="email"
                  value={testEmail}
                  onChange={e => setTestEmail(e.target.value)}
                  placeholder={form.replyTo || 'test@yourstore.com'}
                  className="flex-1 px-3.5 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
                <select
                  value={testFlowId}
                  onChange={e => setTestFlowId(e.target.value)}
                  className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                >
                  {FLOW_META.map(f => (
                    <option key={f.id} value={f.id}>{f.label}</option>
                  ))}
                </select>
                <button type="button" onClick={handleTest} disabled={testSending}
                  className="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-800 border border-indigo-200 hover:border-indigo-300 px-3.5 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 whitespace-nowrap">
                  {testSending ? (
                    <><svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>Sending…</>
                  ) : (
                    <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>Send Test Event</>
                  )}
                </button>
              </div>
              {testResult && (
                <span className={`flex items-center gap-1.5 text-sm font-medium ${testResult.success ? 'text-emerald-600' : 'text-red-600'}`}>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d={testResult.success ? 'M5 13l4 4L19 7' : 'M6 18L18 6M6 6l12 12'} />
                  </svg>
                  {testResult.success ? `Test event "${testResult.event}" fired to ${testResult.email}` : (testResult.error || 'Test failed')}
                </span>
              )}
            </div>
          </Section>

          {/* Branding */}
          <Section title="Sender Settings">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">From Name</label>
                <input
                  type="text"
                  value={form.fromName || ''}
                  onChange={e => setForm(p => ({ ...p, fromName: e.target.value }))}
                  placeholder={config.store.name || 'My Store'}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
                <p className="text-xs text-slate-400 mt-1">Sender name shown in the customer's inbox</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Reply-To Email</label>
                <input
                  type="email"
                  value={form.replyTo || ''}
                  onChange={e => setForm(p => ({ ...p, replyTo: e.target.value }))}
                  placeholder="support@yourstore.com"
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
                <p className="text-xs text-slate-400 mt-1">Where customer replies are sent</p>
              </div>
            </div>
            <div className="flex items-start gap-2.5 bg-indigo-50 border border-indigo-100 rounded-lg px-3.5 py-3">
              <svg className="w-4 h-4 text-indigo-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20 10 10 0 000-20z" />
              </svg>
              <p className="text-xs text-indigo-700">
                Brand color is pulled from <strong>Portal Settings</strong>. Set a dedicated email logo or remove the header bar in <strong>Email Branding</strong> below.
              </p>
            </div>
          </Section>

          {/* Email Branding */}
          <Section title="Email Branding">
            {/* Header toggle */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-700">Show coloured header bar</p>
                <p className="text-xs text-slate-400 mt-0.5">Displays a solid brand-colour strip with your logo at the top of every email</p>
              </div>
              <Toggle
                checked={form.emailBranding?.showHeader !== false}
                onChange={v => updateBranding('showHeader', v)}
              />
            </div>

            {/* Email logo upload */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Email Logo
                <span className="text-xs text-slate-400 font-normal ml-1.5">— overrides the portal logo for emails</span>
              </label>

              <input ref={logoFileRef} type="file" accept="image/*" className="hidden" onChange={handleLogoFile} />

              <div className="flex items-start gap-3">
                {/* Preview box */}
                <div className="w-20 h-20 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden shrink-0">
                  {form.emailBranding?.logoData || form.emailBranding?.logoUrl ? (
                    <img
                      src={form.emailBranding.logoData || form.emailBranding.logoUrl}
                      alt="email logo"
                      className="w-full h-full object-contain p-1"
                    />
                  ) : config.store.logoData || config.store.logoUrl ? (
                    <div className="flex flex-col items-center gap-0.5">
                      <img
                        src={config.store.logoData || config.store.logoUrl}
                        alt="portal logo"
                        className="w-full h-full object-contain p-1 opacity-40"
                      />
                    </div>
                  ) : (
                    <svg className="w-7 h-7 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  )}
                </div>

                <div className="flex-1 space-y-2">
                  <button
                    type="button"
                    onClick={() => logoFileRef.current?.click()}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    Upload image
                  </button>
                  <input
                    type="url"
                    value={form.emailBranding?.logoUrl || ''}
                    onChange={e => { updateBranding('logoUrl', e.target.value); updateBranding('logoData', ''); }}
                    placeholder="or paste image URL…"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                  {(form.emailBranding?.logoData || form.emailBranding?.logoUrl) && (
                    <button
                      type="button"
                      onClick={() => { updateBranding('logoData', ''); updateBranding('logoUrl', ''); if (logoFileRef.current) logoFileRef.current.value = ''; }}
                      className="w-full px-3 py-1.5 border border-red-200 text-red-500 rounded-lg text-xs font-medium hover:bg-red-50 transition-colors"
                    >
                      Remove — use portal logo
                    </button>
                  )}
                  <p className="text-xs text-slate-400">PNG or SVG with transparent background works best. Fallback: portal logo from Portal Settings.</p>
                </div>
              </div>
            </div>
          </Section>

          {/* Email Flows */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Email Flows</h3>
              <p className="text-xs text-slate-400">Click any flow to edit its template</p>
            </div>
            <div className="space-y-2">
              {FLOW_META.map(meta => {
                const ev = form.events?.[meta.id] || { enabled: true };
                const tpl = form.templates?.[meta.id] || {};
                return (
                  <FlowEditor
                    key={meta.id}
                    meta={meta}
                    ev={ev}
                    tpl={tpl}
                    expanded={expandedFlow === meta.id}
                    onToggleExpand={() => setExpandedFlow(expandedFlow === meta.id ? null : meta.id)}
                    onToggleEvent={() => toggleEvent(meta.id)}
                    onUpdateTemplate={(field, value) => updateTemplate(meta.id, field, value)}
                    store={config.store}
                    emailBranding={form.emailBranding}
                  />
                );
              })}
            </div>
          </div>

          {/* Save */}
          <div className="flex items-center gap-3 pt-1">
            <button type="submit"
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6 py-2.5 rounded-lg text-sm transition-colors">
              Save Settings
            </button>
            {saved && (
              <span className="text-sm text-emerald-600 font-medium flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                Saved!
              </span>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 shadow-sm">
      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{title}</h3>
      {children}
    </div>
  );
}

function Toggle({ checked, onChange }) {
  return (
    <button type="button" onClick={() => onChange(!checked)}
      className={`w-11 h-6 rounded-full transition-colors shrink-0 relative ${checked ? 'bg-indigo-600' : 'bg-slate-200'}`}>
      <div className={`w-4 h-4 bg-white rounded-full shadow absolute top-1 transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  );
}
