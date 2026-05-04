import { useState } from 'react';
import { useMerchant } from '../merchant/MerchantContext';
import { getTrackingUrl } from '../utils/trackingSync';

const CARRIERS = ['UPS', 'FedEx', 'USPS', 'DHL', 'Other'];

export default function UploadTracking({ rma, onDone, onBack }) {
  const { updateReturn, syncTracking } = useMerchant();
  const [carrier, setCarrier] = useState('');
  const [tracking, setTracking] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  function handleSubmit(e) {
    e.preventDefault();
    if (!carrier || !tracking.trim()) return;
    setSubmitting(true);
    setTimeout(() => {
      updateReturn(rma, { tracking: tracking.trim(), carrier, status: 'in_transit' });
      // Auto-sync tracking status from carrier immediately
      syncTracking(rma).finally(() => {
        setSubmitting(false);
        setDone(true);
      });
    }, 700);
  }

  if (done) {
    return (
      <div className="max-w-md mx-auto px-4 py-10 text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-green-100 mb-4">
          <svg className="w-7 h-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-gray-900">Tracking Submitted!</h2>
        <p className="text-gray-500 text-sm mt-2">
          We've received your tracking number. We'll send you an email once your refund is processed.
        </p>
        <div className="mt-4 bg-gray-50 rounded-xl border border-gray-200 p-4 text-left">
          <p className="text-xs text-gray-500 mb-1">Tracking number</p>
          <a
            href={getTrackingUrl(carrier, tracking)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 font-mono font-semibold text-indigo-600 hover:text-indigo-800 hover:underline transition-colors"
          >
            {tracking}
            <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
          <p className="text-xs text-gray-500 mt-2">Carrier: {carrier}</p>
        </div>
        <button
          onClick={onDone}
          className="mt-6 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors"
        >
          Done
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 py-8">
      <div className="mb-6">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
        <h2 className="text-xl font-bold text-gray-900">Upload Tracking Number</h2>
        <p className="text-sm text-gray-500 mt-1">
          Return <span className="font-mono font-semibold text-gray-700">{rma}</span>
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Carrier</label>
          <div className="grid grid-cols-3 gap-2">
            {CARRIERS.map(c => (
              <button
                key={c}
                type="button"
                onClick={() => setCarrier(c)}
                className={`py-2 rounded-lg border text-sm font-medium transition-all ${
                  carrier === c
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Tracking Number</label>
          <input
            type="text"
            value={tracking}
            onChange={e => setTracking(e.target.value)}
            placeholder="e.g. 1Z999AA10123456784"
            className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
          />
        </div>

        <button
          type="submit"
          disabled={!carrier || !tracking.trim() || submitting}
          className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
        >
          {submitting ? (
            <>
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Submitting...
            </>
          ) : 'Submit Tracking'}
        </button>
      </form>
    </div>
  );
}
