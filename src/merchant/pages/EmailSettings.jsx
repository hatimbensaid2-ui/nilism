import { useState } from 'react';
import { useMerchant } from '../MerchantContext';
import { KLAVIYO_EVENTS } from '../../utils/klaviyo';

export default function EmailSettings() {
  const { config, updateKlaviyo } = useMerchant();
  const kv = config.klaviyo;
  const [form, setForm] = useState({ ...kv });
  const [saved, setSaved] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [testSending, setTestSending] = useState(false);
  const [testResult, setTestResult] = useState(null);

  function f(key) {
    return e => setForm(p => ({ ...p, [key]: e.target.value }));
  }

  function toggleEvent(id) {
    setForm(p => ({
      ...p,
      events: {
        ...p.events,
        [id]: { ...p.events[id], enabled: !p.events[id].enabled },
      },
    }));
  }

  function handleSave(e) {
    e.preventDefault();
    updateKlaviyo(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  function handleTest() {
    setTestSending(true);
    setTestResult(null);
    setTimeout(() => {
      setTestSending(false);
      setTestResult({
        success: true,
        event: 'Return Submitted',
        email: 'demo@store.com',
        simulated: !form.apiKey,
      });
    }, 1200);
  }

  return (
    <div className="flex-1 min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200 px-6 py-5">
        <h1 className="text-xl font-bold text-slate-900">Email Marketing</h1>
        <p className="text-sm text-slate-500 mt-0.5">Connect Klaviyo to automatically email customers when their return status changes.</p>
      </div>

      <div className="p-6 max-w-2xl space-y-5">
        <form onSubmit={handleSave} className="space-y-5">

          {/* How it works */}
          <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-indigo-600 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20 10 10 0 000-20z" />
              </svg>
              <div>
                <p className="text-sm font-semibold text-indigo-800">How it works</p>
                <p className="text-sm text-indigo-700 mt-1">
                  Each status change fires a Klaviyo metric event. Build flows in Klaviyo that listen to
                  these events to send branded transactional emails to your customers.
                </p>
                <a href="https://www.klaviyo.com/flows" target="_blank" rel="noopener noreferrer"
                  className="text-xs text-indigo-600 hover:underline mt-1 inline-flex items-center gap-1 font-medium">
                  Open Klaviyo Flows
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>
            </div>
          </div>

          {/* Connection */}
          <Section title="Klaviyo Connection">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-medium text-slate-700">Enable Klaviyo Integration</p>
                <p className="text-xs text-slate-400 mt-0.5">Fire events on every return status change</p>
              </div>
              <Toggle checked={form.enabled} onChange={v => setForm(p => ({ ...p, enabled: v }))} />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Private API Key
                <span className="text-xs text-slate-400 font-normal ml-2">(kept server-side — never exposed to customers)</span>
              </label>
              <div className="relative">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={form.apiKey}
                  onChange={f('apiKey')}
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
              <p className="text-xs text-slate-400 mt-1">Found in Klaviyo → Settings → API Keys</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Public API Key (Site ID)</label>
              <input
                type="text"
                value={form.publicKey}
                onChange={f('publicKey')}
                placeholder="XXXXXX"
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              <p className="text-xs text-slate-400 mt-1">Used for client-side tracking. Found in Klaviyo → Settings → API Keys.</p>
            </div>

            <button type="button" onClick={handleTest} disabled={testSending}
              className="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-800 border border-indigo-200 hover:border-indigo-300 px-3.5 py-2 rounded-lg font-medium transition-colors disabled:opacity-50">
              {testSending ? (
                <><svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                </svg>Sending test...</>
              ) : (
                <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>Send Test Event</>
              )}
            </button>

            {testResult && (
              <div className={`flex items-start gap-2.5 rounded-xl px-4 py-3 text-sm ${testResult.success ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'}`}>
                <svg className={`w-4 h-4 mt-0.5 shrink-0 ${testResult.success ? 'text-emerald-600' : 'text-red-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d={testResult.success ? "M5 13l4 4L19 7" : "M6 18L18 6M6 6l12 12"} />
                </svg>
                <div>
                  <p className={`font-semibold ${testResult.success ? 'text-emerald-800' : 'text-red-700'}`}>
                    {testResult.success ? 'Test event fired!' : 'Test failed'}
                  </p>
                  <p className={`text-xs mt-0.5 ${testResult.success ? 'text-emerald-700' : 'text-red-600'}`}>
                    Event: <span className="font-mono font-semibold">{testResult.event}</span> → {testResult.email}
                    {testResult.simulated && <span className="ml-2 opacity-70">(demo — add API key for live)</span>}
                  </p>
                </div>
              </div>
            )}
          </Section>

          {/* Event toggles */}
          <Section title="Email Triggers">
            <p className="text-xs text-slate-500 mb-3">
              Each enabled trigger fires a Klaviyo metric. Build a Klaviyo Flow for each one to send the email.
            </p>
            <div className="space-y-1">
              {Object.entries(form.events).map(([id, ev]) => (
                <div key={id} className="flex items-center justify-between py-2.5 border-b border-slate-100 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{ev.label}</p>
                    <p className="text-xs font-mono text-slate-400 mt-0.5">{KLAVIYO_EVENTS[id.toUpperCase().replace(/_/g, '_')] || ev.label}</p>
                  </div>
                  <Toggle checked={ev.enabled} onChange={() => toggleEvent(id)} />
                </div>
              ))}
            </div>
          </Section>

          {/* Flow guide */}
          <Section title="Suggested Klaviyo Flows">
            <div className="space-y-3">
              {[
                { event: 'Return Submitted',  desc: 'Confirm the return request with RMA number and shipping instructions.' },
                { event: 'Return Approved',   desc: 'Let customers know their return is approved and to ship the items.' },
                { event: 'Tracking Received', desc: 'Acknowledge receipt of tracking and set refund expectations.' },
                { event: 'Items Received',    desc: 'Confirm items arrived and that refund is being processed.' },
                { event: 'Refund Processed',  desc: 'Notify customer the refund has been issued with amount and timeline.' },
                { event: 'Return Rejected',   desc: 'Explain the rejection reason and offer next steps or support.' },
                { event: 'Photo Requested',   desc: 'Ask customer to upload photos of the defective item.' },
              ].map(f => (
                <div key={f.event} className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-indigo-400 mt-1.5 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{f.event}</p>
                    <p className="text-xs text-slate-500">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </Section>

          <div className="flex items-center gap-3">
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
