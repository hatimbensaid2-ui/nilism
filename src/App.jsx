import { useState, useRef } from 'react';
import { MerchantProvider, useMerchant } from './merchant/MerchantContext';
import OrderLookup from './steps/OrderLookup';
import ItemSelection from './steps/ItemSelection';
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
  const rmaRef = useRef(null);
  const [uploadRma, setUploadRma] = useState(null);

  const store = config.store;
  const primaryColor = store.primaryColor || '#4f46e5';
  const bgColor = store.bgColor || '#f5f5f5';
  const font = store.fontFamily || 'Inter';

  function reset() {
    setStep('lookup');
    setOrder(null);
    setReturnItems([]);
    rmaRef.current = null;
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
      warehouseId: null,
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
    <div
      className="min-h-screen"
      style={{ backgroundColor: bgColor, fontFamily: font }}
    >
      {step === 'lookup' && (
        <OrderLookup
          onOrderFound={o => { setOrder(o); setStep('items'); }}
          onUploadTracking={rma => { setUploadRma(rma); setStep('upload_tracking'); }}
        />
      )}

      {step === 'items' && order && (
        <ItemSelection
          order={order}
          primaryColor={primaryColor}
          onNext={items => { setReturnItems(items); setStep('review'); }}
          onBack={reset}
        />
      )}

      {step === 'review' && order && (
        <ReviewSubmit
          order={order}
          returnItems={returnItems}
          primaryColor={primaryColor}
          onSubmit={handleSubmit}
          onBack={() => setStep('items')}
        />
      )}

      {step === 'confirm' && order && rmaRef.current && (
        <Confirmation
          order={order}
          returnItems={returnItems}
          warehouseId={null}
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

export default function App() {
  return (
    <MerchantProvider>
      <CustomerPortal />
    </MerchantProvider>
  );
}
