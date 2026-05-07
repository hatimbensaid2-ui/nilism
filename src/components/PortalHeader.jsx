export default function PortalHeader({ storeName = 'My Store', logoUrl = null, logoData = null, headerBg = '#ffffff' }) {
  const logo = logoData || logoUrl;
  return (
    <header className="border-b border-gray-200" style={{ backgroundColor: headerBg }}>
      <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-center">
        {logo ? (
          <img
            src={logo}
            alt={storeName}
            className="h-8 object-contain max-w-[180px]"
            onError={e => { e.target.style.display = 'none'; }}
          />
        ) : (
          <span className="text-xl font-bold text-gray-900 tracking-tight">{storeName}</span>
        )}
      </div>
    </header>
  );
}
