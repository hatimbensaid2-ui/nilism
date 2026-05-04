import { useState, useRef } from 'react';
import { MerchantProvider, useMerchant } from './merchant/MerchantContext';
import MerchantApp from './merchant/MerchantApp';
import PortalHeader from './components/PortalHeader';
import ProgressBar from './components/ProgressBar';
import PortalFooter from './components/PortalFooter';
import OrderLookup from './steps/OrderLookup';
import ItemSelection from './steps/ItemSelection';
import ReturnReason from './steps/ReturnReason';
import WarehouseSelection from './steps/WarehouseSelection';
import ReviewSubmit from './steps/ReviewSubmit';
import Confirmation from './steps/Confirmation';
import ReturnStatus from './steps/ReturnStatus';
import UploadTracking from './steps/UploadTracking';

function generateRMA() {
  return 'RMA-' + Math.random().toString(36).slice(2, 8).toUpperCase();
}

const PROGRESS_STEP = { items: 1, reason: 2, warehouse: 3, review: 4 };

function CustomerPortal({ onGoMerchant }) {
  const { config, addReturn } = useMerchant();
  const [step, setStep] = useState('lookup');
  const [order, setOrder] = useState(null);
  const [selectedItemIds, setSelectedItemIds] = useState([]);
  const [returnItems, setReturnItems] = useState([]);
  const [warehouseId, setWarehouseId] = useState(null);
  const rmaRef = useRef(null);
  const [uploadRma, setUploadRma] = useState(null);

  const showProgress = ['items', 'reason', 'warehouse', 'review'].includes(step);

  function reset() {
    setStep('lookup');
    setOrder(null);
    setSelectedItemIds([]);
    setReturnItems([]);
    setWarehouseId(null);
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
      warehouseId,
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
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <PortalHeader
        storeName={config.store.name}
        logoUrl={config.store.logoUrl}
      />

      {showProgress && <ProgressBar currentStep={PROGRESS_STEP[step]} />}

      <main className="flex-1">
        {step === 'lookup' && (
          <OrderLookup
            onOrderFound={o => { setOrder(o); setStep('items'); }}
            onUploadTracking={rma => { setUploadRma(rma); setStep('upload_tracking'); }}
          />
        )}

        {step === 'items' && order && (
          <ItemSelection
            order={order}
            onNext={ids => { setSelectedItemIds(ids); setStep('reason'); }}
            onBack={reset}
          />
        )}

        {step === 'reason' && order && (
          <ReturnReason
            order={order}
            selectedItemIds={selectedItemIds}
            onNext={items => { setReturnItems(items); setStep('warehouse'); }}
            onBack={() => setStep('items')}
          />
        )}

        {step === 'warehouse' && (
          <WarehouseSelection
            onNext={wh => { setWarehouseId(wh); setStep('review'); }}
            onBack={() => setStep('reason')}
          />
        )}

        {step === 'review' && order && (
          <ReviewSubmit
            order={order}
            returnItems={returnItems}
            warehouseId={warehouseId}
            onSubmit={handleSubmit}
            onBack={() => setStep('warehouse')}
          />
        )}

        {step === 'confirm' && order && rmaRef.current && (
          <Confirmation
            order={order}
            returnItems={returnItems}
            warehouseId={warehouseId}
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

        {step === 'status' && order && (
          <ReturnStatus
            order={order}
            returnItems={returnItems}
            onBack={() => setStep('confirm')}
          />
        )}
      </main>

      <PortalFooter />

      {/* Merchant access link */}
      <div className="text-center pb-3">
        <button
          onClick={onGoMerchant}
          className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
        >
          Merchant Dashboard
        </button>
      </div>
    </div>
  );
}

export default function App() {
  const [view, setView] = useState(() =>
    window.location.hash === '#merchant' ? 'merchant' : 'portal'
  );

  function goMerchant() {
    window.location.hash = 'merchant';
    setView('merchant');
  }

  function goPortal() {
    window.location.hash = '';
    setView('portal');
  }

  return (
    <MerchantProvider>
      {view === 'merchant'
        ? <MerchantApp onViewPortal={goPortal} />
        : <CustomerPortal onGoMerchant={goMerchant} />
      }
    </MerchantProvider>
  );
}
