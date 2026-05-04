import { createContext, useContext, useState } from 'react';
import { DEFAULT_MERCHANT_CONFIG } from '../data/mockOrders';

const MerchantContext = createContext(null);

function loadConfig() {
  try {
    const saved = localStorage.getItem('merchant-config');
    if (!saved) return DEFAULT_MERCHANT_CONFIG;
    const parsed = JSON.parse(saved);
    return {
      ...DEFAULT_MERCHANT_CONFIG,
      ...parsed,
      store: { ...DEFAULT_MERCHANT_CONFIG.store, ...parsed.store },
    };
  } catch {
    return DEFAULT_MERCHANT_CONFIG;
  }
}

function persist(config) {
  localStorage.setItem('merchant-config', JSON.stringify(config));
}

export function MerchantProvider({ children }) {
  const [config, setConfig] = useState(loadConfig);

  function updateStore(updates) {
    setConfig(prev => {
      const next = { ...prev, store: { ...prev.store, ...updates } };
      persist(next);
      return next;
    });
  }

  function setWarehouses(warehouses) {
    setConfig(prev => {
      const next = { ...prev, warehouses };
      persist(next);
      return next;
    });
  }

  function setReturnReasons(returnReasons) {
    setConfig(prev => {
      const next = { ...prev, returnReasons };
      persist(next);
      return next;
    });
  }

  function addReturn(returnData) {
    setConfig(prev => {
      const next = { ...prev, returns: [returnData, ...prev.returns] };
      persist(next);
      return next;
    });
  }

  function updateReturn(rma, updates) {
    setConfig(prev => {
      const next = {
        ...prev,
        returns: prev.returns.map(r => r.rma === rma ? { ...r, ...updates, updatedAt: new Date().toISOString() } : r),
      };
      persist(next);
      return next;
    });
  }

  return (
    <MerchantContext.Provider value={{ config, updateStore, setWarehouses, setReturnReasons, addReturn, updateReturn }}>
      {children}
    </MerchantContext.Provider>
  );
}

export function useMerchant() {
  const ctx = useContext(MerchantContext);
  if (!ctx) throw new Error('useMerchant must be used inside MerchantProvider');
  return ctx;
}
