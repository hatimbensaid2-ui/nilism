import { useState } from 'react';
import { useMerchant } from '../MerchantContext';

export default function ReturnReasons() {
  const { config, setReturnReasons } = useMerchant();
  const [newLabel, setNewLabel] = useState('');

  function toggle(id) {
    setReturnReasons(config.returnReasons.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r));
  }

  function togglePhotos(id) {
    setReturnReasons(config.returnReasons.map(r => r.id === id ? { ...r, requiresPhotos: !r.requiresPhotos } : r));
  }

  function toggleExchange(id) {
    setReturnReasons(config.returnReasons.map(r => r.id === id ? { ...r, allowExchange: !r.allowExchange } : r));
  }

  function addReason() {
    const label = newLabel.trim();
    if (!label) return;
    const id = 'custom_' + Date.now();
    setReturnReasons([...config.returnReasons, { id, label, enabled: true, requiresPhotos: false, allowExchange: false }]);
    setNewLabel('');
  }

  function deleteReason(id) {
    setReturnReasons(config.returnReasons.filter(r => r.id !== id));
  }

  const enabled = config.returnReasons.filter(r => r.enabled).length;
  const photoCount = config.returnReasons.filter(r => r.requiresPhotos && r.enabled).length;
  const exchangeCount = config.returnReasons.filter(r => r.allowExchange && r.enabled).length;

  return (
    <div className="flex-1 min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200 px-6 py-5">
        <h1 className="text-xl font-bold text-slate-900">Return Reasons</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          {enabled} of {config.returnReasons.length} reasons enabled
          {photoCount > 0 && <span className="ml-2 text-amber-600 font-medium">· {photoCount} require photos</span>}
          {exchangeCount > 0 && <span className="ml-2 text-indigo-600 font-medium">· {exchangeCount} offer exchange</span>}
        </p>
      </div>

      <div className="p-6 max-w-2xl space-y-5">

        {/* Column legend */}
        <div className="flex items-center gap-3 px-4 pb-1">
          <div className="flex-1" />
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium w-20 justify-center">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Photos
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium w-20 justify-center">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
            Exchange
          </div>
          <div className="text-xs text-slate-400 font-medium w-14 text-center">Active</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <div className="divide-y divide-slate-100">
            {config.returnReasons.map(reason => (
              <div key={reason.id} className="flex items-center gap-3 px-4 py-3.5">
                {/* Label */}
                <div className="flex-1 flex items-center gap-2 min-w-0">
                  {reason.requiresPhotos && (
                    <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-semibold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">
                      <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
                          d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Photo
                    </span>
                  )}
                  {reason.allowExchange && (
                    <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-semibold bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full">
                      <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                      </svg>
                      Exchange
                    </span>
                  )}
                  <span className={`text-sm truncate ${reason.enabled ? 'text-slate-900' : 'text-slate-400 line-through'}`}>
                    {reason.label}
                  </span>
                </div>

                {/* Require photos toggle */}
                <div className="w-20 flex justify-center">
                  <button
                    type="button"
                    title={reason.requiresPhotos ? 'Photos required — click to disable' : 'Click to require customer photos'}
                    onClick={() => togglePhotos(reason.id)}
                    className={`w-9 h-5 rounded-full transition-colors relative shrink-0 ${reason.requiresPhotos ? 'bg-amber-500' : 'bg-slate-200'}`}
                  >
                    <div className={`w-3.5 h-3.5 bg-white rounded-full shadow absolute top-[3px] transition-transform ${reason.requiresPhotos ? 'translate-x-[18px]' : 'translate-x-[3px]'}`} />
                  </button>
                </div>

                {/* Allow exchange toggle */}
                <div className="w-20 flex justify-center">
                  <button
                    type="button"
                    title={reason.allowExchange ? 'Exchange offered — click to disable' : 'Click to offer exchange for this reason'}
                    onClick={() => toggleExchange(reason.id)}
                    className={`w-9 h-5 rounded-full transition-colors relative shrink-0 ${reason.allowExchange ? 'bg-indigo-500' : 'bg-slate-200'}`}
                  >
                    <div className={`w-3.5 h-3.5 bg-white rounded-full shadow absolute top-[3px] transition-transform ${reason.allowExchange ? 'translate-x-[18px]' : 'translate-x-[3px]'}`} />
                  </button>
                </div>

                {/* Enable toggle */}
                <div className="w-14 flex justify-center">
                  <button
                    type="button"
                    onClick={() => toggle(reason.id)}
                    className={`w-10 h-6 rounded-full transition-colors relative shrink-0 ${reason.enabled ? 'bg-indigo-600' : 'bg-slate-200'}`}
                  >
                    <div className={`w-4 h-4 bg-white rounded-full shadow absolute top-1 transition-transform ${reason.enabled ? 'translate-x-5' : 'translate-x-1'}`} />
                  </button>
                </div>

                {/* Delete (custom only) */}
                {reason.id.startsWith('custom_') && (
                  <button onClick={() => deleteReason(reason.id)}
                    className="text-slate-300 hover:text-red-500 transition-colors shrink-0">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Info boxes */}
        <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <svg className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <p className="text-xs text-amber-800">
            <strong>Require Photos</strong> — when enabled, customers selecting this reason will be prompted to upload photos of the item before submitting.
          </p>
        </div>

        <div className="flex items-start gap-2.5 bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3">
          <svg className="w-4 h-4 text-indigo-600 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
          <p className="text-xs text-indigo-800">
            <strong>Offer Exchange</strong> — when enabled, customers selecting this reason will be offered the option to exchange for a different variant instead of a refund.
          </p>
        </div>

        {/* Add custom reason */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <p className="text-sm font-semibold text-slate-700 mb-3">Add Custom Reason</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={newLabel}
              onChange={e => setNewLabel(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addReason()}
              placeholder="e.g. Arrived too late"
              className="flex-1 px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
            <button onClick={addReason} disabled={!newLabel.trim()}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-semibold px-4 py-2 rounded-lg text-sm transition-colors">
              Add
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
