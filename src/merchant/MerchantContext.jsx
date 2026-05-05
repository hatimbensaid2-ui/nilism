import { createContext, useContext, useState, useEffect } from 'react';
import { DEFAULT_MERCHANT_CONFIG } from '../data/mockOrders';
import { simulateTracking } from '../utils/trackingSync';
import { sendKlaviyoEvent, KLAVIYO_STATUS_EVENT_MAP } from '../utils/klaviyo';
import { fetchReturns, createReturn, patchReturn, deleteReturns } from '../utils/returnsApi';

const MerchantContext = createContext(null);

function getShopFromUrl() {
  return new URLSearchParams(window.location.search).get('shop') || null;
}

function loadConfig() {
  try {
    const saved = localStorage.getItem('merchant-config');
    if (!saved) return { ...DEFAULT_MERCHANT_CONFIG, returns: [] };
    const parsed = JSON.parse(saved);
    return {
      ...DEFAULT_MERCHANT_CONFIG,
      ...parsed,
      store: { ...DEFAULT_MERCHANT_CONFIG.store, ...parsed.store },
      domains: parsed.domains || [],
      klaviyo: {
        ...DEFAULT_MERCHANT_CONFIG.klaviyo,
        ...parsed.klaviyo,
        events: { ...DEFAULT_MERCHANT_CONFIG.klaviyo.events, ...(parsed.klaviyo?.events || {}) },
        templates: { ...DEFAULT_MERCHANT_CONFIG.klaviyo.templates, ...(parsed.klaviyo?.templates || {}) },
      },
      returnReasons: (parsed.returnReasons || DEFAULT_MERCHANT_CONFIG.returnReasons).map(r => ({
        requiresPhotos: false,
        ...DEFAULT_MERCHANT_CONFIG.returnReasons.find(d => d.id === r.id),
        ...r,
      })),
      shopify: { ...DEFAULT_MERCHANT_CONFIG.shopify, ...parsed.shopify },
      returns: [], // always fetched from backend
    };
  } catch {
    return { ...DEFAULT_MERCHANT_CONFIG, returns: [] };
  }
}

function persist(config) {
  try {
    // Returns live on the backend — don't bloat localStorage with them
    const { returns: _r, ...rest } = config;
    localStorage.setItem('merchant-config', JSON.stringify(rest));
  } catch {
    const slim = { ...config, store: { ...config.store, logoData: '' } };
    const { returns: _r, ...s } = slim;
    localStorage.setItem('merchant-config', JSON.stringify(s));
  }
}

export function MerchantProvider({ children }) {
  const [config, setConfig] = useState(loadConfig);
  const [shop] = useState(() => getShopFromUrl() || loadConfig().shopify?.shop || null);
  const [returnsLoaded, setReturnsLoaded] = useState(false);

  // Fetch returns from backend on mount
  useEffect(() => {
    if (!shop) { setReturnsLoaded(true); return; }
    fetchReturns(shop)
      .then(({ returns }) => {
        setConfig(prev => ({ ...prev, returns: returns ?? [] }));
        setReturnsLoaded(true);
      })
      .catch(() => setReturnsLoaded(true));
  }, [shop]); // eslint-disable-line react-hooks/exhaustive-deps

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
      if (shop) createReturn(shop, returnData).catch(console.warn);
      if (prev.klaviyo?.enabled && prev.klaviyo?.events?.return_submitted?.enabled) {
        sendKlaviyoEvent({
          apiKey: prev.klaviyo.apiKey, publicKey: prev.klaviyo.publicKey,
          eventName: prev.klaviyo.events.return_submitted.label,
          customer: returnData.customer, returnData,
        });
      }
      return next;
    });
  }

  function updateReturn(rma, updates) {
    setConfig(prev => {
      const ret = prev.returns.find(r => r.rma === rma);
      const next = {
        ...prev,
        returns: prev.returns.map(r => r.rma === rma ? { ...r, ...updates, updatedAt: new Date().toISOString() } : r),
      };
      if (shop) patchReturn(shop, rma, updates).catch(console.warn);
      if (updates.status && ret && updates.status !== ret.status && prev.klaviyo?.enabled) {
        const eventKey = KLAVIYO_STATUS_EVENT_MAP[updates.status];
        const ev = eventKey ? prev.klaviyo.events[eventKey] : null;
        if (ev?.enabled) {
          sendKlaviyoEvent({
            apiKey: prev.klaviyo.apiKey, publicKey: prev.klaviyo.publicKey,
            eventName: ev.label, customer: ret.customer, returnData: ret,
          });
        }
      }
      return next;
    });
  }

  function clearReturns() {
    setConfig(prev => ({ ...prev, returns: [] }));
    if (shop) deleteReturns(shop).catch(console.warn);
  }

  function updateKlaviyo(klaviyo) {
    setConfig(prev => { const next = { ...prev, klaviyo }; persist(next); return next; });
  }

  function updateShopify(shopify) {
    setConfig(prev => { const next = { ...prev, shopify: { ...prev.shopify, ...shopify } }; persist(next); return next; });
  }

  function syncTracking(rma) {
    return new Promise(resolve => {
      setConfig(prev => {
        const ret = prev.returns.find(r => r.rma === rma);
        if (!ret?.tracking || !ret?.carrier) { resolve(null); return prev; }
        setTimeout(() => {
          const result = simulateTracking(ret.carrier, ret.tracking);
          const FINAL = ['refunded', 'rejected'];
          if (FINAL.includes(ret.status)) { resolve(ret.status); return; }
          const updates = { status: result.returnStatus, trackingEvents: result.events, lastSynced: result.synced, updatedAt: result.synced };
          setConfig(prev2 => {
            const next = {
              ...prev2,
              returns: prev2.returns.map(r => r.rma === rma ? { ...r, ...updates } : r),
            };
            if (shop) patchReturn(shop, rma, updates).catch(console.warn);
            return next;
          });
          resolve(result.returnStatus);
        }, 500);
        return prev;
      });
    });
  }

  function syncAllTracking() {
    const FINAL = ['refunded', 'rejected'];
    const toSync = config.returns.filter(r => r.tracking && r.carrier && !FINAL.includes(r.status));
    return Promise.all(toSync.map(r => syncTracking(r.rma)));
  }

  return (
    <MerchantContext.Provider value={{
      config, shop, returnsLoaded,
      updateStore, setWarehouses, setReturnReasons, setDomains,
      addReturn, updateReturn, clearReturns,
      updateKlaviyo, updateShopify,
      syncTracking, syncAllTracking,
    }}>
      {children}
    </MerchantContext.Provider>
  );
}

export function useMerchant() {
  const ctx = useContext(MerchantContext);
  if (!ctx) throw new Error('useMerchant must be used inside MerchantProvider');
  return ctx;
}
