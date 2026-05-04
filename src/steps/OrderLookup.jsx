import { useState } from 'react';
import { MOCK_ORDERS } from '../data/mockOrders';
import { useMerchant } from '../merchant/MerchantContext';

export default function OrderLookup({ onOrderFound, onUploadTracking }) {
  const { config } = useMerchant();
  const [tab, setTab] = useState('start');

  // Start return tab
  const [orderNumber, setOrderNumber] = useState('');
  const [email, setEmail] = useState('');
  const [returnError, setReturnError] = useState('');
  const [returnLoading, setReturnLoading] = useState(false);

  // Upload tracking tab
  const [rma, setRma] = useState('');
  const [trackingError, setTrackingError] = useState('');
  const [trackingLoading, setTrackingLoading] = useState(false);

  function handleStartReturn(e) {
    e.preventDefault();
    setReturnError('');
    if (!orderNumber.trim() || !email.trim()) { setReturnError('Please fill in all fields.'); return; }
    setReturnLoading(true);
    setTimeout(() => {
      const key = orderNumber.trim().replace(/^#/, '').toLowerCase();
      const order = MOCK_ORDERS[key];
      if (order && order.email.toLowerCase() === email.trim().toLowerCase()) {
        onOrderFound(order);
      } else {
        setReturnError("We couldn't find an order matching those details.");
      }
      setReturnLoading(false);
    }, 800);
  }

  function handleUploadTracking(e) {
    e.preventDefault();
    setTrackingError('');
    if (!rma.trim()) { setTrackingError('Please enter your RMA number.'); return; }
    setTrackingLoading(true);
    setTimeout(() => {
      const found = config.returns.find(r => r.rma.toLowerCase() === rma.trim().toLowerCase());
      if (found) {
        onUploadTracking(found.rma);
      } else {
        setTrackingError("We couldn't find a return with that RMA number.");
      }
      setTrackingLoading(false);
    }, 700);
  }

  return (
    <div className="max-w-md mx-auto px-4 py-10">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-indigo-50 mb-4">
          <svg className="w-7 h-7 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
              d="M3 10h2l1 2h13l1-4H6M7 18a1 1 0 100 2 1 1 0 000-2zm10 0a1 1 0 100 2 1 1 0 000-2z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">
          {config.store.welcomeMessage || 'Returns Center'}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          {tab === 'start' ? 'Enter your order details to begin.' : 'Enter your RMA number to upload tracking.'}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex bg-gray-100 rounded-xl p-1 mb-6">
        <button
          onClick={() => setTab('start')}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
            tab === 'start' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Start a Return
        </button>
        <button
          onClick={() => setTab('tracking')}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
            tab === 'tracking' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Upload Tracking
        </button>
      </div>

      {tab === 'start' && (
        <form onSubmit={handleStartReturn} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Order Number</label>
            <input
              type="text"
              value={orderNumber}
              onChange={e => setOrderNumber(e.target.value)}
              placeholder="#1001"
              className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
            />
          </div>
          {returnError && <ErrorBox message={returnError} />}
          <SubmitButton loading={returnLoading} label="Find My Order" loadingLabel="Looking up order..." />
        </form>
      )}

      {tab === 'tracking' && (
        <form onSubmit={handleUploadTracking} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">RMA Number</label>
            <input
              type="text"
              value={rma}
              onChange={e => setRma(e.target.value)}
              placeholder="RMA-XXXXXX"
              className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
            />
            <p className="text-xs text-gray-400 mt-1.5">Found in your return confirmation email.</p>
          </div>
          {trackingError && <ErrorBox message={trackingError} />}
          <SubmitButton loading={trackingLoading} label="Find My Return" loadingLabel="Searching..." />
        </form>
      )}

      <div className="mt-6 text-center">
        <p className="text-xs text-gray-400">
          Demo: orders <span className="font-mono text-gray-500">#1001</span>, <span className="font-mono text-gray-500">#1002</span> · email <span className="font-mono text-gray-500">demo@store.com</span>
        </p>
        {tab === 'tracking' && (
          <p className="text-xs text-gray-400 mt-1">
            Demo RMA: <span className="font-mono text-gray-500">RMA-A1B2C3</span>
          </p>
        )}
      </div>
    </div>
  );
}

function ErrorBox({ message }) {
  return (
    <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-lg px-3.5 py-3">
      <svg className="w-4 h-4 text-red-500 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm-.75-9.25a.75.75 0 011.5 0v4a.75.75 0 01-1.5 0v-4zm.75-2a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
      </svg>
      <p className="text-sm text-red-700">{message}</p>
    </div>
  );
}

function SubmitButton({ loading, label, loadingLabel }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
    >
      {loading ? (
        <>
          <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          {loadingLabel}
        </>
      ) : label}
    </button>
  );
}
