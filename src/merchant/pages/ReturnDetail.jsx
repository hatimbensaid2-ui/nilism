import { useEffect, useState } from 'react';
import { useMerchant } from '../MerchantContext';
import { STATUS_CONFIG } from './Returns';
import { DEFAULT_RETURN_REASONS } from '../../data/mockOrders';
import { getTrackingUrl } from '../../utils/trackingSync';
import { sendKlaviyoEvent } from '../../utils/klaviyo';
import { createExchangeOrder, processRefund } from '../../utils/returnsApi';

const REFUND_METHOD_LABELS = {
  store_credit: 'Store Credit',
  original: 'Original Payment',
  exchange: 'Exchange',
};

const REJECT_REASONS = [
  'Item not in original condition',
  'Outside return window',
  'Non-returnable item',
  'Missing tags or packaging',
  'Fraud suspected',
  'Other',
];

const EVENT_ICONS = {
  info:      <circle cx="12" cy="12" r="4" fill="currentColor" />,
  pickup:    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8l1 12a2 2 0 002 2h8a2 2 0 002-2L19 8" />,
  transit:   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414A1 1 0 0121 11.414V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />,
  delivery:  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />,
  delivered: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />,
};

function EventIcon({ type }) {
  const path = EVENT_ICONS[type] || EVENT_ICONS.info;
  return (
    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${type === 'delivered' ? 'bg-emerald-500' : 'bg-indigo-500'}`}>
      <svg className="w-4 h-4 text-white" fill={type === 'info' ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke={type === 'info' ? 'none' : 'currentColor'}>
        {path}
      </svg>
    </div>
  );
}

function formatTs(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' · ' +
    d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function ReturnDetail({ rma, onBack }) {
  const { config, shop, updateReturn, syncTracking } = useMerchant();
  const [syncing, setSyncing] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [showQuickRefund, setShowQuickRefund] = useState(false);
  const [quickRefundProcessing, setQuickRefundProcessing] = useState(false);
  const [quickRefundError, setQuickRefundError] = useState(null);
  const [rejectReason, setRejectReason] = useState(REJECT_REASONS[0]);
  const [rejectNote, setRejectNote] = useState('');
  const [photoLightbox, setPhotoLightbox] = useState(null);

  const ret = config.returns.find(r => r.rma === rma);

  useEffect(() => {
    if (!ret) return;
    const FINAL = ['refunded', 'rejected'];
    if (ret.tracking && ret.carrier && !FINAL.includes(ret.status)) {
      setSyncing(true);
      syncTracking(rma).finally(() => setSyncing(false));
    }
  }, [rma]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!ret) {
    return (
      <div className="p-6">
        <BackBtn onBack={onBack} />
        <p className="text-slate-500">Return not found.</p>
      </div>
    );
  }

  const s = STATUS_CONFIG[ret.status] || STATUS_CONFIG.submitted;
  const wh = config.warehouses.find(w => w.id === ret.warehouseId);
  const FINAL = ['refunded', 'rejected'];
  const canSync = ret.tracking && ret.carrier && !FINAL.includes(ret.status);

  function getReasonLabel(id) {
    return (config.returnReasons || DEFAULT_RETURN_REASONS).find(r => r.id === id)?.label || id;
  }

  function handleSync() {
    setSyncing(true);
    syncTracking(rma).finally(() => setSyncing(false));
  }

  async function handleAccept() {
    const exchangeMode = config.refund?.exchangeMode || 'manual';
    // Auto mode: create exchange order immediately on accept for exchange returns
    if (ret.refundMethod === 'exchange' && exchangeMode === 'auto' && !ret.exchangeOrderCreated) {
      if (shop) {
        const exchangeItems = ret.exchangeVariant
          ? [{ ...ret.exchangeVariant, quantity: 1 }]
          : ret.items.map(i => ({ name: i.name, variantId: i.variantId, price: i.price, quantity: i.quantity }));
        try {
          await createExchangeOrder(ret.customer, exchangeItems, `Exchange for return ${ret.rma}`, ret.shopifyOrderId || ret.orderId, ret.rma);
        } catch (err) {
          console.error('Exchange order auto-creation error:', err);
        }
      }
      updateReturn(rma, { status: 'awaiting_items', exchangeOrderCreated: true, refundAmount: 0 });
      return;
    }
    updateReturn(rma, { status: 'awaiting_items' });
  }

  async function handleProcessRefund(refundData) {
    // Exchange: create a Shopify draft order at $0 instead of a monetary refund
    if (ret.refundMethod === 'exchange') {
      if (shop && !ret.exchangeOrderCreated) {
        const exchangeItems = ret.exchangeVariant
          ? [{ ...ret.exchangeVariant, quantity: 1 }]
          : ret.items.map(i => ({ name: i.name, variantId: i.variantId, price: i.price, quantity: i.quantity }));
        try {
          await createExchangeOrder(ret.customer, exchangeItems, `Exchange for return ${ret.rma}`, ret.shopifyOrderId || ret.orderId, ret.rma);
        } catch (err) {
          // propagate so modal can show inline error
          throw err;
        }
      }
      updateReturn(rma, { status: 'refunded', refundAmount: 0, refundNote: 'Exchange order created', exchangeOrderCreated: true });
      setShowRefundModal(false);
      return;
    }

    // Monetary refund — trigger directly via Shopify API
    if (shop && ret.shopifyOrderId) {
      await processRefund(ret.shopifyOrderId, {
        notify: refundData.notify,
        note: refundData.note,
        shipping: { full_refund: false, amount: String(parseFloat(refundData.shippingAmount) || 0) },
        refund_line_items: refundData.lineItems
          .filter(li => li.included)
          .map(li => ({
            line_item_id: li.id,
            quantity: li.qty,
            restock_type: refundData.restock ? 'return' : 'no_restock',
          })),
      });
      // Add order note in Shopify
    }
    updateReturn(rma, {
      status: 'refunded',
      refundAmount: refundData.total,
      refundNote: refundData.note,
      shopifyRefundError: null,
    });
    setShowRefundModal(false);
  }

  async function handleQuickRefund() {
    setQuickRefundProcessing(true);
    setQuickRefundError(null);
    try {
      if (!shop || !ret.shopifyOrderId) throw new Error('Shopify order not connected. Reconnect the shop and try again.');
      await processRefund(ret.shopifyOrderId, {
        notify: true,
        note: `Return ${ret.rma} — refunded via Returns App`,
        shipping: { full_refund: false, amount: '0' },
        refund_line_items: ret.items.map(i => ({
          line_item_id: i.id,
          quantity: i.quantity,
          restock_type: 'return',
        })),
      });
      const refundAmount = ret.items.reduce((s, i) => s + i.price * i.quantity, 0);
      updateReturn(rma, { status: 'refunded', refundAmount, shopifyRefundError: null });
      setShowQuickRefund(false);
    } catch (err) {
      setQuickRefundError(err.message || 'Shopify refund failed.');
    } finally {
      setQuickRefundProcessing(false);
    }
  }

  function handleReject() {
    updateReturn(rma, { status: 'rejected', rejectionReason: rejectReason, rejectionNote: rejectNote });
    if (shop && config.klaviyo?.enabled && config.klaviyo?.events?.return_rejected?.enabled) {
      sendKlaviyoEvent({
        shop,
        eventName: config.klaviyo.events.return_rejected.label,
        customer: ret.customer, returnData: ret,
        extra: { rejection_reason: rejectReason, rejection_note: rejectNote },
      }).catch(console.warn);
    }
    setShowRejectModal(false);
    setRejectReason(REJECT_REASONS[0]);
    setRejectNote('');
  }

  function handleRequestPhotos() {
    updateReturn(rma, { photoRequested: true });
    if (shop && config.klaviyo?.enabled && config.klaviyo?.events?.photo_requested?.enabled) {
      sendKlaviyoEvent({
        shop,
        eventName: config.klaviyo.events.photo_requested.label,
        customer: ret.customer, returnData: ret,
      }).catch(console.warn);
    }
  }

  const customerPhotos = ret.items.flatMap(item => (item.photos || []).map(p => ({ src: p, itemName: item.name })));
  const isFinalized = FINAL.includes(ret.status);
  const canAccept = ret.status === 'submitted';
  const canRefund = !isFinalized;
  const canReject = !isFinalized;
  const canRequestPhotos = !isFinalized && !ret.photoRequested;

  return (
    <div className="p-6 max-w-3xl">
      <BackBtn onBack={onBack} />

      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-mono">{ret.rma}</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Order {ret.orderNumber} · {ret.customer.name} · {ret.customer.email}
          </p>
        </div>
        <span className={`text-sm font-semibold px-3 py-1.5 rounded-full ${s.color}`}>{s.label}</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {/* Items */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
            <p className="text-sm font-semibold text-slate-700">Return Items</p>
          </div>
          <div className="divide-y divide-slate-100">
            {ret.items.map(item => (
              <div key={item.id} className="flex items-start gap-3 p-4">
                <img src={item.image} alt={item.name}
                  className="w-12 h-12 rounded-lg object-cover bg-slate-100 shrink-0"
                  onError={e => { e.target.style.display = 'none'; }} />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-900 text-sm truncate">{item.name}</p>
                  <p className="text-xs text-slate-500">{item.variant}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Reason: <span className="text-slate-700">{getReasonLabel(item.returnReason)}</span>
                  </p>
                  {item.returnNote && (
                    <p className="text-xs text-slate-500 italic mt-0.5">"{item.returnNote}"</p>
                  )}
                </div>
                <span className="text-sm font-semibold text-slate-700 shrink-0">${(item.price * item.quantity).toFixed(2)}</span>
              </div>
            ))}
          </div>
          <div className="px-4 py-3 border-t border-slate-100 bg-slate-50 flex justify-between">
            <span className="text-sm font-semibold text-slate-700">Refund amount</span>
            <span className="text-sm font-bold text-emerald-700">${ret.refundAmount.toFixed(2)}</span>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-3">
          {/* Tracking */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-slate-700">Tracking</p>
              {canSync && (
                <button onClick={handleSync} disabled={syncing}
                  className="flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-700 font-medium disabled:opacity-50 transition-colors">
                  <svg className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582M20 20v-5h-.581M5.635 15A9 9 0 1118.364 9H13" />
                  </svg>
                  {syncing ? 'Syncing...' : 'Sync'}
                </button>
              )}
            </div>
            {ret.tracking ? (
              <div>
                <p className="text-xs text-slate-500 font-medium mb-1">{ret.carrier}</p>
                <a href={getTrackingUrl(ret.carrier, ret.tracking)} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 font-mono text-sm font-semibold text-indigo-600 hover:text-indigo-800 hover:underline break-all transition-colors">
                  {ret.tracking}
                  <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
                {ret.lastSynced && (
                  <p className="text-xs text-slate-400 mt-1.5">
                    {syncing ? 'Syncing...' : `Last synced ${timeAgo(ret.lastSynced)}`}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-slate-400 italic">No tracking uploaded yet</p>
            )}
          </div>

          {/* Refund method */}
          {ret.refundMethod && (
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
              <p className="text-sm font-semibold text-slate-700 mb-2">Refund Method</p>
              <div className="flex items-center gap-2">
                <span className={`text-sm font-semibold px-2.5 py-1 rounded-full ${
                  ret.refundMethod === 'store_credit' ? 'bg-violet-100 text-violet-700' :
                  ret.refundMethod === 'exchange' ? 'bg-amber-100 text-amber-700' :
                  'bg-slate-100 text-slate-600'
                }`}>
                  {REFUND_METHOD_LABELS[ret.refundMethod] || ret.refundMethod}
                </span>
                {ret.refundMethod === 'exchange' && ret.exchangeOrderCreated && (
                  <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                    Exchange order created
                  </span>
                )}
              </div>
              {ret.refundMethod === 'exchange' && ret.exchangeVariant && (
                <div className="mt-2 pt-2 border-t border-slate-100">
                  <p className="text-xs text-slate-500">Requested variant</p>
                  <p className="text-sm font-medium text-slate-800 mt-0.5">{ret.exchangeVariant.title || ret.exchangeVariant.name}</p>
                </div>
              )}
              {ret.refundMethod === 'exchange' && ret.exchangeNote && (
                <p className="text-xs text-slate-500 mt-2 italic">"{ret.exchangeNote}"</p>
              )}
            </div>
          )}

          {/* Warehouse */}
          {wh && (
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
              <p className="text-sm font-semibold text-slate-700 mb-2">Destination Warehouse</p>
              <p className="text-sm text-slate-900 font-medium">{wh.name}</p>
              <p className="text-sm text-slate-500">{wh.address}, {wh.city}{wh.state ? `, ${wh.state}` : ''}</p>
              <p className="text-sm text-slate-500">{wh.country}</p>
            </div>
          )}

          {/* Dates */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <p className="text-sm font-semibold text-slate-700 mb-2">Timeline</p>
            <p className="text-xs text-slate-500">Submitted: <span className="text-slate-700">{new Date(ret.submittedAt).toLocaleDateString()}</span></p>
            <p className="text-xs text-slate-500 mt-1">Updated: <span className="text-slate-700">{new Date(ret.updatedAt).toLocaleDateString()}</span></p>
            {ret.shopifyRefundError && (
              <div className="mt-2 pt-2 border-t border-slate-100">
                <p className="text-xs text-red-600 font-medium">Shopify refund error</p>
                <p className="text-xs text-red-500 mt-0.5 break-words">{ret.shopifyRefundError}</p>
                <a
                  href={`https://${shop}/admin/orders/${ret.shopifyOrderId}`}
                  target="_blank" rel="noopener noreferrer"
                  className="text-xs text-indigo-600 underline mt-1 inline-block"
                >
                  Process manually in Shopify Admin →
                </a>
              </div>
            )}
            {ret.rejectionReason && (
              <div className="mt-2 pt-2 border-t border-slate-100">
                <p className="text-xs text-red-600 font-medium">Rejection: {ret.rejectionReason}</p>
                {ret.rejectionNote && <p className="text-xs text-slate-500 italic mt-0.5">"{ret.rejectionNote}"</p>}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Customer photos */}
      {customerPhotos.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden mb-4 shadow-sm">
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
            <p className="text-sm font-semibold text-slate-700">Customer Photos</p>
          </div>
          <div className="p-4 flex flex-wrap gap-3">
            {customerPhotos.map((p, i) => (
              <button key={i} onClick={() => setPhotoLightbox(p.src)}
                className="group relative w-20 h-20 rounded-lg overflow-hidden border border-slate-200 hover:border-indigo-400 transition-colors">
                <img src={p.src} alt={p.itemName} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                  <svg className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                  </svg>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Tracking events timeline */}
      {ret.trackingEvents?.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden mb-4 shadow-sm">
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-700">Shipment Events</p>
            <span className="text-xs text-slate-400">{ret.carrier} · auto-synced</span>
          </div>
          <div className="p-4">
            <div className="relative">
              <div className="absolute left-4 top-4 bottom-4 w-0.5 bg-slate-200 z-0" />
              <div className="space-y-4">
                {[...ret.trackingEvents].reverse().map((ev, i) => (
                  <div key={i} className="flex items-start gap-4 relative z-10">
                    <EventIcon type={ev.icon} />
                    <div className="flex-1 pt-1">
                      <p className="text-sm font-semibold text-slate-900">{ev.label}</p>
                      <p className="text-xs text-slate-500">{ev.detail}</p>
                    </div>
                    <p className="text-xs text-slate-400 pt-1 shrink-0 tabular-nums">{formatTs(ev.timestamp)}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Merchant Actions */}
      {!isFinalized && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <p className="text-sm font-semibold text-slate-700 mb-1">Actions</p>
          <p className="text-xs text-slate-400 mb-4">
            Tracking status updates automatically. Use these for manual actions.
          </p>
          <div className="flex flex-wrap gap-2">
            {canAccept && (
              <button onClick={handleAccept}
                className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Accept Return
              </button>
            )}
            {canRefund && ret.refundMethod !== 'exchange' && (
              <button onClick={() => { setShowQuickRefund(true); setQuickRefundError(null); }}
                className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Issue Refund in Shopify
              </button>
            )}
            {canRefund && ret.refundMethod === 'exchange' && (
              <button onClick={() => setShowRefundModal(true)}
                className="flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
                Create Exchange Order
              </button>
            )}
            {canReject && (
              <button onClick={() => setShowRejectModal(true)}
                className="flex items-center gap-1.5 border border-red-300 text-red-600 hover:bg-red-50 text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Reject
              </button>
            )}
            {canRequestPhotos && (
              <button onClick={handleRequestPhotos}
                className="flex items-center gap-1.5 border border-slate-300 text-slate-600 hover:bg-slate-50 text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Request Photos
              </button>
            )}
            {ret.photoRequested && !customerPhotos.length && (
              <span className="flex items-center gap-1.5 text-xs text-amber-600 font-medium bg-amber-50 border border-amber-200 px-3 py-2 rounded-lg">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Photos requested — awaiting customer upload
              </span>
            )}
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-1">Reject Return</h3>
            <p className="text-sm text-slate-500 mb-5">Select a rejection reason. The customer will be notified via email.</p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Rejection Reason *</label>
                <select value={rejectReason} onChange={e => setRejectReason(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent">
                  {REJECT_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Message to Customer <span className="text-slate-400 font-normal">(optional)</span></label>
                <textarea value={rejectNote} onChange={e => setRejectNote(e.target.value)}
                  placeholder="Provide additional context to the customer..."
                  rows={3}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent resize-none" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowRejectModal(false)}
                className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors">
                Cancel
              </button>
              <button onClick={handleReject}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-semibold py-2.5 transition-colors">
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Shopify Refund — one-click confirmation */}
      {showQuickRefund && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="font-bold text-slate-900">Issue Refund in Shopify</h3>
                <p className="text-xs text-slate-500">This will create a real refund on the Shopify order.</p>
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl px-4 py-3 mb-4 space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Customer</span>
                <span className="font-medium text-slate-900">{ret.customer.name}</span>
              </div>
              {ret.items.map(i => (
                <div key={i.id} className="flex justify-between text-sm">
                  <span className="text-slate-500 truncate mr-2">{i.name}{i.variant ? ` (${i.variant})` : ''} ×{i.quantity}</span>
                  <span className="font-medium text-slate-800 shrink-0">${(i.price * i.quantity).toFixed(2)}</span>
                </div>
              ))}
              <div className="border-t border-slate-200 pt-1.5 flex justify-between text-sm font-bold text-slate-900">
                <span>Total refund</span>
                <span>${ret.items.reduce((s, i) => s + i.price * i.quantity, 0).toFixed(2)} {ret.customer.currency || 'USD'}</span>
              </div>
            </div>

            <p className="text-xs text-slate-400 mb-4">Items will be restocked and the customer will be notified by Shopify.</p>

            {quickRefundError && (
              <div className="mb-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                <p className="text-xs font-semibold text-red-700 mb-0.5">Shopify refund failed</p>
                <p className="text-xs text-red-600 break-words">{quickRefundError}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => { setShowQuickRefund(false); setQuickRefundError(null); }}
                disabled={quickRefundProcessing}
                className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors disabled:opacity-50">
                Cancel
              </button>
              <button onClick={handleQuickRefund}
                disabled={quickRefundProcessing}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white rounded-lg text-sm font-semibold py-2.5 transition-colors flex items-center justify-center gap-2">
                {quickRefundProcessing
                  ? <><svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>Processing…</>
                  : 'Confirm Refund'
                }
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Refund Modal (exchange / custom) */}
      {showRefundModal && (
        <RefundModal
          ret={ret}
          shopifyConnected={!!shop}
          onConfirm={handleProcessRefund}
          onClose={() => setShowRefundModal(false)}
        />
      )}

      {/* Photo lightbox */}
      {photoLightbox && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setPhotoLightbox(null)}>
          <img src={photoLightbox} alt="Customer photo" className="max-w-full max-h-full rounded-xl shadow-2xl object-contain" />
        </div>
      )}
    </div>
  );
}

function RefundModal({ ret, shopifyConnected, onConfirm, onClose }) {
  const [lineItems, setLineItems] = useState(
    ret.items.map(item => ({ ...item, included: true, qty: item.quantity || 1 }))
  );
  const [shippingAmount, setShippingAmount] = useState('0.00');
  const [restock, setRestock] = useState(true);
  const [notify, setNotify] = useState(true);
  const [note, setNote] = useState('Return processed via Returns Center');
  const [customAmount, setCustomAmount] = useState('');
  const [useCustomAmount, setUseCustomAmount] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [shopifyError, setShopifyError] = useState(null);

  const lineTotal = lineItems
    .filter(li => li.included)
    .reduce((sum, li) => sum + li.price * li.qty, 0);
  const shipping = parseFloat(shippingAmount) || 0;
  const calculatedTotal = lineTotal + shipping;
  const total = useCustomAmount ? (parseFloat(customAmount) || 0) : calculatedTotal;

  function setItemQty(id, qty) {
    setLineItems(prev => prev.map(li => li.id === id ? { ...li, qty: Math.max(1, Math.min(qty, li.quantity || 1)) } : li));
  }

  function toggleItem(id) {
    setLineItems(prev => prev.map(li => li.id === id ? { ...li, included: !li.included } : li));
  }

  async function handleSubmit() {
    setProcessing(true);
    setShopifyError(null);
    try {
      await onConfirm({ lineItems, shippingAmount, restock, notify, note, total });
    } catch (err) {
      setShopifyError(err.message || 'Shopify refund failed. Check order in Shopify Admin.');
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg my-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div>
            <h3 className="text-base font-bold text-slate-900">Process Refund</h3>
            <p className="text-xs text-slate-500 mt-0.5">{ret.rma} · {ret.customer.name}</p>
          </div>
          {shopifyConnected && (
            <span className="flex items-center gap-1.5 text-xs font-semibold bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Shopify connected
            </span>
          )}
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Line items */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Items to Refund</p>
            <div className="space-y-2">
              {lineItems.map(li => (
                <div key={li.id} className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${li.included ? 'border-indigo-200 bg-indigo-50/50' : 'border-slate-200 bg-slate-50 opacity-60'}`}>
                  <button type="button" onClick={() => toggleItem(li.id)}
                    className={`w-5 h-5 rounded border-2 shrink-0 flex items-center justify-center transition-colors ${li.included ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300'}`}>
                    {li.included && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                  </button>
                  <img src={li.image} alt={li.name} className="w-10 h-10 rounded-lg object-cover bg-slate-100 shrink-0"
                    onError={e => { e.target.style.display = 'none'; }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{li.name}</p>
                    <p className="text-xs text-slate-500">{li.variant}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-xs text-slate-500">Qty</span>
                    <input
                      type="number"
                      min={1}
                      max={li.quantity || 1}
                      value={li.qty}
                      onChange={e => setItemQty(li.id, parseInt(e.target.value) || 1)}
                      disabled={!li.included}
                      className="w-12 text-center border border-slate-300 rounded-lg text-sm py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-40"
                    />
                    <span className="text-sm font-semibold text-slate-700 w-14 text-right">${(li.price * li.qty).toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Shipping refund */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Shipping Refund</p>
            <div className="flex items-center gap-3">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">$</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={shippingAmount}
                  onChange={e => setShippingAmount(e.target.value)}
                  className="pl-7 pr-3 py-2 border border-slate-300 rounded-lg text-sm w-28 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <span className="text-xs text-slate-500">Enter 0 to skip shipping refund</span>
            </div>
          </div>

          {/* Options row */}
          <div className="grid grid-cols-2 gap-3">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <div className={`w-10 h-6 rounded-full transition-colors relative shrink-0 ${restock ? 'bg-indigo-600' : 'bg-slate-200'}`}
                onClick={() => setRestock(p => !p)}>
                <div className={`w-4 h-4 bg-white rounded-full shadow absolute top-1 transition-transform ${restock ? 'translate-x-5' : 'translate-x-1'}`} />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-700">Restock items</p>
                <p className="text-xs text-slate-400">Return to inventory</p>
              </div>
            </label>
            <label className="flex items-center gap-2.5 cursor-pointer">
              <div className={`w-10 h-6 rounded-full transition-colors relative shrink-0 ${notify ? 'bg-indigo-600' : 'bg-slate-200'}`}
                onClick={() => setNotify(p => !p)}>
                <div className={`w-4 h-4 bg-white rounded-full shadow absolute top-1 transition-transform ${notify ? 'translate-x-5' : 'translate-x-1'}`} />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-700">Notify customer</p>
                <p className="text-xs text-slate-400">Send Shopify email</p>
              </div>
            </label>
          </div>

          {/* Custom amount override */}
          <div>
            <label className="flex items-center gap-2 mb-2 cursor-pointer">
              <input type="checkbox" checked={useCustomAmount} onChange={e => setUseCustomAmount(e.target.checked)}
                className="w-4 h-4 rounded accent-indigo-600" />
              <span className="text-sm font-medium text-slate-700">Override with custom amount</span>
            </label>
            {useCustomAmount && (
              <div className="relative w-40">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">$</span>
                <input type="number" min="0" step="0.01" value={customAmount}
                  onChange={e => setCustomAmount(e.target.value)} placeholder="0.00"
                  className="pl-7 pr-3 py-2 border border-slate-300 rounded-lg text-sm w-full focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
            )}
          </div>

          {/* Note */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Internal Note</label>
            <input type="text" value={note} onChange={e => setNote(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>

          {/* Total */}
          <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
            <span className="text-sm font-semibold text-emerald-800">Total refund</span>
            <span className="text-xl font-bold text-emerald-700">${total.toFixed(2)}</span>
          </div>
        </div>

        {/* Shopify error */}
        {shopifyError && (
          <div className="mx-6 mb-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <p className="text-xs font-semibold text-red-700 mb-1">Shopify error — refund was not processed</p>
            <p className="text-xs text-red-600 break-words">{shopifyError}</p>
          </div>
        )}

        {/* Footer */}
        <div className="px-6 pb-5 flex gap-3">
          <button onClick={onClose} disabled={processing}
            className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors disabled:opacity-50">
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={processing}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white rounded-lg text-sm font-semibold py-2.5 transition-colors flex items-center justify-center gap-2">
            {processing && <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>}
            {shopifyConnected ? `Process $${total.toFixed(2)} via Shopify` : `Mark as Refunded · $${total.toFixed(2)}`}
          </button>
        </div>
      </div>
    </div>
  );
}

function BackBtn({ onBack }) {
  return (
    <button onClick={onBack}
      className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-5 transition-colors">
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
      </svg>
      Back to Returns
    </button>
  );
}
