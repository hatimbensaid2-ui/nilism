import { useRef, useState } from 'react';
import { DEFAULT_RETURN_REASONS } from '../data/mockOrders';
import { useMerchant } from '../merchant/MerchantContext';

export default function ReturnReason({ order, selectedItemIds, onNext, onBack }) {
  const { config } = useMerchant();
  const RETURN_REASONS = (config.returnReasons || DEFAULT_RETURN_REASONS).filter(r => r.enabled);
  const items = order.items.filter(i => selectedItemIds.includes(i.id));
  const [reasons, setReasons] = useState({});
  const [notes, setNotes] = useState({});
  const [photos, setPhotos] = useState({});

  function setReason(itemId, reasonId) {
    setReasons(prev => ({ ...prev, [itemId]: reasonId }));
    // Clear photos if reason no longer requires them
    if (!PHOTO_REASONS.includes(reasonId)) {
      setPhotos(prev => ({ ...prev, [itemId]: [] }));
    }
  }

  function setNote(itemId, note) {
    setNotes(prev => ({ ...prev, [itemId]: note }));
  }

  function handlePhotoUpload(itemId, files) {
    const existing = photos[itemId] || [];
    const remaining = 3 - existing.length;
    if (remaining <= 0) return;
    const toProcess = Array.from(files).slice(0, remaining);
    toProcess.forEach(file => {
      const reader = new FileReader();
      reader.onload = e => {
        setPhotos(prev => ({
          ...prev,
          [itemId]: [...(prev[itemId] || []), e.target.result],
        }));
      };
      reader.readAsDataURL(file);
    });
  }

  function removePhoto(itemId, idx) {
    setPhotos(prev => ({
      ...prev,
      [itemId]: (prev[itemId] || []).filter((_, i) => i !== idx),
    }));
  }

  const allSelected = items.every(i => reasons[i.id]);

  function handleNext() {
    const result = items.map(item => ({
      ...item,
      returnReason: reasons[item.id],
      returnNote: notes[item.id] || '',
      photos: photos[item.id] || [],
    }));
    onNext(result);
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900">Reason for Return</h2>
        <p className="text-sm text-gray-500 mt-1">Please tell us why you're returning each item.</p>
      </div>

      <div className="space-y-5">
        {items.map(item => {
          const reason = reasons[item.id];
          const needsPhotos = reason && RETURN_REASONS.find(r => r.id === reason)?.requiresPhotos;
          const itemPhotos = photos[item.id] || [];

          return (
            <div key={item.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="flex items-center gap-3 p-4 border-b border-gray-100">
                <img
                  src={item.image}
                  alt={item.name}
                  className="w-12 h-12 rounded-lg object-cover bg-gray-100"
                  onError={e => { e.target.style.display = 'none'; }}
                />
                <div>
                  <p className="font-semibold text-gray-900 text-sm">{item.name}</p>
                  <p className="text-xs text-gray-500">{item.variant}</p>
                </div>
              </div>

              <div className="p-4 space-y-3">
                <p className="text-sm font-medium text-gray-700">Select a reason *</p>
                <div className="grid grid-cols-1 gap-2">
                  {RETURN_REASONS.map(r => {
                    const isSelected = reason === r.id;
                    return (
                      <label
                        key={r.id}
                        className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg border cursor-pointer transition-all ${
                          isSelected ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                          isSelected ? 'border-indigo-600' : 'border-gray-300'
                        }`}>
                          {isSelected && <div className="w-2 h-2 rounded-full bg-indigo-600" />}
                        </div>
                        <input type="radio" className="sr-only" name={`reason-${item.id}`}
                          value={r.id} checked={isSelected} onChange={() => setReason(item.id, r.id)} />
                        <span className="text-sm text-gray-700">{r.label}</span>
                      </label>
                    );
                  })}
                </div>

                {reason === 'other' && (
                  <textarea
                    value={notes[item.id] || ''}
                    onChange={e => setNote(item.id, e.target.value)}
                    placeholder="Please describe the issue..."
                    rows={3}
                    className="mt-1 w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                  />
                )}

                {needsPhotos && (
                  <PhotoUpload
                    photos={itemPhotos}
                    onUpload={files => handlePhotoUpload(item.id, files)}
                    onRemove={idx => removePhoto(item.id, idx)}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex gap-3 mt-8">
        <button onClick={onBack}
          className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
          Back
        </button>
        <button onClick={handleNext} disabled={!allSelected}
          className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors">
          Continue
        </button>
      </div>
    </div>
  );
}

function PhotoUpload({ photos, onUpload, onRemove }) {
  const inputRef = useRef(null);

  return (
    <div className="border border-amber-200 bg-amber-50 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <svg className="w-4 h-4 text-amber-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <p className="text-sm font-semibold text-amber-800">Photos recommended</p>
      </div>
      <p className="text-xs text-amber-700 mb-3">Please upload clear photos of the issue. Up to 3 photos, max 5 MB each.</p>

      <div className="flex flex-wrap gap-2">
        {photos.map((src, i) => (
          <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border border-amber-300 group">
            <img src={src} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => onRemove(i)}
              className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}

        {photos.length < 3 && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="w-20 h-20 rounded-lg border-2 border-dashed border-amber-300 hover:border-amber-400 bg-white hover:bg-amber-50 transition-colors flex flex-col items-center justify-center gap-1 text-amber-600"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span className="text-xs font-medium">Add</span>
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        onChange={e => { if (e.target.files?.length) onUpload(e.target.files); e.target.value = ''; }}
      />
    </div>
  );
}
