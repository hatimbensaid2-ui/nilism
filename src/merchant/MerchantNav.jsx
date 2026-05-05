import { useMerchant } from './MerchantContext';

const NAV_SECTIONS = [
  {
    title: 'Main',
    items: [
      { id: 'dashboard',       label: 'Dashboard',       icon: 'dashboard' },
      { id: 'returns',         label: 'Returns',          icon: 'returns',  badge: true },
    ],
  },
  {
    title: 'Configuration',
    items: [
      { id: 'warehouses',      label: 'Warehouses',       icon: 'warehouse' },
      { id: 'portal-settings', label: 'Portal Settings',  icon: 'portal'    },
      { id: 'return-reasons',  label: 'Return Reasons',   icon: 'reasons'   },
      { id: 'domain-settings',   label: 'Custom Domain',    icon: 'domain'    },
      { id: 'email-settings',   label: 'Email Marketing',  icon: 'email'     },
      { id: 'shopify-settings', label: 'Shopify',          icon: 'shopify', badge: 'shopify' },
    ],
  },
];

function Icon({ name, className = 'w-[18px] h-[18px]' }) {
  const cls = className;
  switch (name) {
    case 'dashboard': return (
      <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z" />
      </svg>
    );
    case 'returns': return (
      <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
      </svg>
    );
    case 'warehouse': return (
      <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M8 14v-4m4 4v-6m4 6v-2M3 21h18M3 10l9-7 9 7M4 10v11M20 10v11" />
      </svg>
    );
    case 'portal': return (
      <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
      </svg>
    );
    case 'reasons': return (
      <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    );
    case 'domain': return (
      <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
      </svg>
    );
    case 'email': return (
      <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    );
    case 'shopify': return (
      <svg className={cls} viewBox="0 0 24 24" fill="currentColor">
        <path d="M15.34 2.05a.45.45 0 00-.44.05 6.1 6.1 0 00-.44.48 3.84 3.84 0 00-2.9-1.08C9.4 1.5 8 3.72 7.6 5.94c-.75.23-1.5.46-2.23.72a.45.45 0 00-.3.36L3.53 19.5a.45.45 0 00.45.5h14.64a.45.45 0 00.45-.5l-1.5-12.48a.45.45 0 00-.22-.36c-.4-.22-.8-.42-1.23-.6l-.28-4a.45.45 0 00-.5-.01zM14.4 4.3l.2 3.16c-.7.22-1.43.46-2.14.72V7.5a5.5 5.5 0 00-.36-2.08 3.28 3.28 0 012.3-1.12zm-2.9-.8a1.22 1.22 0 011 .56 4.6 4.6 0 01.6 2.44v.8c-.8.27-1.6.56-2.38.87-.03-.27-.06-.54-.06-.82 0-1.84.56-3.06 1.37-3.06a.62.62 0 01.48-.79z" />
      </svg>
    );
    case 'portal-out': return (
      <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
      </svg>
    );
    default: return null;
  }
}

function initials(name = '') {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?';
}

export default function MerchantNav({ activePage, onNavigate, storeName, onViewPortal }) {
  const { config } = useMerchant();

  const pendingCount = config.returns.filter(r =>
    r.status === 'submitted' || r.status === 'awaiting_items'
  ).length;
  const shopifyConnected = config.shopify?.connected;

  return (
    <aside className="w-60 bg-[#0f172a] min-h-screen flex flex-col shrink-0 select-none">

      {/* Brand */}
      <div className="px-4 pt-5 pb-4 border-b border-white/[0.06]">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shrink-0">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
            </svg>
          </div>
          <span className="text-white font-bold text-sm tracking-tight">Returns Center</span>
        </div>
        <div className="flex items-center gap-2 px-1">
          <div className="w-6 h-6 rounded-full bg-indigo-500/30 text-indigo-300 text-xs font-bold flex items-center justify-center shrink-0">
            {initials(storeName)}
          </div>
          <span className="text-slate-300 text-xs font-medium truncate">{storeName || 'My Store'}</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 space-y-5 overflow-y-auto">
        {NAV_SECTIONS.map(section => (
          <div key={section.title}>
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest px-3 mb-1.5">
              {section.title}
            </p>
            <div className="space-y-0.5">
              {section.items.map(item => {
                const active = activePage === item.id;
                const count = item.badge === true ? pendingCount : 0;
                const showConnected = item.badge === 'shopify' && shopifyConnected;
                return (
                  <button
                    key={item.id}
                    onClick={() => onNavigate(item.id)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                      active
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/40'
                        : 'text-slate-400 hover:text-slate-100 hover:bg-white/[0.06]'
                    }`}
                  >
                    <Icon name={item.icon} />
                    <span className="flex-1 text-left">{item.label}</span>
                    {count > 0 && (
                      <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center ${
                        active ? 'bg-white/20 text-white' : 'bg-amber-500/20 text-amber-400'
                      }`}>
                        {count}
                      </span>
                    )}
                    {showConnected && (
                      <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" title="Connected" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-2 py-3 border-t border-white/[0.06] space-y-0.5">
        <button
          onClick={onViewPortal}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-slate-100 hover:bg-white/[0.06] transition-all"
        >
          <Icon name="portal-out" />
          <span>View Customer Portal</span>
          <svg className="w-3 h-3 ml-auto opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </button>
      </div>
    </aside>
  );
}
