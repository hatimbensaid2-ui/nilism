import { useState, useRef, Component } from 'react';
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
      {step === 'items' && !order && (
        <OrderLookup
          onOrderFound={o => { setOrder(o); setStep('items'); }}
          onUploadTracking={rma => { setUploadRma(rma); setStep('upload_tracking'); }}
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
