import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';

const path = window.location.pathname;

async function boot() {
  let Component;
  if (path.startsWith('/admin')) {
    const { default: AdminApp } = await import('./admin/AdminApp.jsx');
    Component = AdminApp;
  } else if (path.startsWith('/merchant')) {
    const { default: MerchantRoot } = await import('./merchant/MerchantRoot.jsx');
    Component = MerchantRoot;
  } else {
    const { default: App } = await import('./App.jsx');
    Component = App;
  }

  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <Component />
    </StrictMode>
  );
}

boot();
