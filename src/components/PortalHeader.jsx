export default function PortalHeader({ storeName = 'My Store', logoUrl = null }) {
  return (
    <header className="bg-white border-b border-gray-200">
      <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-center">
        {logoUrl ? (
          <img src={logoUrl} alt={storeName} className="h-8" />
        ) : (
          <span className="text-xl font-bold text-gray-900 tracking-tight">{storeName}</span>
        )}
      </div>
    </header>
  );
}
