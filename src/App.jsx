import { useState } from 'react';
import PortalHeader from './components/PortalHeader';
import ProgressBar from './components/ProgressBar';
import PortalFooter from './components/PortalFooter';
import OrderLookup from './steps/OrderLookup';
import ItemSelection from './steps/ItemSelection';
import ReturnReason from './steps/ReturnReason';
import ReturnMethod from './steps/ReturnMethod';
import ReviewSubmit from './steps/ReviewSubmit';
import Confirmation from './steps/Confirmation';
import ReturnStatus from './steps/ReturnStatus';

const PROGRESS_STEP = { lookup: 0, items: 1, reason: 2, method: 3, review: 4 };

export default function App() {
  const [step, setStep] = useState('lookup');
  const [order, setOrder] = useState(null);
  const [selectedItemIds, setSelectedItemIds] = useState([]);
  const [returnItems, setReturnItems] = useState([]);
  const [methodId, setMethodId] = useState(null);

  const showProgress = ['items', 'reason', 'method', 'review'].includes(step);

  function reset() {
    setStep('lookup');
    setOrder(null);
    setSelectedItemIds([]);
    setReturnItems([]);
    setMethodId(null);
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <PortalHeader storeName="My Store" />

      {showProgress && <ProgressBar currentStep={PROGRESS_STEP[step]} />}

      <main className="flex-1">
        {step === 'lookup' && (
          <OrderLookup
            onOrderFound={foundOrder => {
              setOrder(foundOrder);
              setStep('items');
            }}
          />
        )}

        {step === 'items' && order && (
          <ItemSelection
            order={order}
            onNext={ids => {
              setSelectedItemIds(ids);
              setStep('reason');
            }}
            onBack={reset}
          />
        )}

        {step === 'reason' && order && (
          <ReturnReason
            order={order}
            selectedItemIds={selectedItemIds}
            onNext={items => {
              setReturnItems(items);
              setStep('method');
            }}
            onBack={() => setStep('items')}
          />
        )}

        {step === 'method' && (
          <ReturnMethod
            onNext={method => {
              setMethodId(method);
              setStep('review');
            }}
            onBack={() => setStep('reason')}
          />
        )}

        {step === 'review' && order && (
          <ReviewSubmit
            order={order}
            returnItems={returnItems}
            methodId={methodId}
            onSubmit={() => setStep('confirm')}
            onBack={() => setStep('method')}
          />
        )}

        {step === 'confirm' && order && (
          <Confirmation
            order={order}
            returnItems={returnItems}
            methodId={methodId}
            onTrackReturn={() => setStep('status')}
            onStartNew={reset}
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
    </div>
  );
}
