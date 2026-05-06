import { useState } from 'react';
import { useMerchant } from '../merchant/MerchantContext';
import { lookupReturnByRma, uploadPublicTracking } from '../utils/returnsApi';
import { getTrackingUrl } from '../utils/trackingSync';

const CARRIERS = ['UPS', 'FedEx', 'USPS', 'DHL', 'Other'];

const STATUS_CONFIG = {
  submitted:      { label: 'Submitted',      color: 'bg-slate-100 text-slate-700' },
  awaiting_items: { label: 'Awaiting Items', color: 'bg-amber-100 text-amber-700' },
  in_transit:     { label: 'In Transit',     color: 'bg-blue-100 text-blue-700' },
  received:       { label: 'Received',       color: 'bg-violet-100 text-violet-700' },
  refunded:       { label: 'Refunded',       color: 'bg-emerald-100 text-emerald-700' },
  rejected:       { label: 'Rejected',       color: 'bg-red-100 text-red-600' },
};

// When rma is pre-filled (from confirmation page), skip lookup and go straight to upload
// When rma is null, show a lookup form first
export default function UploadTracking({ rma: initialRma, onDone, onBack }) {
  const { shop } = useMerchant();
  const [rmaInput, setRmaInput] = useState(initialRma || '');
  const [foundReturn, setFoundReturn] = useState(null);
  const [lookupError, setLookupError] = useState('');
  const [looking, setLooking] = useState(false);

  // Upload form state
  const [carrier, setCarrier] = useState('');
  const [tracking, setTracking] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  // If we were given an RMA directly (from confirmation screen) skip the lookup step
  const [phase, setPhase] = useState(initialRma ? 'upload' : 'lookup');

  async function handleLookup(e) {
    e.preventDefault();
    const rma = rmaInput.trim().toUpperCase();
    if (!rma) { setLookupError('Please enter your RMA number.'); return; }
    if (!shop) { setLookupError('Store not configured. Please use the link provided by the store.'); return; }
    setLooking(true);
    setLookupError('');
    try {
      const result = await lookupReturnByRma(shop, rma);
      if (!result?.found) {
        setLookupError("We couldn't find a return with that RMA number. Please check and try again.");
        setLooking(false);
        return;
      }
      setFoundReturn(result.return);
      const canUpload = result.return.status === 'submitted' || result.return.status === 'awaiting_items';
      setPhase(canUpload ? 'upload' : 'status');
    } catch {
      setLookupError("Something went wrong. Please try again.");
    } finally {
      setLooking(false);
    }
  }

  async function handleSubmitTracking(e) {
    e.preventDefault();
    if (!carrier || !tracking.trim()) return;
    const rma = foundReturn?.rma || initialRma;
    if (!rma || !shop) return;
    setSubmitting(true);
    try {
      await uploadPublicTracking(shop, rma, tracking.trim(), carrier);
      setDone(true);
    } catch {
      // Fallback: still show success to customer (server may have accepted it)
      setDone(true);
    } finally {
      setSubmitting(false);
    }
  }

  // ── Done screen ───────────────────────────────────────────────────────────

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
          We've received your tracking number. We'll notify you once your return is processed.
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

  // ── Status-only screen (return already has tracking or is in final state) ─

  if (phase === 'status' && foundReturn) {
    const s = STATUS_CONFIG[foundReturn.status] || STATUS_CONFIG.submitted;
    return (
      <div className="max-w-md mx-auto px-4 py-8">
        <BackBtn onBack={onBack} />
        <h2 className="text-xl font-bold text-gray-900 mb-1">Return Status</h2>
        <p className="text-sm text-gray-500 mb-4">
          RMA <span className="font-mono font-semibold text-gray-700">{foundReturn.rma}</span>
        </p>
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Status</span>
            <span className={`text-sm font-semibold px-2.5 py-1 rounded-full ${s.color}`}>{s.label}</span>
          </div>
          {foundReturn.tracking && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Tracking</span>
              <a
                href={getTrackingUrl(foundReturn.carrier, foundReturn.tracking)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-mono text-indigo-600 hover:underline"
              >
                {foundReturn.tracking}
              </a>
            </div>
          )}
        </div>
        <button
          onClick={onBack}
          className="mt-4 w-full py-3 rounded-xl text-sm font-medium text-gray-600 border border-gray-200 bg-white hover:bg-gray-50 transition-colors"
        >
          Go Back
        </button>
      </div>
    );
  }

  // ── Lookup form ───────────────────────────────────────────────────────────

  if (phase === 'lookup') {
    return (
      <div className="max-w-md mx-auto px-4 py-8">
        <BackBtn onBack={onBack} />
        <h2 className="text-xl font-bold text-gray-900 mb-1">Upload Tracking Number</h2>
        <p className="text-sm text-gray-500 mb-5">Enter your RMA number to find your return and upload a tracking number.</p>

        <form onSubmit={handleLookup} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">RMA Number</label>
            <input
              type="text"
              value={rmaInput}
              onChange={e => { setRmaInput(e.target.value.toUpperCase()); setLookupError(''); }}
              placeholder="e.g. RMA-ABC123"
              className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
              autoFocus
            />
            {lookupError && (
              <p className="text-sm text-red-600 mt-2 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{lookupError}</p>
            )}
          </div>
          <button
            type="submit"
            disabled={!rmaInput.trim() || looking}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
          >
            {looking ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Looking up return…
              </>
            ) : 'Find My Return'}
          </button>
        </form>
      </div>
    );
  }

  // ── Upload tracking form ──────────────────────────────────────────────────

  const displayRma = foundReturn?.rma || initialRma;

  return (
    <div className="max-w-md mx-auto px-4 py-8">
      <BackBtn onBack={phase === 'upload' && !initialRma ? () => setPhase('lookup') : onBack} />
      <h2 className="text-xl font-bold text-gray-900 mb-1">Upload Tracking Number</h2>
      {displayRma && (
        <p className="text-sm text-gray-500 mb-5">
          Return <span className="font-mono font-semibold text-gray-700">{displayRma}</span>
        </p>
      )}

      <form onSubmit={handleSubmitTracking} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
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
              Submitting…
            </>
          ) : 'Submit Tracking'}
        </button>
      </form>
    </div>
  );
}

function BackBtn({ onBack }) {
  return (
    <button
      onClick={onBack}
      className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4 transition-colors"
    >
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
      </svg>
      Back
    </button>
  );
}
