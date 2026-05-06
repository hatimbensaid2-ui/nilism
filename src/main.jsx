import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import MerchantRoot from './merchant/MerchantRoot.jsx';
import AdminApp from './admin/AdminApp.jsx';

const path = window.location.pathname;

let Component = App;
if (path.startsWith('/admin')) Component = AdminApp;
else if (path.startsWith('/merchant')) Component = MerchantRoot;

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Component />
  </StrictMode>
);
