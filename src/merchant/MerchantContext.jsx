import { createContext, useContext, useState } from 'react';
import { DEFAULT_MERCHANT_CONFIG } from '../data/mockOrders';
import { simulateTracking } from '../utils/trackingSync';

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
      domains: parsed.domains || [],
    };
  } catch {
    return DEFAULT_MERCHANT_CONFIG;
  }
}

function persist(config) {
  try {
    localStorage.setItem('merchant-config', JSON.stringify(config));
  } catch {
    // localStorage quota (large logo data64) — strip logo and retry
    const slim = { ...config, store: { ...config.store, logoData: '' } };
    localStorage.setItem('merchant-config', JSON.stringify(slim));
  }
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
    setConfig(prev => { const next = { ...prev, warehouses }; persist(next); return next; });
  }

  function setReturnReasons(returnReasons) {
    setConfig(prev => { const next = { ...prev, returnReasons }; persist(next); return next; });
  }

  function setDomains(domains) {
    setConfig(prev => { const next = { ...prev, domains }; persist(next); return next; });
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

  // Sync a single return's status from its tracking number.
  // Returns the new status so callers can react.
  function syncTracking(rma) {
    return new Promise(resolve => {
      setConfig(prev => {
        const ret = prev.returns.find(r => r.rma === rma);
        if (!ret?.tracking || !ret?.carrier) { resolve(null); return prev; }

        // Simulate async carrier API (500 ms latency)
        setTimeout(() => {
          const result = simulateTracking(ret.carrier, ret.tracking);
          const FINAL = ['refunded', 'rejected'];
          if (FINAL.includes(ret.status)) { resolve(ret.status); return; }

          setConfig(prev2 => {
            const next = {
              ...prev2,
              returns: prev2.returns.map(r =>
                r.rma === rma
                  ? { ...r, status: result.returnStatus, trackingEvents: result.events, lastSynced: result.synced, updatedAt: result.synced }
                  : r
              ),
            };
            persist(next);
            return next;
          });
          resolve(result.returnStatus);
        }, 500);

        return prev;
      });
    });
  }

  // Sync all returns that have tracking numbers and aren't finalized
  function syncAllTracking() {
    const FINAL = ['refunded', 'rejected'];
    const toSync = config.returns.filter(r => r.tracking && r.carrier && !FINAL.includes(r.status));
    return Promise.all(toSync.map(r => syncTracking(r.rma)));
  }

  return (
    <MerchantContext.Provider value={{ config, updateStore, setWarehouses, setReturnReasons, setDomains, addReturn, updateReturn, syncTracking, syncAllTracking }}>
      {children}
    </MerchantContext.Provider>
  );
}

export function useMerchant() {
  const ctx = useContext(MerchantContext);
  if (!ctx) throw new Error('useMerchant must be used inside MerchantProvider');
  return ctx;
}
