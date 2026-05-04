import { useState } from 'react';
import { useMerchant } from '../MerchantContext';

const EMPTY = { id: '', name: '', contact: '', address: '', city: '', state: '', zip: '', country: '', active: true };

export default function Warehouses() {
  const { config, setWarehouses } = useMerchant();
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [showForm, setShowForm] = useState(false);

  function openNew() {
    setForm({ ...EMPTY, id: 'wh-' + Date.now() });
    setEditing(null);
    setShowForm(true);
  }

  function openEdit(wh) {
    setForm({ ...wh });
    setEditing(wh.id);
    setShowForm(true);
  }

  function handleSave() {
    if (!form.name.trim() || !form.address.trim()) return;
    if (editing) {
      setWarehouses(config.warehouses.map(w => w.id === editing ? form : w));
    } else {
      setWarehouses([...config.warehouses, form]);
    }
    setShowForm(false);
    setEditing(null);
  }

  function handleDelete(id) {
    setWarehouses(config.warehouses.filter(w => w.id !== id));
  }

  function toggleActive(id) {
    setWarehouses(config.warehouses.map(w => w.id === id ? { ...w, active: !w.active } : w));
  }

  function field(key, label, placeholder = '', type = 'text') {
    return (
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
        <input
          type={type}
          value={form[key]}
          onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
          placeholder={placeholder}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Warehouses</h1>
          <p className="text-sm text-gray-500 mt-1">Manage the return addresses shown to customers.</p>
        </div>
        <button
          onClick={openNew}
          className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
          Add Warehouse
        </button>
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="font-bold text-gray-900">{editing ? 'Edit Warehouse' : 'Add Warehouse'}</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 space-y-4">
              {field('name', 'Warehouse Name *', 'e.g. US East Warehouse')}
              {field('contact', 'Contact / Attn', 'e.g. Returns Dept')}
              {field('address', 'Street Address *', '100 Logistics Way')}
              <div className="grid grid-cols-2 gap-3">
                {field('city', 'City', 'Newark')}
                {field('state', 'State / Region', 'NJ')}
              </div>
              <div className="grid grid-cols-2 gap-3">
                {field('zip', 'ZIP / Postal Code', '07101')}
                {field('country', 'Country', 'United States')}
              </div>
              <label className="flex items-center gap-3 cursor-pointer">
                <div
                  onClick={() => setForm(p => ({ ...p, active: !p.active }))}
                  className={`w-10 h-6 rounded-full transition-colors ${form.active ? 'bg-indigo-600' : 'bg-gray-300'}`}
                >
                  <div className={`w-4 h-4 bg-white rounded-full mt-1 transition-transform ${form.active ? 'translate-x-5' : 'translate-x-1'}`} />
                </div>
                <span className="text-sm font-medium text-gray-700">Active (visible to customers)</span>
              </label>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex gap-3 justify-end">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50">Cancel</button>
              <button
                onClick={handleSave}
                disabled={!form.name.trim() || !form.address.trim()}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white rounded-lg text-sm font-semibold transition-colors"
              >
                Save Warehouse
              </button>
            </div>
          </div>
        </div>
      )}

      {/* List */}
      <div className="space-y-3">
        {config.warehouses.length === 0 && (
          <div className="text-center py-12 text-gray-400 text-sm bg-white border border-gray-200 rounded-xl">
            No warehouses yet. Add one above.
          </div>
        )}
        {config.warehouses.map(wh => (
          <div key={wh.id} className="bg-white border border-gray-200 rounded-xl p-4 flex items-start gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <p className="font-semibold text-gray-900">{wh.name}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${wh.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {wh.active ? 'Active' : 'Inactive'}
                </span>
              </div>
              {wh.contact && <p className="text-sm text-gray-500">Attn: {wh.contact}</p>}
              <p className="text-sm text-gray-500">{wh.address}, {wh.city}{wh.state ? `, ${wh.state}` : ''} {wh.zip}, {wh.country}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button onClick={() => toggleActive(wh.id)} className="text-xs text-gray-500 hover:text-gray-700 border border-gray-200 px-2.5 py-1.5 rounded-lg transition-colors">
                {wh.active ? 'Deactivate' : 'Activate'}
              </button>
              <button onClick={() => openEdit(wh)} className="text-xs text-indigo-600 hover:text-indigo-700 border border-indigo-200 px-2.5 py-1.5 rounded-lg transition-colors">Edit</button>
              <button onClick={() => handleDelete(wh.id)} className="text-xs text-red-500 hover:text-red-600 border border-red-200 px-2.5 py-1.5 rounded-lg transition-colors">Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
