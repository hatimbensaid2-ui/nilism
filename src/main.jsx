import { StrictMode, Component } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import MerchantRoot from './merchant/MerchantRoot.jsx';
import AdminApp from './admin/AdminApp.jsx';

class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(err) { return { error: err }; }
  render() {
    if (this.state.error) {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif', padding: 32, textAlign: 'center', background: '#f9fafb' }}>
          <div>
            <p style={{ color: '#374151', fontWeight: 600, marginBottom: 8 }}>Something went wrong.</p>
            <p style={{ color: '#6b7280', fontSize: 13, marginBottom: 16 }}>{this.state.error?.message}</p>
            <button
              onClick={() => { this.setState({ error: null }); window.location.reload(); }}
              style={{ color: '#4f46e5', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14 }}
            >
              Reload page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const path = window.location.pathname;

let AppComponent = App;
if (path.startsWith('/admin')) AppComponent = AdminApp;
else if (path.startsWith('/merchant')) AppComponent = MerchantRoot;

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <AppComponent />
    </ErrorBoundary>
  </StrictMode>
);
