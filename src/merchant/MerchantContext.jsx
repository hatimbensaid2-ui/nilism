import { createContext, useContext, useState, useEffect } from 'react';
import { DEFAULT_MERCHANT_CONFIG } from '../data/mockOrders';
import { sendKlaviyoEvent, KLAVIYO_STATUS_EVENT_MAP } from '../utils/klaviyo';
import { fetchReturns, createReturn, patchReturn, deleteReturns, fetchPortalConfig, pushPortalConfig, submitPortalReturn, syncReturnTracking } from '../utils/returnsApi';

const MerchantContext = createContext(null);

function getShopFromUrl() {
  return new URLSearchParams(window.location.search).get('shop') || null;
}

function storageKey(shop) {
  return shop ? `merchant-config:${shop}` : 'merchant-config';
}

function loadConfig(shop) {
  try {
    const saved = localStorage.getItem(storageKey(shop));
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
        emailBranding: { ...DEFAULT_MERCHANT_CONFIG.klaviyo.emailBranding, ...(parsed.klaviyo?.emailBranding || {}) },
        events: { ...DEFAULT_MERCHANT_CONFIG.klaviyo.events, ...(parsed.klaviyo?.events || {}) },
        templates: { ...DEFAULT_MERCHANT_CONFIG.klaviyo.templates, ...(parsed.klaviyo?.templates || {}) },
      },
      returnReasons: (parsed.returnReasons || DEFAULT_MERCHANT_CONFIG.returnReasons).map(r => ({
        requiresPhotos: false,
        ...DEFAULT_MERCHANT_CONFIG.returnReasons.find(d => d.id === r.id),
        ...r,
      })),
      shopify: { ...DEFAULT_MERCHANT_CONFIG.shopify, ...parsed.shopify },
      returns: [],
    };
  } catch {
    return { ...DEFAULT_MERCHANT_CONFIG, returns: [] };
  }
}

function persist(shop, config) {
  try {
    const { returns: _r, ...rest } = config;
    localStorage.setItem(storageKey(shop), JSON.stringify(rest));
  } catch {
    const slim = { ...config, store: { ...config.store, logoData: '' } };
    const { returns: _r, ...s } = slim;
    localStorage.setItem(storageKey(shop), JSON.stringify(s));
  }
}

// shopOverride: passed by MerchantRoot after session verification.
// Falls back to URL ?shop= for the customer portal context.
export function MerchantProvider({ children, shopOverride }) {
  const [shop] = useState(() => shopOverride || getShopFromUrl());
  const [config, setConfig] = useState(() => loadConfig(shopOverride || getShopFromUrl()));
  const [returnsLoaded, setReturnsLoaded] = useState(false);

  useEffect(() => {
    if (!shop) { setReturnsLoaded(true); return; }
    fetchPortalConfig(shop)
      .then(({ config: serverConfig }) => {
        if (serverConfig) {
          setConfig(prev => ({
            ...prev,
            store: { ...prev.store, ...(serverConfig.store || {}) },
            warehouses: serverConfig.warehouses ?? prev.warehouses,
            returnReasons: serverConfig.returnReasons ?? prev.returnReasons,
            refund: serverConfig.refund ? { ...(prev.refund || {}), ...serverConfig.refund } : prev.refund,
            klaviyo: serverConfig.klaviyo
              ? {
                  ...prev.klaviyo,
                  ...serverConfig.klaviyo,
                  emailBranding: { ...prev.klaviyo?.emailBranding, ...(serverConfig.klaviyo.emailBranding || {}) },
                  events: { ...prev.klaviyo?.events, ...(serverConfig.klaviyo.events || {}) },
                  templates: { ...prev.klaviyo?.templates, ...(serverConfig.klaviyo.templates || {}) },
                }
              : prev.klaviyo,
          }));
        }
      })
      .catch(() => {});
    fetchReturns()
      .then(({ returns }) => {
        setConfig(prev => ({ ...prev, returns: returns ?? [] }));
        setReturnsLoaded(true);
      })
      .catch(() => setReturnsLoaded(true));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function syncToServer(next) {
    if (!shop) return;
    pushPortalConfig({
      store: next.store,
      warehouses: next.warehouses,
      returnReasons: next.returnReasons,
      refund: next.refund,
      klaviyo: next.klaviyo,
    }).catch(console.warn);
  }

  function updateStore(updates) {
    setConfig(prev => {
      const next = { ...prev, store: { ...prev.store, ...updates } };
      persist(shop, next);
      syncToServer(next);
      return next;
    });
  }

  function setWarehouses(warehouses) {
    setConfig(prev => {
      const next = { ...prev, warehouses };
      persist(shop, next);
      syncToServer(next);
      return next;
    });
  }

  function setReturnReasons(returnReasons) {
    setConfig(prev => {
      const next = { ...prev, returnReasons };
      persist(shop, next);
      syncToServer(next);
      return next;
    });
  }

  function setRefundConfig(refund) {
    setConfig(prev => {
      const next = { ...prev, refund: { ...prev.refund, ...refund } };
      persist(shop, next);
      syncToServer(next);
      return next;
    });
  }

  function setDomains(domainsOrUpdater) {
    setConfig(prev => {
      const domains = typeof domainsOrUpdater === 'function' ? domainsOrUpdater(prev.domains || []) : domainsOrUpdater;
      const next = { ...prev, domains };
      persist(shop, next);
      return next;
    });
  }

  function addReturn(returnData) {
    setConfig(prev => {
      const next = { ...prev, returns: [returnData, ...prev.returns] };
      if (shop) submitPortalReturn(shop, returnData).catch(console.warn);
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
      if (shop) patchReturn(rma, updates).catch(console.warn);
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
    if (shop) deleteReturns().catch(console.warn);
  }

  function updateKlaviyo(klaviyo) {
    setConfig(prev => { const next = { ...prev, klaviyo }; persist(shop, next); syncToServer(next); return next; });
  }

  function updateShopify(shopify) {
    setConfig(prev => { const next = { ...prev, shopify: { ...prev.shopify, ...shopify } }; persist(shop, next); return next; });
  }

  async function syncTracking(rma) {
    if (!shop) return null;
    try {
      const result = await syncReturnTracking(rma);
      const FINAL = ['refunded', 'rejected'];
      const updates = { status: result.returnStatus, trackingEvents: result.events, lastSynced: result.synced, updatedAt: result.synced };
      setConfig(prev => {
        const ret = prev.returns.find(r => r.rma === rma);
        if (!ret || FINAL.includes(ret.status)) return prev;
        return { ...prev, returns: prev.returns.map(r => r.rma === rma ? { ...r, ...updates } : r) };
      });
      return result.returnStatus;
    } catch {
      return null;
    }
  }

  async function syncAllTracking() {
    const FINAL = ['refunded', 'rejected'];
    const toSync = config.returns.filter(r => r.tracking && r.carrier && !FINAL.includes(r.status));
    return Promise.all(toSync.map(r => syncTracking(r.rma)));
  }

  return (
    <MerchantContext.Provider value={{
      config, shop, returnsLoaded,
      updateStore, setWarehouses, setReturnReasons, setDomains, setRefundConfig,
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
