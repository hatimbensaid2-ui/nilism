import { useState, useRef, Component } from 'react';
import { MerchantProvider, useMerchant } from './merchant/MerchantContext';
import OrderLookup from './steps/OrderLookup';
import ItemSelection from './steps/ItemSelection';
import RefundMethodStep from './steps/RefundMethodStep';
import WarehouseStep from './steps/WarehouseStep';
import ReviewSubmit from './steps/ReviewSubmit';
import Confirmation from './steps/Confirmation';
import UploadTracking from './steps/UploadTracking';
import CustomerReturnStatus from './steps/CustomerReturnStatus';
import ExchangeStep from './steps/ExchangeStep';
import { lookupReturnByOrder } from './utils/returnsApi';

function generateRMA() {
  return 'RMA-' + Math.random().toString(36).slice(2, 8).toUpperCase();
}

function checkEligibility(order, config) {
  const windowDays = config.store?.returnWindowDays || 30;

  // Not yet fulfilled
  const status = order.fulfillmentStatus;
  if (!status || status === 'unfulfilled' || status === 'partial') {
    return { ok: false, reason: 'in_transit' };
  }

  // Fulfilled but not yet delivered — wait for delivery before allowing return
  if (status === 'fulfilled' && !order.isDelivered) {
    return { ok: false, reason: 'in_transit' };
  }

  // Return window starts from DELIVERY date (not ship date)
  const windowStartDate = order.deliveredAt || order.fulfilledAt;
  if (windowStartDate) {
    const startMs = new Date(windowStartDate).getTime();
    const daysSince = (Date.now() - startMs) / (1000 * 60 * 60 * 24);
    if (daysSince > windowDays) {
      return { ok: false, reason: 'expired', windowDays, daysSince: Math.floor(daysSince) };
    }
  }

  return { ok: true };
}

function IneligibleScreen({ reason, windowDays, onBack, primaryColor }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10 bg-gray-50">
      <div className="w-full max-w-md bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-gray-100 mb-4">
          <svg className="w-7 h-7 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        {reason === 'in_transit' ? (
          <>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Order Not Yet Delivered</h2>
            <p className="text-sm text-gray-500">
              Your order hasn't been delivered yet. Returns can only be started after your package is marked as delivered. Please check back once you've received it.
            </p>
          </>
        ) : (
          <>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Return Window Expired</h2>
            <p className="text-sm text-gray-500">
              This order is no longer eligible for a return. Our return policy allows returns within{' '}
              <strong>{windowDays} days</strong> of delivery.
            </p>
          </>
        )}
        <button
          onClick={onBack}
          className="mt-6 w-full py-3 rounded-xl text-sm font-semibold text-white"
          style={{ backgroundColor: primaryColor || '#4f46e5' }}
        >
          Go Back
        </button>
      </div>
    </div>
  );
}

