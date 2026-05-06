import { useRef, useState, useCallback } from 'react';
import { useMerchant } from '../merchant/MerchantContext';
import { DEFAULT_RETURN_REASONS } from '../data/mockOrders';

// ── Item modal sub-steps ──────────────────────────────────────────────────────

function ItemPanel({ item }) {
  return (
    <div className="w-72 shrink-0 bg-gray-50 border-r border-gray-100 flex flex-col items-center justify-center p-8 gap-4">
      {item.image ? (
        <img src={item.image} alt={item.name} className="w-40 h-40 object-contain rounded-xl" />
      ) : (
        <div className="w-40 h-40 bg-gray-200 rounded-xl flex items-center justify-center">
          <svg className="w-12 h-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
      )}
      <div className="text-center">
        <p className="font-bold text-gray-900 text-sm leading-snug">{item.name}</p>
        {item.variant && <p className="text-xs text-gray-400 mt-0.5">{item.variant}</p>}
        <p className="text-sm text-gray-600 mt-2">${item.price.toFixed(2)} x {item.quantity}</p>
      </div>
    </div>
  );
}

function ReasonStep({ item, primary, onNext, onBack, onClose }) {
  const { config } = useMerchant();
  const reasons = (config.returnReasons || DEFAULT_RETURN_REASONS).filter(r => r.enabled);
  const [selected, setSelected] = useState(null);

  return (
    <div className="flex flex-1 overflow-hidden rounded-2xl shadow-xl bg-white max-h-[90vh]">
      <ItemPanel item={item} />
      <div className="flex-1 flex flex-col">
        <div className="flex items-center justify-between px-6 pt-6 pb-2">
          <button onClick={onBack} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="px-8 pb-2">
          <h2 className="text-xl font-bold text-gray-900">Why are you returning this item?</h2>
        </div>
        <div className="flex-1 overflow-y-auto px-8 py-4 space-y-2.5">
          {reasons.map(r => (
            <button
              key={r.id}
              onClick={() => setSelected(r.id)}
              className="w-full text-left px-5 py-4 rounded-xl border-2 text-sm font-medium transition-all"
              style={selected === r.id
                ? { borderColor: primary, backgroundColor: primary + '08', color: '#111' }
                : { borderColor: '#e5e7eb', color: '#374151' }
              }
            >
              {r.label}
            </button>
          ))}
        </div>
        <div className="px-8 pb-6 pt-3">
          <button
            onClick={() => selected && onNext(selected)}
            disabled={!selected}
            className="w-full py-3.5 rounded-xl text-sm font-semibold text-white transition-opacity disabled:opacity-40"
            style={{ backgroundColor: primary }}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

function QuantityStep({ item, primary, onNext, onBack, onClose }) {
  const [qty, setQty] = useState(item.quantity);
  return (
    <div className="flex flex-1 overflow-hidden rounded-2xl shadow-xl bg-white max-h-[90vh]">
      <ItemPanel item={item} />
      <div className="flex-1 flex flex-col">
        <div className="flex items-center justify-between px-6 pt-6 pb-2">
          <button onClick={onBack} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="px-8 pb-2">
          <h2 className="text-xl font-bold text-gray-900">How many do you want to return?</h2>
        </div>
        <div className="flex-1 flex items-start px-8 pt-6">
          <div className="flex items-center gap-0 rounded-full border border-gray-200 overflow-hidden">
            <button
              onClick={() => setQty(q => Math.max(1, q - 1))}
              className="w-12 h-12 flex items-center justify-center text-gray-500 hover:bg-gray-50 text-xl font-light transition-colors"
            >
              −
            </button>
            <span className="w-16 text-center text-lg font-semibold text-gray-900">{qty}</span>
            <button
              onClick={() => setQty(q => Math.min(item.quantity, q + 1))}
              className="w-12 h-12 flex items-center justify-center text-gray-500 hover:bg-gray-50 text-xl font-light transition-colors"
            >
              +
            </button>
          </div>
        </div>
        <div className="px-8 pb-6 pt-3">
          <button
            onClick={() => onNext(qty)}
            className="w-full py-3.5 rounded-xl text-sm font-semibold text-white"
            style={{ backgroundColor: primary }}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

function PhotoStep({ item, primary, onNext, onBack, onClose }) {
  const [photos, setPhotos] = useState([]);
  const inputRef = useRef(null);

  const handleFiles = useCallback(files => {
    const allowed = Array.from(files).filter(f => f.type.startsWith('image/'));
    allowed.forEach(file => {
      const reader = new FileReader();
      reader.onload = e => setPhotos(prev => [...prev, { url: e.target.result, name: file.name }]);
      reader.readAsDataURL(file);
    });
  }, []);

  return (
    <div className="flex flex-1 overflow-hidden rounded-2xl shadow-xl bg-white max-h-[90vh]">
      <ItemPanel item={item} />
      <div className="flex-1 flex flex-col">
        <div className="flex items-center justify-between px-6 pt-6 pb-2">
          <button onClick={onBack} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="px-8 pb-2">
          <h2 className="text-xl font-bold text-gray-900">Add photos</h2>
          <p className="text-sm text-gray-400 mt-1">Please upload photos showing the issue with your item.</p>
        </div>
        <div className="flex-1 overflow-y-auto px-8 py-4">
          <div
            className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center cursor-pointer hover:border-gray-300 transition-colors"
            onClick={() => inputRef.current?.click()}
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
          >
            <svg className="w-8 h-8 text-gray-300 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-sm text-gray-500">Click or drag photos here</p>
            <p className="text-xs text-gray-400 mt-1">JPG, PNG, WEBP up to 10MB each</p>
            <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={e => handleFiles(e.target.files)} />
          </div>
          {photos.length > 0 && (
            <div className="grid grid-cols-3 gap-2 mt-4">
              {photos.map((p, i) => (
                <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-gray-100 group">
                  <img src={p.url} alt={p.name} className="w-full h-full object-cover" />
                  <button
                    onClick={() => setPhotos(prev => prev.filter((_, j) => j !== i))}
                    className="absolute top-1 right-1 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="px-8 pb-6 pt-3 space-y-2">
          <button
            onClick={() => onNext(photos)}
            disabled={photos.length === 0}
            className="w-full py-3.5 rounded-xl text-sm font-semibold text-white transition-opacity disabled:opacity-40"
            style={{ backgroundColor: primary }}
          >
            Next ({photos.length} photo{photos.length !== 1 ? 's' : ''})
          </button>
          <button onClick={() => onNext([])} className="w-full text-xs text-gray-400 hover:text-gray-600 py-1">
            Skip for now
          </button>
        </div>
      </div>
    </div>
  );
}

// Per-item mini-flow: reason → quantity → photo (if required)
function ItemModal({ item, primary, onDone, onClose }) {
  const { config } = useMerchant();
  const reasons = config.returnReasons || DEFAULT_RETURN_REASONS;
  const [subStep, setSubStep] = useState('reason');
  const [reason, setReason] = useState(null);
  const [qty, setQty] = useState(null);

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="w-full max-w-2xl" onClick={e => e.stopPropagation()}>
        {subStep === 'reason' && (
          <ReasonStep item={item} primary={primary} onNext={r => { setReason(r); setSubStep('qty'); }} onBack={onClose} onClose={onClose} />
        )}
        {subStep === 'qty' && (
          <QuantityStep
            item={item}
            primary={primary}
            onNext={q => {
              setQty(q);
              const needsPhoto = !!reasons.find(r => r.id === reason)?.requiresPhotos;
              if (needsPhoto) setSubStep('photo');
              else onDone({ reason, qty: q, photos: [] });
            }}
            onBack={() => setSubStep('reason')}
            onClose={onClose}
          />
        )}
        {subStep === 'photo' && (
          <PhotoStep item={item} primary={primary} onNext={photos => onDone({ reason, qty, photos })} onBack={() => setSubStep('qty')} onClose={onClose} />
        )}
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function ItemSelection({ order, primaryColor, onNext, onBack }) {
  const { config } = useMerchant();
  const reasons = config.returnReasons || DEFAULT_RETURN_REASONS;

  // configured[itemId] = { reason, qty, photos }
  const [configured, setConfigured] = useState({});
  const [activeItem, setActiveItem] = useState(null);

  const returnableItems = order.items.filter(i => i.returnable !== false);
  const nonReturnableItems = order.items.filter(i => i.returnable === false);

  function handleDone(item, { reason, qty, photos }) {
    setConfigured(prev => ({ ...prev, [item.id]: { reason, qty, photos: photos || [] } }));
    setActiveItem(null);
  }

  const configuredIds = Object.keys(configured);
  const canContinue = configuredIds.length > 0;

  function handleNext() {
    const returnItems = configuredIds.map(id => {
      const item = order.items.find(i => i.id === id);
      const { reason, qty, photos } = configured[id];
      const reasonLabel = reasons.find(r => r.id === reason)?.label || reason;
      return { ...item, quantity: qty, returnReason: reason, returnReasonLabel: reasonLabel, photos: photos || [] };
    });
    onNext(returnItems);
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10" style={{ backgroundColor: config.store?.bgColor || '#f5f5f5' }}>
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">

        {/* Header */}
        <div className="flex items-center px-5 py-4 border-b border-gray-100">
          <button onClick={onBack} className="text-gray-400 hover:text-gray-700 mr-4">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h2 className="text-lg font-bold text-gray-900 flex-1 text-center">What would you like to return?</h2>
          <div className="w-9" />
        </div>

        {/* Items */}
        <div className="divide-y divide-gray-100 max-h-[60vh] overflow-y-auto">
          {returnableItems.map(item => {
            const done = configured[item.id];
            const reasonLabel = done ? reasons.find(r => r.id === done.reason)?.label : null;
            return (
              <button
                key={item.id}
                onClick={() => setActiveItem(item)}
                className="w-full flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors text-left"
              >
                <div className="w-14 h-14 rounded-lg bg-gray-100 overflow-hidden shrink-0 flex items-center justify-center">
                  {item.image
                    ? <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                    : <svg className="w-6 h-6 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm leading-tight truncate">{item.name}</p>
                  {item.variant && <p className="text-xs text-gray-400">{item.variant}</p>}
                  <p className="text-sm text-gray-600 mt-0.5">${item.price.toFixed(2)} &nbsp;x {done?.qty ?? item.quantity}</p>
                  {done && (
                    <p className="text-xs mt-0.5" style={{ color: primaryColor }}>{reasonLabel}</p>
                  )}
                </div>
                {done ? (
                  <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: primaryColor }}>
                    <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                ) : (
                  <svg className="w-5 h-5 text-gray-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                )}
              </button>
            );
          })}

          {nonReturnableItems.length > 0 && (
            <div className="px-5 py-3 bg-gray-50">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Non-returnable items</p>
              {nonReturnableItems.map(item => (
                <div key={item.id} className="flex items-center gap-4 py-2 opacity-60">
                  <div className="w-14 h-14 rounded-lg bg-gray-200 overflow-hidden shrink-0">
                    {item.image && <img src={item.image} alt={item.name} className="w-full h-full object-cover grayscale" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-700 text-sm truncate">{item.name}</p>
                    {item.variant && <p className="text-xs text-gray-400">{item.variant}</p>}
                    <p className="text-sm text-gray-500">${item.price.toFixed(2)} x {item.quantity}</p>
                    {item.nonReturnableReason && (
                      <span className="inline-flex items-center gap-1 text-xs text-gray-500 mt-1">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                        {item.nonReturnableReason}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-100">
          <button
            onClick={handleNext}
            disabled={!canContinue}
            className="w-full py-3.5 rounded-xl text-sm font-semibold text-white transition-opacity disabled:opacity-40"
            style={{ backgroundColor: canContinue ? primaryColor : '#9ca3af' }}
          >
            Next
          </button>
        </div>
      </div>

      {/* Per-item modal */}
      {activeItem && (
        <ItemModal
          item={activeItem}
          primary={primaryColor}
          onDone={result => handleDone(activeItem, result)}
          onClose={() => setActiveItem(null)}
        />
      )}
    </div>
  );
}
