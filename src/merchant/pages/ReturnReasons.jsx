import { useState } from 'react';
import { useMerchant } from '../MerchantContext';

export default function ReturnReasons() {
  const { config, setReturnReasons } = useMerchant();
  const [newLabel, setNewLabel] = useState('');

  function toggle(id) {
    setReturnReasons(config.returnReasons.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r));
  }

  function addReason() {
    const label = newLabel.trim();
    if (!label) return;
    const id = 'custom_' + Date.now();
    setReturnReasons([...config.returnReasons, { id, label, enabled: true }]);
    setNewLabel('');
  }

  function deleteReason(id) {
    setReturnReasons(config.returnReasons.filter(r => r.id !== id));
  }

  const enabled = config.returnReasons.filter(r => r.enabled).length;

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Return Reasons</h1>
        <p className="text-sm text-gray-500 mt-1">
          {enabled} of {config.returnReasons.length} reasons enabled. Customers choose from these when returning items.
        </p>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-4">
        <div className="divide-y divide-gray-100">
          {config.returnReasons.map(reason => (
            <div key={reason.id} className="flex items-center gap-3 px-4 py-3.5">
              <button
                onClick={() => toggle(reason.id)}
                className={`w-10 h-6 rounded-full transition-colors shrink-0 ${reason.enabled ? 'bg-indigo-600' : 'bg-gray-300'}`}
              >
                <div className={`w-4 h-4 bg-white rounded-full mt-1 transition-transform mx-auto ${reason.enabled ? 'translate-x-2' : '-translate-x-2'}`} />
              </button>
              <span className={`flex-1 text-sm ${reason.enabled ? 'text-gray-900' : 'text-gray-400 line-through'}`}>
                {reason.label}
              </span>
              {reason.id.startsWith('custom_') && (
                <button
                  onClick={() => deleteReason(reason.id)}
                  className="text-red-400 hover:text-red-600 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Add custom reason */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <p className="text-sm font-semibold text-gray-700 mb-3">Add Custom Reason</p>
        <div className="flex gap-2">
          <input
            type="text"
            value={newLabel}
            onChange={e => setNewLabel(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addReason()}
            placeholder="e.g. Arrived too late"
            className="flex-1 px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
          <button
            onClick={addReason}
            disabled={!newLabel.trim()}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-semibold px-4 py-2 rounded-lg text-sm transition-colors"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
}
