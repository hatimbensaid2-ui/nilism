import { useState } from 'react';
import { useMerchant } from '../MerchantContext';

const PRESET_COLORS = [
  '#4f46e5', '#7c3aed', '#db2777', '#dc2626',
  '#ea580c', '#16a34a', '#0891b2', '#1d4ed8',
];

export default function PortalSettings() {
  const { config, updateStore } = useMerchant();
  const [form, setForm] = useState({ ...config.store });
  const [saved, setSaved] = useState(false);

  function f(key) {
    return e => setForm(p => ({ ...p, [key]: e.target.value }));
  }

  function handleSave(e) {
    e.preventDefault();
    updateStore(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Portal Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Customize what customers see when they visit your return portal.</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Branding */}
        <Section title="Branding">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Store Name</label>
            <input
              value={form.name}
              onChange={f('name')}
              placeholder="My Store"
              className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Logo URL</label>
            <input
              value={form.logoUrl}
              onChange={f('logoUrl')}
              placeholder="https://..."
              className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-400 mt-1">Leave blank to show store name as text.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Brand Color</label>
            <div className="flex items-center gap-2 flex-wrap">
              {PRESET_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setForm(p => ({ ...p, primaryColor: c }))}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${form.primaryColor === c ? 'border-gray-900 scale-110' : 'border-transparent'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
              <div className="flex items-center gap-2 ml-2">
                <input
                  type="color"
                  value={form.primaryColor}
                  onChange={f('primaryColor')}
                  className="w-8 h-8 rounded cursor-pointer border border-gray-300"
                />
                <span className="text-sm font-mono text-gray-600">{form.primaryColor}</span>
              </div>
            </div>
          </div>
        </Section>

        {/* Messaging */}
        <Section title="Customer Messaging">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Welcome Message</label>
            <input
              value={form.welcomeMessage}
              onChange={f('welcomeMessage')}
              placeholder="We make returns easy."
              className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Return Policy Text</label>
            <textarea
              value={form.policyText}
              onChange={f('policyText')}
              rows={3}
              placeholder="Items must be unworn and in original packaging..."
              className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
            />
            <p className="text-xs text-gray-400 mt-1">Shown on the order lookup page.</p>
          </div>
        </Section>

        {/* Return window */}
        <Section title="Return Policy">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Return Window (days)</label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min="1"
                max="365"
                value={form.returnWindowDays}
                onChange={f('returnWindowDays')}
                className="w-24 px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              <span className="text-sm text-gray-500">days from purchase date</span>
            </div>
          </div>
        </Section>

        {/* Preview */}
        <Section title="Preview">
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-center">
              {form.logoUrl ? (
                <img src={form.logoUrl} alt="logo" className="h-7" />
              ) : (
                <span className="font-bold text-gray-900">{form.name || 'My Store'}</span>
              )}
            </div>
            <div className="bg-gray-50 px-4 py-5 text-center">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-full mb-3" style={{ backgroundColor: form.primaryColor + '20' }}>
                <svg className="w-5 h-5" style={{ color: form.primaryColor }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                    d="M3 10h2l1 2h13l1-4H6M7 18a1 1 0 100 2 1 1 0 000-2zm10 0a1 1 0 100 2 1 1 0 000-2z" />
                </svg>
              </div>
              <p className="font-bold text-gray-900 text-sm">{form.welcomeMessage || 'Returns Center'}</p>
              {form.policyText && <p className="text-xs text-gray-500 mt-1 max-w-xs mx-auto">{form.policyText}</p>}
              <div className="mt-3">
                <div className="w-full py-2 rounded-lg text-white text-xs font-semibold" style={{ backgroundColor: form.primaryColor }}>
                  Find My Order
                </div>
              </div>
            </div>
          </div>
        </Section>

        <div className="flex items-center gap-3">
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
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
      <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider text-xs">{title}</h3>
      {children}
    </div>
  );
}
