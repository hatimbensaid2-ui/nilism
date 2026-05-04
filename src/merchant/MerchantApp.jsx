import { useState } from 'react';
import MerchantNav from './MerchantNav';
import Dashboard from './pages/Dashboard';
import Returns from './pages/Returns';
import ReturnDetail from './pages/ReturnDetail';
import Warehouses from './pages/Warehouses';
import PortalSettings from './pages/PortalSettings';
import ReturnReasons from './pages/ReturnReasons';
import { useMerchant } from './MerchantContext';

export default function MerchantApp({ onViewPortal }) {
  const { config } = useMerchant();
  const [page, setPage] = useState('dashboard');
  const [selectedRma, setSelectedRma] = useState(null);

  function navigate(p) {
    setPage(p);
    setSelectedRma(null);
  }

  function viewDetail(rma) {
    setSelectedRma(rma);
    setPage('return-detail');
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <MerchantNav
        activePage={selectedRma ? 'returns' : page}
        onNavigate={navigate}
        storeName={config.store.name}
        onViewPortal={onViewPortal}
      />

      <main className="flex-1 overflow-y-auto">
        {page === 'dashboard' && <Dashboard onNavigate={navigate} />}
        {page === 'returns' && !selectedRma && <Returns onViewDetail={viewDetail} />}
        {page === 'return-detail' && selectedRma && (
          <ReturnDetail rma={selectedRma} onBack={() => navigate('returns')} />
        )}
        {page === 'warehouses' && <Warehouses />}
        {page === 'portal-settings' && <PortalSettings />}
        {page === 'return-reasons' && <ReturnReasons />}
      </main>
    </div>
  );
}
