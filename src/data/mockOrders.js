export const DEFAULT_RETURN_REASONS = [
  { id: 'wrong_size',       label: "Doesn't fit / Wrong size", enabled: true, requiresPhotos: false, allowExchange: true  },
  { id: 'wrong_item',       label: 'Wrong item received',      enabled: true, requiresPhotos: true,  allowExchange: true  },
  { id: 'defective',        label: 'Defective or damaged',     enabled: true, requiresPhotos: true,  allowExchange: false },
  { id: 'not_as_described', label: 'Not as described',         enabled: true, requiresPhotos: false, allowExchange: false },
  { id: 'changed_mind',     label: 'Changed my mind',          enabled: true, requiresPhotos: false, allowExchange: false },
  { id: 'ordered_multiple', label: 'Ordered multiple sizes',   enabled: true, requiresPhotos: false, allowExchange: true  },
  { id: 'other',            label: 'Other',                    enabled: true, requiresPhotos: false, allowExchange: false },
];

export const DEFAULT_MERCHANT_CONFIG = {
  store: {
    name: 'My Store',
    logoUrl: '',
    logoData: '',
    primaryColor: '#4f46e5',
    buttonTextColor: '#ffffff',
    bgColor: '#f9fafb',
    headerBg: '#ffffff',
    fontFamily: 'Inter',
    returnWindowDays: 30,
    returnWindowFrom: 'fulfilled', // 'fulfilled' | 'delivered'
    welcomeMessage: 'We make returns easy.',
    policyText: 'Items must be unworn, unwashed, and in original packaging with all tags attached.',
    policyUrl: '',
    showPolicyOnLookup: true,
  },
  warehouses: [],
  refund: {
    offerStoreCredit: true,
    storeCreditBonusPct: 10,
    offerExchange: true,
    exchangeMode: 'manual', // 'auto' | 'manual'
  },
  returnReasons: DEFAULT_RETURN_REASONS,
  returns: [],
  domains: [],
  shopify: {
    connected: false,
    shop: null,
    connectedAt: null,
  },
};
