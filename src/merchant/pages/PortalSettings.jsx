import { useState, useRef } from 'react';
import { useMerchant } from '../MerchantContext';

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

export default function PortalSettings() {
  const { config, updateStore } = useMerchant();
  const [form, setForm] = useState({ ...config.store });
  const [saved, setSaved] = useState(false);
  const [logoPreview, setLogoPreview] = useState(form.logoData || form.logoUrl || '');
  const [logoUploading, setLogoUploading] = useState(false);
  const fileRef = useRef(null);

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

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Portal Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Customise what customers see when they visit your return portal.</p>
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
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={form.showPolicyOnLookup !== false}
              onChange={e => setForm(p => ({ ...p, showPolicyOnLookup: e.target.checked }))}
              className="w-4 h-4 rounded text-indigo-600 border-gray-300 focus:ring-indigo-500" />
            <span className="text-sm text-gray-700">Show policy text on the order lookup page</span>
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
                <span className="text-sm text-gray-500">days from purchase date</span>
              </div>
            </div>
          </div>
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
