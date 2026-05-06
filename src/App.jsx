import { useState, useRef, Component } from 'react';
import { MerchantProvider, useMerchant } from './merchant/MerchantContext';
import OrderLookup from './steps/OrderLookup';
import ItemSelection from './steps/ItemSelection';
import RefundMethodStep from './steps/RefundMethodStep';
import WarehouseStep from './steps/WarehouseStep';
import ReviewSubmit from './steps/ReviewSubmit';
import Confirmation from './steps/Confirmation';
import UploadTracking from './steps/UploadTracking';

function generateRMA() {
  return 'RMA-' + Math.random().toString(36).slice(2, 8).toUpperCase();
}

function CustomerPortal() {
  const { config, addReturn } = useMerchant();
  const [step, setStep] = useState('lookup');
  const [order, setOrder] = useState(null);
  const [returnItems, setReturnItems] = useState([]);
  const [refundMethod, setRefundMethod] = useState(null);
  const [selectedWarehouse, setSelectedWarehouse] = useState(null);
  const rmaRef = useRef(null);
  const [uploadRma, setUploadRma] = useState(null);

  const store = config.store;
  const primaryColor = store.primaryColor || '#4f46e5';
  const bgColor = store.bgColor || '#f5f5f5';
  const font = store.fontFamily || 'Inter';

  const activeWarehouses = (config.warehouses || []).filter(w => w.active !== false);
  const refundConfig = config.refund || { offerStoreCredit: true, storeCreditBonusPct: 10, offerExchange: true };

  function reset() {
    setStep('lookup');
    setOrder(null);
    setReturnItems([]);
    setRefundMethod(null);
    setSelectedWarehouse(null);
    rmaRef.current = null;
  }

  function handleItemsDone(items) {
    setReturnItems(items);
    setStep('refund_method');
  }

  function handleRefundMethodDone(method) {
    setRefundMethod(method);
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
      orderNumber: order.orderNumber,
      customer: { name: order.customer.name, email: order.email },
      items: returnItems,
      warehouseId: selectedWarehouse?.id || null,
      refundMethod: refundMethod?.method || 'original',
      exchangeNote: refundMethod?.exchangeNote || null,
      status: 'submitted',
      tracking: null,
      carrier: null,
      submittedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      refundAmount: returnItems.reduce((s, i) => s + i.price * i.quantity, 0),
    });
    setStep('confirm');
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: bgColor, fontFamily: font }}>
      {(step === 'lookup' || (step === 'items' && !order)) && (
        <OrderLookup
          onOrderFound={o => { setOrder(o); setStep('items'); }}
          onUploadTracking={rma => { setUploadRma(rma); setStep('upload_tracking'); }}
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
          onBack={() => setStep(activeWarehouses.length > 0 ? 'warehouse' : 'refund_method')}
        />
      )}

      {step === 'confirm' && order && rmaRef.current && (
        <Confirmation
          order={order}
          returnItems={returnItems}
          warehouseId={selectedWarehouse?.id || null}
          rma={rmaRef.current}
          onUploadTracking={() => { setUploadRma(rmaRef.current); setStep('upload_tracking'); }}
          onStartNew={reset}
        />
      )}

      {step === 'upload_tracking' && uploadRma && (
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
