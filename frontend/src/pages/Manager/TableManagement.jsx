import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { apiUrl } from '../../utils/api';
import { Plus, Trash2, Edit2, Download, QrCode, Users, Check, X } from 'lucide-react';

const TableManagement = () => {
  const { token } = useAuth();
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Add form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newNumber, setNewNumber] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [newCapacity, setNewCapacity] = useState('4');
  const [addLoading, setAddLoading] = useState(false);

  // Edit state
  const [editingId, setEditingId] = useState(null);
  const [editLabel, setEditLabel] = useState('');
  const [editCapacity, setEditCapacity] = useState('');

  const [exportLoading, setExportLoading] = useState(false);

  const fetchTables = async () => {
    setLoading(true);
    try {
      const res = await fetch(apiUrl('/api/tables'));
      if (res.ok) {
        const data = await res.json();
        setTables(data);
      }
    } catch (err) {
      setError('Gagal memuat data meja');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTables(); }, []);

  const showMessage = (msg, isError = false) => {
    if (isError) { setError(msg); setSuccess(''); }
    else { setSuccess(msg); setError(''); }
    setTimeout(() => { setError(''); setSuccess(''); }, 3000);
  };

  const handleAddTable = async (e) => {
    e.preventDefault();
    if (!newNumber || !newLabel) return;
    setAddLoading(true);
    try {
      const res = await fetch(apiUrl('/api/tables'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ number: parseInt(newNumber), label: newLabel, capacity: parseInt(newCapacity) || 4 })
      });
      const data = await res.json();
      if (!res.ok) { showMessage(data.error || 'Gagal menambah meja', true); return; }
      setTables(prev => [...prev, data].sort((a, b) => a.number - b.number));
      setNewNumber(''); setNewLabel(''); setNewCapacity('4');
      setShowAddForm(false);
      showMessage(`Meja ${data.number} berhasil ditambahkan`);
    } catch (err) {
      showMessage('Gagal menambah meja', true);
    } finally {
      setAddLoading(false);
    }
  };

  const handleToggleActive = async (table) => {
    try {
      const res = await fetch(apiUrl(`/api/tables/${table.id}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ is_active: !table.is_active })
      });
      if (res.ok) {
        setTables(prev => prev.map(t => t.id === table.id ? { ...t, is_active: !t.is_active } : t));
        showMessage(`Meja ${table.number} ${!table.is_active ? 'diaktifkan' : 'dinonaktifkan'}`);
      }
    } catch (err) {
      showMessage('Gagal mengubah status meja', true);
    }
  };

  const handleSaveEdit = async (id) => {
    try {
      const res = await fetch(apiUrl(`/api/tables/${id}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ label: editLabel, capacity: parseInt(editCapacity) })
      });
      const data = await res.json();
      if (!res.ok) { showMessage(data.error || 'Gagal menyimpan', true); return; }
      setTables(prev => prev.map(t => t.id === id ? data : t));
      setEditingId(null);
      showMessage('Perubahan disimpan');
    } catch (err) {
      showMessage('Gagal menyimpan perubahan', true);
    }
  };

  const handleDelete = async (table) => {
    if (!window.confirm(`Hapus ${table.label}? Tindakan ini tidak bisa dibatalkan.`)) return;
    try {
      const res = await fetch(apiUrl(`/api/tables/${table.id}`), {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) { showMessage(data.error, true); return; }
      setTables(prev => prev.filter(t => t.id !== table.id));
      showMessage(`${table.label} dihapus`);
    } catch (err) {
      showMessage('Gagal menghapus meja', true);
    }
  };

  const handleExportQR = async () => {
    setExportLoading(true);
    try {
      const res = await fetch(apiUrl('/api/tables/qr-export'), {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) {
        const data = await res.json();
        showMessage(data.error || 'Gagal export QR', true);
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'locana-qr-tables.zip';
      a.click();
      URL.revokeObjectURL(url);
      showMessage('QR codes berhasil didownload');
    } catch (err) {
      showMessage('Gagal mendownload QR codes', true);
    } finally {
      setExportLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-stone-900 flex items-center gap-2">
            <QrCode className="h-6 w-6 text-amber-600" />
            <span>Manajemen Meja</span>
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">Kelola meja dan generate QR untuk pemesanan mandiri.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExportQR}
            disabled={exportLoading || tables.filter(t => t.is_active).length === 0}
            className="flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-xs font-bold text-stone-700 hover:bg-stone-50 shadow-xs disabled:opacity-50 transition"
          >
            <Download className="h-4 w-4" />
            {exportLoading ? 'Mengunduh...' : 'Download Semua QR (ZIP)'}
          </button>
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-amber-700 shadow-md shadow-amber-600/15 transition"
          >
            <Plus className="h-4 w-4" />
            Tambah Meja
          </button>
        </div>
      </div>

      {/* Feedback messages */}
      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-2.5 text-xs text-red-700 font-semibold">{error}</div>
      )}
      {success && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-2.5 text-xs text-emerald-700 font-semibold">{success}</div>
      )}

      {/* Add Table Form */}
      {showAddForm && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/30 p-4 space-y-3">
          <h3 className="text-sm font-bold text-stone-900">Tambah Meja Baru</h3>
          <form onSubmit={handleAddTable} className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block mb-1">Nomor Meja</label>
              <input
                type="number"
                value={newNumber}
                onChange={e => setNewLabel(e.target.value === '' ? '' : `Meja ${e.target.value}`) || setNewNumber(e.target.value)}
                placeholder="e.g. 7"
                required
                min="1"
                className="w-24 rounded-xl border border-stone-300 px-3 py-2 text-sm outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block mb-1">Label</label>
              <input
                type="text"
                value={newLabel}
                onChange={e => setNewLabel(e.target.value)}
                placeholder="Meja 7"
                required
                className="w-36 rounded-xl border border-stone-300 px-3 py-2 text-sm outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block mb-1">Kapasitas</label>
              <input
                type="number"
                value={newCapacity}
                onChange={e => setNewCapacity(e.target.value)}
                min="1"
                className="w-20 rounded-xl border border-stone-300 px-3 py-2 text-sm outline-none focus:border-amber-500"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={addLoading}
                className="rounded-xl bg-amber-600 hover:bg-amber-700 px-4 py-2 text-xs font-bold text-white"
              >
                {addLoading ? 'Menyimpan...' : 'Simpan'}
              </button>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="rounded-xl border border-stone-200 px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-50"
              >
                Batal
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tables List */}
      {loading ? (
        <div className="text-center py-12 text-stone-400 text-sm">Memuat data meja...</div>
      ) : tables.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-stone-300 rounded-2xl bg-white/50">
          <QrCode className="h-10 w-10 text-stone-300 mx-auto mb-2" />
          <p className="text-stone-500 text-sm font-semibold">Belum ada meja</p>
          <p className="text-stone-400 text-xs mt-1">Tambah meja pertama untuk mulai generate QR.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {tables.map(table => (
            <div
              key={table.id}
              className={`rounded-2xl border bg-white shadow-xs p-4 space-y-3 ${table.is_active ? 'border-stone-200' : 'border-stone-200 opacity-60'}`}
            >
              {editingId === table.id ? (
                <div className="space-y-2">
                  <input
                    value={editLabel}
                    onChange={e => setEditLabel(e.target.value)}
                    className="w-full rounded-lg border border-stone-300 px-3 py-1.5 text-sm outline-none focus:border-amber-500"
                  />
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={editCapacity}
                      onChange={e => setEditCapacity(e.target.value)}
                      min="1"
                      className="w-16 rounded-lg border border-stone-300 px-2 py-1.5 text-sm outline-none focus:border-amber-500"
                    />
                    <span className="text-xs text-stone-500">kursi</span>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleSaveEdit(table.id)} className="flex-1 rounded-lg bg-amber-600 text-white text-xs font-bold py-1.5">
                      <Check className="h-3.5 w-3.5 mx-auto" />
                    </button>
                    <button onClick={() => setEditingId(null)} className="flex-1 rounded-lg border border-stone-200 text-xs text-stone-600 py-1.5">
                      <X className="h-3.5 w-3.5 mx-auto" />
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-2xl font-black text-stone-900">{table.number}</span>
                      <p className="text-xs font-semibold text-stone-600 mt-0.5">{table.label}</p>
                    </div>
                    <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full ${table.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-stone-100 text-stone-500'}`}>
                      {table.is_active ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-stone-500">
                    <Users className="h-3.5 w-3.5" />
                    <span>{table.capacity} kursi</span>
                  </div>
                  <div className="pt-2 border-t border-stone-100 flex gap-2">
                    <button
                      onClick={() => { setEditingId(table.id); setEditLabel(table.label); setEditCapacity(String(table.capacity)); }}
                      className="flex-1 rounded-lg border border-stone-200 py-1.5 text-[11px] font-semibold text-stone-600 hover:bg-stone-50 flex items-center justify-center gap-1"
                    >
                      <Edit2 className="h-3 w-3" /> Edit
                    </button>
                    <button
                      onClick={() => handleToggleActive(table)}
                      className="flex-1 rounded-lg border border-stone-200 py-1.5 text-[11px] font-semibold text-stone-600 hover:bg-stone-50"
                    >
                      {table.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                    </button>
                    <button
                      onClick={() => handleDelete(table)}
                      className="rounded-lg border border-red-200 p-1.5 text-red-500 hover:bg-red-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TableManagement;
