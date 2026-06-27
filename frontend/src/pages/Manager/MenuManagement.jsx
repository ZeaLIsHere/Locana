import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useOrder } from '../../context/OrderContext';
import {
  Plus,
  Edit2,
  Trash2,
  Search,
  Filter,
  Check,
  X,
  AlertCircle,
  Sparkles,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';

const MenuManagement = () => {
  const { token } = useAuth();
  const { categories, fetchProducts } = useOrder();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');

  // Form Modal State
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const defaultFormState = {
    name: '',
    category_id: '',
    description: '',
    price: '',
    points_cost: '',
    points_reward: '',
    image_url: '/data-menu/Locana.jpg',
    is_available: true
  };
  const [formData, setFormData] = useState(defaultFormState);
  const [submitting, setSubmitting] = useState(false);

  // Load all products including unavailable ones for management
  const loadAllProducts = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/products');
      if (response.ok) {
        const prodData = await response.json();
        // Sort alphabetically by name
        prodData.sort((a, b) => a.name.localeCompare(b.name));
        setProducts(prodData);
      } else {
        throw new Error('Gagal mengambil data produk');
      }
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllProducts();
  }, []);

  const formatIDR = (num) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(num);
  };

  // Toggle Availability
  const handleToggleAvailable = async (product) => {
    const updatedStatus = !product.is_available;
    try {
      // Optimistic UI Update
      setProducts(prev => prev.map(p => p.id === product.id ? { ...p, is_available: updatedStatus } : p));

      const response = await fetch(`/api/products/${product.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ is_available: updatedStatus })
      });

      if (!response.ok) {
        throw new Error('Gagal memperbarui status produk');
      }
      
      // Refresh global products state in Context so it syncs immediately
      fetchProducts();
    } catch (err) {
      console.error(err);
      alert(err.message || 'Gagal mengubah status');
      // Rollback
      setProducts(prev => prev.map(p => p.id === product.id ? { ...p, is_available: !updatedStatus } : p));
    }
  };

  // Edit Button Click
  const handleEditClick = (product) => {
    setIsEditing(true);
    setEditingId(product.id);
    setFormData({
      name: product.name,
      category_id: product.category_id,
      description: product.description || '',
      price: product.price,
      points_cost: product.points_cost || '',
      points_reward: product.points_reward || '',
      image_url: product.image_url || '/data-menu/Locana.jpg',
      is_available: product.is_available
    });
    setShowModal(true);
  };

  // Delete/Mark Unavailable
  const handleDeleteProduct = async (product) => {
    if (!window.confirm(`Apakah Anda yakin ingin menonaktifkan menu "${product.name}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/products/${product.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        // Mark unavailable locally
        setProducts(prev => prev.map(p => p.id === product.id ? { ...p, is_available: false } : p));
        fetchProducts();
        alert('Menu berhasil dinonaktifkan.');
      } else {
        throw new Error('Gagal menonaktifkan produk');
      }
    } catch (err) {
      console.error(err);
      alert(err.message);
    }
  };

  // Form Submit (Add or Edit)
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        ...formData,
        price: parseFloat(formData.price),
        points_cost: parseInt(formData.points_cost) || 0,
        points_reward: parseInt(formData.points_reward) || 0
      };

      const url = isEditing ? `/api/products/${editingId}` : '/api/products';
      const method = isEditing ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        setShowModal(false);
        setFormData(defaultFormState);
        loadAllProducts();
        fetchProducts(); // sync context
        alert(isEditing ? 'Menu berhasil diperbarui!' : 'Menu baru berhasil ditambahkan!');
      } else {
        const errData = await response.json();
        throw new Error(errData.error || 'Gagal menyimpan produk');
      }
    } catch (err) {
      console.error(err);
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Filter local product list
  const filteredProducts = products.filter(p => {
    const matchesCategory = activeCategory === 'all' || p.category_id === activeCategory;
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="p-4 md:p-6 bg-stone-50 min-h-[calc(100vh-64px)] space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-stone-900 flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-amber-600" />
            <span>Manajemen Kelola Menu</span>
          </h2>
          <p className="text-xs text-stone-500">Tambah menu baru, perbarui harga, dan tandai ketersediaan stok secara real-time.</p>
        </div>
        <button
          onClick={() => { setIsEditing(false); setFormData(defaultFormState); setShowModal(true); }}
          className="btn-transition rounded-xl bg-amber-600 hover:bg-amber-700 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-amber-600/10 flex items-center gap-1.5 shrink-0 self-start sm:self-center"
        >
          <Plus className="h-4 w-4" />
          <span>Tambah Menu Baru</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-stone-200 bg-white p-4 shadow-xs">
        
        {/* Categories Tabs */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none shrink-0">
          <button
            onClick={() => setActiveCategory('all')}
            className={`btn-transition rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap border ${activeCategory === 'all'
                ? 'bg-amber-600 text-white border-amber-600'
                : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'
              }`}
          >
            Semua Kategori
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`btn-transition rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap border ${activeCategory === cat.id
                  ? 'bg-amber-600 text-white border-amber-600'
                  : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'
                }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute top-2.5 left-3 h-4 w-4 text-stone-400" />
          <input
            type="text"
            placeholder="Cari nama atau deskripsi..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-stone-200 bg-white py-2 pr-4 pl-9 text-stone-850 placeholder-stone-400 outline-none text-xs focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition"
          />
        </div>
      </div>

      {/* Products Grid */}
      {loading ? (
        <div className="text-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-amber-600 border-t-transparent mx-auto"></div>
          <p className="text-stone-500 text-xs mt-2">Memuat daftar menu...</p>
        </div>
      ) : error ? (
        <div className="text-center py-12 text-red-600 text-xs font-semibold">{error}</div>
      ) : filteredProducts.length === 0 ? (
        <div className="text-center py-12 border border-stone-200 rounded-2xl bg-white">
          <p className="text-stone-500 text-sm">Tidak ada menu yang cocok dengan filter pencarian.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filteredProducts.map(product => {
            const cat = categories.find(c => c.id === product.category_id);
            return (
              <div
                key={product.id}
                className={`rounded-2xl border bg-white overflow-hidden shadow-xs flex flex-col transition-all duration-200 ${
                  product.is_available ? 'border-stone-200 hover:shadow-md' : 'border-stone-200 opacity-60 bg-stone-50/50'
                }`}
              >
                {/* Product Image */}
                <div className="h-40 w-full relative bg-stone-100">
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className="h-full w-full object-cover"
                  />
                  <span className="absolute top-3 right-3 rounded-lg bg-white/90 backdrop-blur-xs px-2 py-0.5 text-[10px] font-bold text-stone-800 border border-stone-200 shadow-sm">
                    {cat?.name || 'Menu'}
                  </span>
                </div>

                {/* Info */}
                <div className="p-4 flex flex-col flex-grow">
                  <h3 className="font-bold text-stone-900 leading-snug">{product.name}</h3>
                  <p className="text-[10px] text-stone-500 font-mono mt-0.5">{product.id}</p>
                  <p className="text-[11px] text-stone-600 mt-2 line-clamp-2 flex-grow">{product.description || '-'}</p>

                  <div className="mt-3 flex items-center justify-between text-xs font-bold text-stone-800">
                    <span>{formatIDR(product.price)}</span>
                    {product.points_cost > 0 && (
                      <span className="text-[10px] bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded border border-amber-100 font-semibold">
                        {product.points_cost} Poin
                      </span>
                    )}
                  </div>

                  {/* Actions Divider */}
                  <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between gap-2">
                    
                    {/* Real-time stock toggle */}
                    <button
                      onClick={() => handleToggleAvailable(product)}
                      className="flex items-center gap-1.5 text-stone-500 hover:text-stone-800 text-[11px] font-bold"
                      title={product.is_available ? 'Tandai stok habis' : 'Tandai stok tersedia'}
                    >
                      {product.is_available ? (
                        <>
                          <ToggleRight className="h-6 w-6 text-emerald-600" />
                          <span className="text-emerald-700">Tersedia</span>
                        </>
                      ) : (
                        <>
                          <ToggleLeft className="h-6 w-6 text-stone-400" />
                          <span className="text-stone-500">Stok Habis</span>
                        </>
                      )}
                    </button>

                    {/* Edit & Delete Buttons */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleEditClick(product)}
                        className="p-1.5 rounded-lg border border-stone-200 hover:bg-stone-50 text-stone-600 transition"
                        title="Edit Menu"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteProduct(product)}
                        className="p-1.5 rounded-lg border border-red-150 hover:bg-red-50 text-red-600 transition"
                        title="Nonaktifkan Menu"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>

                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ===== Add/Edit Form Modal ===== */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-xs" onClick={() => setShowModal(false)} />

          <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white p-6 shadow-2xl z-10 animate-slide-up">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-stone-100 pb-3 mb-4">
              <h3 className="text-sm font-bold text-stone-900">
                {isEditing ? 'Ubah Informasi Menu' : 'Tambah Menu Baru'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-stone-400 hover:text-stone-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-3.5">
              
              <div>
                <label className="text-[11px] font-bold text-stone-600 uppercase tracking-wider">Nama Menu *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Contoh: Espresso Macchiato"
                  className="w-full mt-1.5 rounded-xl border border-stone-200 px-3 py-2 text-xs text-stone-800 outline-none focus:border-amber-500 bg-stone-50/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="text-[11px] font-bold text-stone-600 uppercase tracking-wider">Kategori *</label>
                  <select
                    required
                    value={formData.category_id}
                    onChange={e => setFormData({ ...formData, category_id: e.target.value })}
                    className="w-full mt-1.5 rounded-xl border border-stone-200 px-3 py-2 text-xs text-stone-800 outline-none focus:border-amber-500 bg-stone-50/50"
                  >
                    <option value="" disabled>Pilih Kategori</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-stone-600 uppercase tracking-wider">Harga (Rp) *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={formData.price}
                    onChange={e => setFormData({ ...formData, price: e.target.value })}
                    placeholder="25000"
                    className="w-full mt-1.5 rounded-xl border border-stone-200 px-3 py-2 text-xs text-stone-800 outline-none focus:border-amber-500 bg-stone-50/50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="text-[11px] font-bold text-stone-600 uppercase tracking-wider">Point Cost (Redeem)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.points_cost}
                    onChange={e => setFormData({ ...formData, points_cost: e.target.value })}
                    placeholder="Misal: 250"
                    className="w-full mt-1.5 rounded-xl border border-stone-200 px-3 py-2 text-xs text-stone-800 outline-none focus:border-amber-500 bg-stone-50/50"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-stone-600 uppercase tracking-wider">Point Reward (Lama)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.points_reward}
                    onChange={e => setFormData({ ...formData, points_reward: e.target.value })}
                    placeholder="Abaikan (Poin Otomatis)"
                    className="w-full mt-1.5 rounded-xl border border-stone-200 px-3 py-2 text-xs text-stone-800 outline-none focus:border-amber-500 bg-stone-50/50"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-stone-600 uppercase tracking-wider">URL Gambar Menu</label>
                <input
                  type="text"
                  value={formData.image_url}
                  onChange={e => setFormData({ ...formData, image_url: e.target.value })}
                  placeholder="/data-menu/Nama_Menu.jpg"
                  className="w-full mt-1.5 rounded-xl border border-stone-200 px-3 py-2 text-xs text-stone-800 outline-none focus:border-amber-500 bg-stone-50/50"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-stone-600 uppercase tracking-wider">Deskripsi Menu</label>
                <textarea
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Ceritakan rasa kopi atau croissant ini..."
                  rows="3"
                  className="w-full mt-1.5 rounded-xl border border-stone-200 px-3 py-2 text-xs text-stone-800 outline-none focus:border-amber-500 bg-stone-50/50 resize-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-1.5">
                <input
                  type="checkbox"
                  id="chk_available"
                  checked={formData.is_available}
                  onChange={e => setFormData({ ...formData, is_available: e.target.checked })}
                  className="h-4 w-4 rounded border-stone-300 text-amber-600 focus:ring-amber-500"
                />
                <label htmlFor="chk_available" className="text-xs text-stone-600 font-bold select-none cursor-pointer">
                  Tersedia untuk dipesan oleh pelanggan
                </label>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn-transition rounded-xl border border-stone-200 hover:bg-stone-50 px-4 py-2.5 text-xs font-bold text-stone-600"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-transition rounded-xl bg-amber-600 hover:bg-amber-700 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-amber-600/10"
                >
                  {submitting ? 'Menyimpan...' : 'Simpan Menu'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
};

export default MenuManagement;