function CustomerPortal() {
  const { config, addReturn } = useMerchant();
  const [step, setStep] = useState('lookup');
  const [order, setOrder] = useState(null);
  const [returnItems, setReturnItems] = useState([]);
  const [refundMethod, setRefundMethod] = useState(null);
  const [selectedWarehouse, setSelectedWarehouse] = useState(null);
  const [existingReturn, setExistingReturn] = useState(null);
  const [ineligibleReason, setIneligibleReason] = useState(null);
  const rmaRef = useRef(null);
  const [uploadRma, setUploadRma] = useState(null);

  const store = config.store;
  const primaryColor = store.primaryColor || '#4f46e5';
  const bgColor = store.bgColor || '#f5f5f5';
  const font = store.fontFamily || 'Inter';
  const shop = new URLSearchParams(window.location.search).get('shop');

  const activeWarehouses = (config.warehouses || []).filter(w => w.active !== false);
  const refundConfig = config.refund || { offerStoreCredit: true, storeCreditBonusPct: 10, offerExchange: true };

  function reset() {
    setStep('lookup');
    setOrder(null);
    setReturnItems([]);
    setRefundMethod(null);
    setSelectedWarehouse(null);
    setExistingReturn(null);
    setIneligibleReason(null);
    rmaRef.current = null;
  }

  async function handleOrderFound(o) {
    setOrder(o);

    // Check return eligibility first
    const eligibility = checkEligibility(o, config);
    if (!eligibility.ok) {
      setIneligibleReason(eligibility);
      setStep('ineligible');
      return;
    }

    // Check if a return already exists for this order
    if (shop) {
      try {
        const result = await lookupReturnByOrder(shop, o.id);
        if (result?.found && result?.return) {
          setExistingReturn(result.return);
          setStep('return_status');
          return;
        }
      } catch { /* network error — proceed to items */ }
    }

    setStep('items');
  }

  function handleItemsDone(items) {
    setReturnItems(items);
    setStep('refund_method');
  }

  function handleRefundMethodDone(method) {
    // If exchange and there are exchangeable items (per-reason config), go to exchange step
    if (method.method === 'exchange') {
      const reasons = config.returnReasons || [];
      const exchangeableItems = returnItems.filter(i => {
        const r = reasons.find(r => r.id === i.returnReason);
        if (r) return r.allowExchange;
        return i.returnReason === 'wrong_size' || i.returnReason === 'ordered_multiple';
      });
      if (exchangeableItems.length > 0) {
        setRefundMethod(method);
        setStep('exchange');
        return;
      }
    }
    setRefundMethod(method);
    if (activeWarehouses.length > 0) setStep('warehouse');
    else setStep('review');
  }

  function handleExchangeDone(exchangeData) {
    setRefundMethod(exchangeData);
    if (activeWarehouses.length > 0) setStep('warehouse');
    else setStep('review');
  }

  function handleWarehouseDone(warehouse) {
    setSelectedWarehouse(warehouse);
    setStep('review');
  }

  function handleSubmit() {
    const rma = generateRMA();
    rmaRef.current = rma;
    addReturn({
      rma,
      orderId: order.id,
      shopifyOrderId: order.id,
      orderNumber: order.orderNumber,
      customer: { name: order.customer.name, email: order.email },
      items: returnItems,
      warehouseId: selectedWarehouse?.id || null,
      refundMethod: refundMethod?.method || 'original',
      exchangeNote: refundMethod?.exchangeNote || null,
      exchangeVariant: refundMethod?.exchangeVariant || null,
      status: 'submitted',
      tracking: null,
      carrier: null,
      submittedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      refundAmount: refundMethod?.method === 'exchange' ? 0 : returnItems.reduce((s, i) => s + i.price * i.quantity, 0),
    });
    setStep('confirm');
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: bgColor, fontFamily: font }}>
      {(step === 'lookup' || (step === 'items' && !order)) && (
        <OrderLookup
          onOrderFound={handleOrderFound}
          onUploadTracking={rma => { setUploadRma(rma); setStep('upload_tracking'); }}
        />
      )}

      {step === 'ineligible' && (
        <IneligibleScreen
          reason={ineligibleReason?.reason}
          windowDays={ineligibleReason?.windowDays}
          primaryColor={primaryColor}
          onBack={reset}
        />
      )}

      {step === 'return_status' && existingReturn && (
        <CustomerReturnStatus
          returnData={existingReturn}
          primaryColor={primaryColor}
          onUploadTracking={() => { setUploadRma(existingReturn.rma); setStep('upload_tracking'); }}
          onStartNew={reset}
        />
      )}

      {step === 'items' && order && (
        <ItemSelection
          order={order}
          primaryColor={primaryColor}
          onNext={handleItemsDone}
          onBack={reset}
        />
      )}

      {step === 'refund_method' && (
        <RefundMethodStep
          returnItems={returnItems}
          primaryColor={primaryColor}
          offerStoreCredit={refundConfig.offerStoreCredit}
          storeCreditBonusPct={refundConfig.storeCreditBonusPct}
          offerExchange={refundConfig.offerExchange}
          onNext={handleRefundMethodDone}
          onBack={() => setStep('items')}
        />
      )}

      {step === 'exchange' && (
        <ExchangeStep
          returnItems={returnItems}
          primaryColor={primaryColor}
          onNext={handleExchangeDone}
          onBack={() => setStep('refund_method')}
        />
      )}

      {step === 'warehouse' && (
        <WarehouseStep
          warehouses={activeWarehouses}
          primaryColor={primaryColor}
          onNext={handleWarehouseDone}
          onBack={() => setStep('refund_method')}
        />
      )}

      {step === 'review' && order && (
        <ReviewSubmit
          order={order}
          returnItems={returnItems}
          refundMethod={refundMethod}
          selectedWarehouse={selectedWarehouse}
          primaryColor={primaryColor}
          onSubmit={handleSubmit}
          onBack={() => {
        if (refundMethod?.method === 'exchange') setStep('exchange');
        else if (activeWarehouses.length > 0) setStep('warehouse');
        else setStep('refund_method');
      }}
        />
      )}

      {step === 'confirm' && order && rmaRef.current && (
        <Confirmation
          order={order}
          returnItems={returnItems}
          warehouseId={selectedWarehouse?.id || null}
          refundMethod={refundMethod}
          rma={rmaRef.current}
          onUploadTracking={() => { setUploadRma(rmaRef.current); setStep('upload_tracking'); }}
          onStartNew={reset}
        />
      )}

      {step === 'upload_tracking' && (
        <UploadTracking
          rma={uploadRma}
          onDone={reset}
          onBack={() => setStep(rmaRef.current ? 'confirm' : 'lookup')}
        />
      )}
    </div>
  );
}

class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(err) { return { error: err }; }
  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
            <p className="text-gray-700 font-medium mb-2">Something went wrong loading the portal.</p>
            <p className="text-sm text-gray-400 mb-4">{this.state.error?.message}</p>
            <button
              onClick={() => { this.setState({ error: null }); window.location.reload(); }}
              className="text-sm text-indigo-600 underline"
            >
              Try again
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <MerchantProvider>
        <CustomerPortal />
      </MerchantProvider>
    </ErrorBoundary>
  );
}
