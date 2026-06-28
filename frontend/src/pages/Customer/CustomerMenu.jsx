import React, { useState } from 'react';
import { useOrder } from '../../context/OrderContext';
import { useAuth } from '../../context/AuthContext';
import { apiUrl } from '../../utils/api';
import PasswordInput from '../../components/PasswordInput';
import {
  Search,
  ShoppingBag,
  Plus,
  Minus,
  Trash2,
  Star,
  X,
  CreditCard,
  Store,
  CheckCircle2,
  QrCode,
  AlertCircle,
  ArrowLeft,
  Maximize2,
  Edit2,
  FileText
} from 'lucide-react';

const CustomerMenu = ({ tableNumber = null }) => {
  const { user, login, register, refreshProfile } = useAuth();
  const {
    categories,
    products,
    cart,
    addToCart,
    removeFromCart,
    updateCartQty,
    getCartTotals,
    checkout
  } = useOrder();

  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Navigation & Detail States
  const [isCheckoutView, setIsCheckoutView] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showFullScreenImage, setShowFullScreenImage] = useState(false);
  const [itemNote, setItemNote] = useState('');
  const [checkoutNotes, setCheckoutNotes] = useState('');

  // Editing Note State
  const [editingNoteItem, setEditingNoteItem] = useState(null); // { product_id, is_redeemed_by_points, oldNotes, newNotes }

  // Checkout Modal & Payment State
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [checkoutResult, setCheckoutResult] = useState(null);
  const [simulatingPayment, setSimulatingPayment] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [showPaymentSelection, setShowPaymentSelection] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'register'
  const [authIdentifier, setAuthIdentifier] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regBirthday, setRegBirthday] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // Totals
  const { totalPrice, totalPointsCost, totalPointsEarned, totalItemsCount } = getCartTotals();

  // Filter products
  const filteredProducts = products.filter(product => {
    const matchesCategory = activeCategory === 'all' || product.category_id === activeCategory;
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (product.description && product.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch && product.is_available;
  });

  // Suggestions for Checkout (Products not in cart)
  const suggestions = products
    .filter(p => !cart.some(item => item.product_id === p.id) && p.is_available)
    .slice(0, 3);

  const formatIDR = (num) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(num);
  };

  const handleAddToCartFromCard = (product) => {
    addToCart(product, 1, '', false);
  };

  const handleOpenDetail = (product) => {
    setSelectedProduct(product);
    setItemNote('');
  };

  const handleAddFromDetail = () => {
    if (!selectedProduct) return;
    addToCart(selectedProduct, 1, itemNote, false);
    setSelectedProduct(null);
    setItemNote('');
  };

  const handleUpdateItemNote = (productId, isRedeemed, oldNote, newNote, quantity) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    // Remove old cart item
    removeFromCart(productId, isRedeemed, oldNote);
    
    // Add new cart item with updated note
    addToCart(product, quantity, newNote, isRedeemed);
  };

  const handleCheckout = async (method) => {
    try {
      setShowPaymentSelection(false);
      const result = await checkout(method, checkoutNotes, tableNumber);
      setCheckoutResult(result);
      setShowCheckoutModal(true);
      setPaymentSuccess(false);
      setCheckoutNotes('');
    } catch (err) {
      alert(err.message || 'Gagal memproses checkout');
    }
  };

  // Simulate QRIS Payment success webhook
  const handleSimulatePayment = async () => {
    if (!checkoutResult) return;
    setSimulatingPayment(true);
    try {
      const response = await fetch(apiUrl(`/api/orders/${checkoutResult.order.id}/pay`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('locana_token')}`
        },
        body: JSON.stringify({ cashier_id: null }) // processed by online QRIS
      });

      if (response.ok) {
        setPaymentSuccess(true);
        refreshProfile(); // Update loyalty points for customer
      } else {
        alert('Gagal menyimulasikan pembayaran');
      }
    } catch (err) {
      console.error(err);
      alert('Error saat menyimulasikan pembayaran');
    } finally {
      setSimulatingPayment(false);
    }
  };

  // RENDER CHECKOUT VIEW
  if (isCheckoutView) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-6 md:py-8 space-y-6 pb-32">
        {/* Top Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsCheckoutView(false)}
            className="p-2 rounded-xl hover:bg-stone-100 text-stone-600 transition"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h2 className="text-lg font-bold text-stone-900">Konfirmasi Pesanan</h2>
        </div>

        {/* Tipe Pemesanan Box */}
        <div className="rounded-xl border border-orange-200 bg-orange-50/20 p-3.5 flex justify-between items-center text-xs font-bold text-stone-850">
          <span>Tipe Pemesanan</span>
          <span className="flex items-center gap-1.5 text-orange-600">
            Makan di tempat <CheckCircle2 className="h-4.5 w-4.5 fill-orange-100 text-orange-600" />
          </span>
        </div>

        {/* Menu Terkait / Suggestions */}
        {suggestions.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-stone-900">Menu Terkait</h3>
            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-none">
              {suggestions.map(p => (
                <div
                  key={p.id}
                  className="flex items-center gap-3 bg-white border border-stone-200 rounded-xl p-3 min-w-[220px] shadow-xs shrink-0"
                >
                  <img src={p.image_url} alt={p.name} className="h-12 w-12 rounded-lg object-cover bg-stone-150" />
                  <div className="flex-grow min-w-0">
                    <h4 className="text-xs font-bold text-stone-800 truncate">{p.name}</h4>
                    <p className="text-[11px] text-stone-500 font-semibold mt-0.5">{formatIDR(p.price)}</p>
                  </div>
                  <button
                    onClick={() => addToCart(p, 1, '', false)}
                    className="p-1 rounded-full border border-orange-500 text-orange-500 hover:bg-orange-50 transition"
                  >
                    <Plus className="h-4.5 w-4.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Item Yang Dipesan Section Header */}
        <div className="flex items-center justify-between pt-2">
          <h3 className="text-sm font-bold text-stone-900">
            Item yang dipesan ({totalItemsCount})
          </h3>
          <button
            onClick={() => setIsCheckoutView(false)}
            className="rounded-lg border border-orange-500 text-orange-600 hover:bg-orange-50 px-3 py-1.5 text-xs font-bold transition"
          >
            + Tambah Item
          </button>
        </div>

        {/* Cart Item Cards list */}
        <div className="space-y-4">
          {cart.length === 0 ? (
            <div className="text-center py-12 border border-stone-200 rounded-2xl bg-white space-y-2">
              <ShoppingBag className="h-8 w-8 text-stone-300 mx-auto" />
              <p className="text-stone-500 text-xs">Keranjang Anda kosong.</p>
            </div>
          ) : (
            cart.map((item, idx) => (
              <div
                key={`${item.product_id}-${item.is_redeemed_by_points}-${idx}`}
                className="bg-white border border-stone-200 rounded-xl p-4 space-y-3.5 shadow-xs"
              >
                {/* Top Row: Name and Ubah Note Button */}
                <div className="flex justify-between items-start gap-4">
                  <h4 className="text-sm font-extrabold text-stone-950 leading-tight">{item.name}</h4>
                  <button
                    onClick={() => setEditingNoteItem({
                      product_id: item.product_id,
                      is_redeemed_by_points: item.is_redeemed_by_points,
                      oldNotes: item.notes || '',
                      newNotes: item.notes || '',
                      quantity: item.quantity
                    })}
                    className="rounded-lg border border-stone-250 bg-stone-50/50 hover:bg-stone-50 px-2.5 py-1 text-[10px] font-bold text-stone-700 transition flex items-center gap-1"
                  >
                    <Edit2 className="h-3 w-3" /> Ubah
                  </button>
                </div>

                {/* Notes Display */}
                <div className="flex items-center gap-1.5 text-[11px] text-stone-500">
                  <FileText className="h-3.5 w-3.5 text-stone-400" />
                  {item.notes ? (
                    <span className="text-stone-700 font-medium italic">"{item.notes}"</span>
                  ) : (
                    <span>Belum menambah catatan</span>
                  )}
                </div>

                {/* Price and Quantity Selector Row */}
                <div className="flex justify-between items-center pt-2 border-t border-stone-100">
                  <span className="text-xs font-bold text-stone-900">
                    {item.is_redeemed_by_points ? 'Redeem Poin' : formatIDR(item.price_per_unit)}
                  </span>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => updateCartQty(item.product_id, item.is_redeemed_by_points, item.notes, item.quantity - 1)}
                      className="p-1.5 rounded-lg border border-stone-250 hover:bg-stone-100 text-stone-600 transition"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="text-xs font-extrabold text-stone-800 w-5 text-center">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateCartQty(item.product_id, item.is_redeemed_by_points, item.notes, item.quantity + 1)}
                      className="p-1.5 rounded-lg border border-stone-250 hover:bg-stone-100 text-stone-600 transition"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Tambah Catatan Lainnya (Global) */}
        {cart.length > 0 && (
          <div className="bg-white border border-stone-200 rounded-xl p-3 flex items-center gap-3 shadow-xs">
            <Edit2 className="h-4.5 w-4.5 text-stone-500 shrink-0" />
            <input
              type="text"
              value={checkoutNotes}
              onChange={(e) => setCheckoutNotes(e.target.value)}
              placeholder="Tambah catatan lainnya"
              className="w-full text-xs text-stone-850 placeholder-stone-500 outline-none bg-transparent"
            />
          </div>
        )}

        {/* Rincian Pembayaran Card */}
        {cart.length > 0 && (
          <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-xs space-y-4">
            <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider text-center">
              Rincian Pembayaran
            </h4>
            <div className="space-y-2.5 text-xs text-stone-600 pt-2">
              <div className="flex justify-between">
                <span>Subtotal ({totalItemsCount} menu)</span>
                <span className="font-semibold text-stone-850">{formatIDR(totalPrice)}</span>
              </div>
              <div className="flex justify-between">
                <span>Biaya Layanan</span>
                <span className="font-semibold text-stone-850">{formatIDR(1000)}</span>
              </div>
              <div className="flex justify-between border-t border-stone-100 pt-3 text-sm font-extrabold text-stone-900">
                <span>Total</span>
                <span className="text-orange-600">{formatIDR(totalPrice + 1000)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Fixed Bottom Action Panel */}
        {cart.length > 0 && (
          <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-stone-200 shadow-[0_-8px_30px_rgb(0,0,0,0.08)] p-4 md:px-8">
            <div className="mx-auto max-w-2xl flex items-center justify-between gap-4">
              <div>
                <p className="text-[10px] text-stone-500 font-bold uppercase tracking-wider">Total Pembayaran</p>
                <p className="text-lg font-black text-orange-600">{formatIDR(totalPrice + 1000)}</p>
              </div>
              <button
                onClick={() => {
                  if (!user) {
                    setAuthError('');
                    setShowLoginModal(true);
                  } else {
                    setShowPaymentSelection(true);
                  }
                }}
                className="btn-transition rounded-xl bg-orange-600 hover:bg-orange-700 px-6 py-3 text-xs font-bold text-white shadow-md shadow-orange-600/10 flex items-center gap-1.5 shrink-0"
              >
                <span>Lanjut Pembayaran</span>
              </button>
            </div>
          </div>
        )}

        {/* Payment Selection Modal */}
        {showPaymentSelection && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-xs" onClick={() => setShowPaymentSelection(false)} />
            <div className="relative w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl z-10 animate-slide-up space-y-4">
              <div className="flex items-center justify-between border-b border-stone-100 pb-2.5">
                <span className="text-xs font-bold text-stone-800 uppercase tracking-wider">Pilih Metode Pembayaran</span>
                <button onClick={() => setShowPaymentSelection(false)} className="text-stone-400 hover:text-stone-600">
                  <X className="h-4.5 w-4.5" />
                </button>
              </div>
              <div className="grid grid-cols-1 gap-2.5">
                <button
                  onClick={() => handleCheckout('online_qris')}
                  className="w-full flex items-center gap-3 p-3.5 border border-stone-200 hover:border-orange-500 rounded-xl bg-stone-50 hover:bg-orange-50/10 transition text-left"
                >
                  <QrCode className="h-5 w-5 text-orange-600" />
                  <div>
                    <h5 className="text-xs font-bold text-stone-800">Bayar Online (QRIS)</h5>
                    <p className="text-[10px] text-stone-500 mt-0.5">Konfirmasi instant lewat simulator QR code</p>
                  </div>
                </button>
                <button
                  onClick={() => handleCheckout('cashier')}
                  className="w-full flex items-center gap-3 p-3.5 border border-stone-200 hover:border-orange-500 rounded-xl bg-stone-50 hover:bg-orange-50/10 transition text-left"
                >
                  <Store className="h-5 w-5 text-stone-700" />
                  <div>
                    <h5 className="text-xs font-bold text-stone-800">Bayar di Kasir</h5>
                    <p className="text-[10px] text-stone-500 mt-0.5">Dapatkan kode bayar untuk ditunjukkan ke Kasir</p>
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Checkout Results Modal */}
        {showCheckoutModal && checkoutResult && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-xs" onClick={() => { if (paymentSuccess || checkoutResult.order.payment_method === 'cashier') { setShowCheckoutModal(false); setIsCheckoutView(false); } }} />

            <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white p-6 shadow-2xl z-10 animate-slide-up">
              {checkoutResult.order.payment_method === 'online_qris' ? (
                <div className="text-center">
                  {paymentSuccess ? (
                    <div className="py-6 space-y-4">
                      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                        <CheckCircle2 className="h-8 w-8" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-stone-900">Pembayaran Online Sukses!</h3>
                        <p className="text-stone-500 text-xs mt-1">Pesanan Anda telah didistribusikan ke Kasir & Dapur.</p>
                      </div>
                      <div className="rounded-xl bg-stone-50 p-4 text-left border border-stone-150 space-y-2 mt-4">
                        <div className="flex justify-between text-xs text-stone-600">
                          <span>Nomor Pesanan</span>
                          <span className="font-bold text-stone-900">{checkoutResult.order.order_number}</span>
                        </div>
                        <div className="flex justify-between text-xs text-stone-600">
                          <span>Status Pengerjaan</span>
                          <span className="font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded">Sedang Disiapkan</span>
                        </div>
                      </div>
                      <button
                        onClick={() => { setShowCheckoutModal(false); setIsCheckoutView(false); }}
                        className="btn-transition w-full rounded-xl bg-amber-600 hover:bg-amber-700 py-3 text-sm font-bold text-white shadow-md shadow-amber-600/10 mt-6"
                      >
                        Selesai
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                        <span className="text-sm font-bold text-stone-900 text-left">Pembayaran QRIS Midtrans</span>
                        <button onClick={() => { setShowCheckoutModal(false); }} className="text-stone-400 hover:text-stone-600">
                          <X className="h-5 w-5" />
                        </button>
                      </div>
                      <div className="py-2">
                        <p className="text-xs text-stone-500">Scan kode QRIS di bawah ini untuk membayar:</p>
                        <h4 className="text-xl font-extrabold text-stone-900 mt-1">{formatIDR(checkoutResult.order.total_price)}</h4>
                      </div>
                      <div className="mx-auto flex h-52 w-52 items-center justify-center rounded-xl bg-stone-50 p-3 border border-stone-200">
                        <img src={checkoutResult.qris_url} alt="QRIS QR Code" className="h-full w-full object-contain" />
                      </div>
                      <div className="rounded-xl bg-amber-50 border border-amber-200/50 p-3 text-left flex items-start gap-2.5">
                        <AlertCircle className="h-4.5 w-4.5 text-amber-700 shrink-0 mt-0.5" />
                        <div className="text-[11px] text-amber-800 leading-normal">
                          <strong>Simulasi Demo:</strong> Klik tombol di bawah ini untuk menyimulasikan notifikasi sukses pembayaran QRIS.
                        </div>
                      </div>
                      <button
                        onClick={handleSimulatePayment}
                        disabled={simulatingPayment}
                        className="btn-transition w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 py-3 text-sm font-bold text-white shadow-md shadow-emerald-600/10"
                      >
                        {simulatingPayment ? 'Memverifikasi...' : 'Simulasikan Pembayaran Berhasil'}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center space-y-4">
                  <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                    <span className="text-sm font-bold text-stone-900">Pemesanan Bayar di Kasir</span>
                    <button onClick={() => { setShowCheckoutModal(false); setIsCheckoutView(false); }} className="text-stone-400 hover:text-stone-600">
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                  <div className="py-2">
                    <span className="text-[11px] font-bold uppercase tracking-widest text-amber-600">Kode Unik Transaksi</span>
                    <h3 className="text-3xl font-extrabold text-stone-900 tracking-wider mt-1">{checkoutResult.order.order_number}</h3>
                    <p className="text-xs text-stone-500 mt-2">Harap tunjukkan kode di atas kepada Kasir untuk menyelesaikan pembayaran.</p>
                  </div>
                  <div className="mx-auto border border-stone-200 rounded-xl p-4 bg-stone-50 flex flex-col items-center justify-center w-64">
                    <div className="flex h-10 w-full items-stretch justify-center gap-0.5 overflow-hidden opacity-85">
                      {Array(25).fill(0).map((_, i) => (
                        <div
                          key={i}
                          className="bg-stone-900"
                          style={{ width: `${(i % 3 === 0) ? '4px' : ((i % 4 === 0) ? '1px' : '2px')}` }}
                        />
                      ))}
                    </div>
                    <span className="text-[10px] font-mono tracking-widest text-stone-500 mt-1">{checkoutResult.order.id}</span>
                  </div>
                  <button
                    onClick={() => { setShowCheckoutModal(false); setIsCheckoutView(false); }}
                    className="btn-transition w-full rounded-xl bg-stone-800 hover:bg-stone-900 py-3 text-sm font-bold text-white"
                  >
                    Tutup & Simpan Kode
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Inline Note Editor Modal */}
        {editingNoteItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-xs" onClick={() => setEditingNoteItem(null)} />
            <div className="relative w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl z-10 space-y-4">
              <h4 className="text-xs font-bold text-stone-800 uppercase tracking-wider">Ubah Catatan Khusus</h4>
              <textarea
                value={editingNoteItem.newNotes}
                onChange={e => setEditingNoteItem({ ...editingNoteItem, newNotes: e.target.value })}
                placeholder="Contoh: Es sedikit, manis sedang..."
                className="w-full rounded-xl border border-stone-200 px-3 py-2 text-xs text-stone-800 outline-none focus:border-amber-500 bg-stone-50/50 resize-none h-20"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingNoteItem(null)}
                  className="rounded-lg border border-stone-200 px-3 py-1.5 text-xs text-stone-600 hover:bg-stone-50"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleUpdateItemNote(
                      editingNoteItem.product_id,
                      editingNoteItem.is_redeemed_by_points,
                      editingNoteItem.oldNotes,
                      editingNoteItem.newNotes,
                      editingNoteItem.quantity
                    );
                    setEditingNoteItem(null);
                  }}
                  className="rounded-lg bg-orange-600 text-white px-4 py-1.5 text-xs font-bold"
                >
                  Simpan
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // RENDER CUSTOMER MENU / GRID VIEW
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-8 pb-32">
      
      {/* Header Banner */}
      <div className="mb-6 rounded-2xl bg-amber-950 p-6 text-white shadow-xl shadow-stone-900/10 flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 h-40 w-40 rounded-full bg-amber-900/25 blur-xl"></div>
        <div className="z-10">
          <span className="text-xs font-bold uppercase tracking-widest text-amber-500 font-mono">Cafe Locana</span>
          <h2 className="text-2xl font-bold md:text-3xl mt-1">Locana Menu</h2>
          <p className="text-stone-400 text-sm mt-1 max-w-md">Nikmati kopi premium dan makanan lezat pilihan kami langsung di meja Anda.</p>
          {tableNumber && (
            <div className="mt-3 inline-flex items-center gap-2 rounded-xl bg-amber-600/20 border border-amber-500/40 px-3 py-1.5">
              <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse"></span>
              <span className="text-xs font-bold text-amber-300 uppercase tracking-wider">Meja {tableNumber}</span>
            </div>
          )}
        </div>
        {user?.role === 'customer' && (
          <div className="z-10 bg-amber-900/40 rounded-xl p-4 border border-amber-800/40 flex items-center gap-4 shrink-0 self-start md:self-center">
            <div className="bg-amber-600 p-2.5 rounded-lg shadow-sm">
              <Star className="h-5 w-5 fill-white stroke-none animate-pulse-slow" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <p className="text-xs text-amber-300 font-extrabold uppercase tracking-wider">Loyalty Member</p>
                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${
                  user.membership_tier === 'Platinum'
                    ? 'bg-purple-900/60 text-purple-200 border-purple-500'
                    : user.membership_tier === 'Gold'
                    ? 'bg-amber-900/80 text-amber-200 border-amber-500'
                    : 'bg-stone-800 text-stone-300 border-stone-600'
                }`}>
                  {user.membership_tier || 'Silver'}
                </span>
              </div>
              <p className="text-lg font-black text-white">{user.loyalty_points || 0} Poin</p>
              {user.points_expiration_date && (
                <p className="text-[9px] text-stone-400 mt-0.5">Exp: {user.points_expiration_date}</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Menu Actions: Search & Categories */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        
        {/* Categories Tab */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none shrink-0">
          <button
            onClick={() => setActiveCategory('all')}
            className={`btn-transition rounded-xl px-4 py-2 text-sm font-semibold whitespace-nowrap border ${activeCategory === 'all'
                ? 'bg-amber-600 text-white border-amber-600 shadow-md shadow-amber-600/10'
                : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'
              }`}
          >
            Semua Menu
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`btn-transition rounded-xl px-4 py-2 text-sm font-semibold whitespace-nowrap border ${activeCategory === cat.id
                  ? 'bg-amber-600 text-white border-amber-600 shadow-md shadow-amber-600/10'
                  : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'
                }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute top-3 left-3.5 h-4.5 w-4.5 text-stone-400" />
          <input
            type="text"
            placeholder="Cari makanan/minuman..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-stone-200 bg-white py-2.5 pr-4 pl-10 text-stone-800 placeholder-stone-400 outline-none text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 shadow-sm transition"
          />
        </div>
      </div>

      {/* Products Grid (Polosan) */}
      {filteredProducts.length === 0 ? (
        <div className="my-12 text-center">
          <p className="text-stone-500">Menu tidak ditemukan. Coba kata kunci lain.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {filteredProducts.map(product => {
            const cartItem = cart.find(item => item.product_id === product.id && !item.is_redeemed_by_points);
            const qtyInCart = cartItem ? cartItem.quantity : 0;

            return (
              <div
                key={product.id}
                onClick={() => handleOpenDetail(product)}
                className="btn-transition flex flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-xs hover:shadow-md cursor-pointer hover-scale"
              >
                {/* Product Image */}
                <div className="relative h-36 sm:h-44 w-full bg-stone-100">
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                </div>

                {/* Product Info */}
                <div className="p-3 flex flex-col flex-grow justify-between">
                  <div>
                    <h3 className="font-bold text-stone-900 leading-snug text-xs sm:text-sm line-clamp-1">{product.name}</h3>
                  </div>

                  {/* Price & Action Button Row */}
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <span className="text-xs sm:text-sm font-extrabold text-stone-900">
                      {formatIDR(product.price)}
                    </span>
                    
                    {qtyInCart === 0 ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddToCartFromCard(product);
                        }}
                        className="rounded-lg bg-orange-600 hover:bg-orange-700 px-3 py-1.5 text-[11px] font-bold text-white shadow-xs"
                      >
                        Tambah
                      </button>
                    ) : (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-2 border border-orange-200 rounded-lg bg-orange-50/50 px-1.5 py-1"
                      >
                        <button
                          onClick={() => updateCartQty(product.id, false, cartItem.notes, qtyInCart - 1)}
                          className="p-0.5 rounded hover:bg-orange-100 text-orange-600"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="text-[11px] font-extrabold text-orange-700 w-3 text-center">
                          {qtyInCart}
                        </span>
                        <button
                          onClick={() => updateCartQty(product.id, false, cartItem.notes, qtyInCart + 1)}
                          className="p-0.5 rounded hover:bg-orange-100 text-orange-600"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Floating Bottom Cart Popup/Bar */}
      {totalItemsCount > 0 && (
        <div className="fixed bottom-4 left-4 right-4 z-40 bg-white border border-stone-200 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] p-4 max-w-xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative bg-orange-100 text-orange-600 p-2.5 rounded-xl">
              <ShoppingBag className="h-5 w-5" />
              <span className="absolute -top-1.5 -right-1.5 bg-orange-600 text-white text-[9px] font-black rounded-full h-5 w-5 flex items-center justify-center border-2 border-white">
                {totalItemsCount}
              </span>
            </div>
            <div>
              <p className="text-[10px] text-stone-500 font-bold uppercase tracking-wider">Total Pesanan</p>
              <p className="text-base font-black text-stone-900">{formatIDR(totalPrice)}</p>
            </div>
          </div>
          <button
            onClick={() => setIsCheckoutView(true)}
            className="rounded-xl bg-orange-600 hover:bg-orange-700 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-orange-600/15"
          >
            Checkout ({totalItemsCount})
          </button>
        </div>
      )}

      {/* ===== Product Detail Modal ===== */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-xs" onClick={() => setSelectedProduct(null)} />
          <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl z-10 animate-slide-up flex flex-col max-h-[90vh]">
            
            {/* Image section with full screen view button */}
            <div className="relative h-64 bg-stone-100 shrink-0">
              <img
                src={selectedProduct.image_url}
                alt={selectedProduct.name}
                className="h-full w-full object-cover"
              />
              <button
                onClick={() => setShowFullScreenImage(true)}
                className="absolute bottom-3 right-3 bg-stone-900/70 backdrop-blur-xs text-white p-2.5 rounded-xl hover:bg-stone-900/90 transition shadow-sm"
                title="Lihat Ukuran Penuh"
              >
                <Maximize2 className="h-4.5 w-4.5" />
              </button>
              <button
                onClick={() => setSelectedProduct(null)}
                className="absolute top-3 right-3 bg-white/80 backdrop-blur-xs text-stone-700 p-1.5 rounded-xl hover:bg-white transition shadow-sm"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Scrollable details */}
            <div className="p-5 flex-grow overflow-y-auto space-y-4">
              <div>
                <h3 className="text-lg font-black text-stone-900 leading-snug">{selectedProduct.name}</h3>
                <p className="text-base font-extrabold text-orange-600 mt-1">{formatIDR(selectedProduct.price)}</p>
              </div>

              {selectedProduct.description && (
                <div className="space-y-1">
                  <h4 className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Deskripsi</h4>
                  <p className="text-xs text-stone-600 leading-relaxed">{selectedProduct.description}</p>
                </div>
              )}

              {/* Special Note Input */}
              <div className="space-y-1.5 pt-2 border-t border-stone-100">
                <label className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">
                  Catatan Khusus (Opsional)
                </label>
                <textarea
                  value={itemNote}
                  onChange={e => setItemNote(e.target.value)}
                  placeholder="Contoh: Es sedikit, gula aren dikit, no whip cream..."
                  className="w-full rounded-xl border border-stone-200 px-3 py-2.5 text-xs text-stone-800 outline-none focus:border-amber-500 bg-stone-50 resize-none h-20"
                />
              </div>
            </div>

            {/* CTA add button */}
            <div className="p-4 border-t border-stone-100 bg-stone-50/50 flex justify-end shrink-0">
              <button
                onClick={handleAddFromDetail}
                className="rounded-xl bg-orange-600 hover:bg-orange-700 px-6 py-3 text-xs font-bold text-white shadow-md shadow-orange-600/10 flex items-center gap-1.5"
              >
                <span>Tambah ke Orderan</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ===== Full Screen Image Modal ===== */}
      {showFullScreenImage && selectedProduct && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-stone-950/95 backdrop-blur-xs p-4">
          <button
            onClick={() => setShowFullScreenImage(false)}
            className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 text-white p-2.5 rounded-full transition"
          >
            <X className="h-6 w-6" />
          </button>
          <img
            src={selectedProduct.image_url}
            alt={selectedProduct.name}
            className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
          />
        </div>
      )}

      {/* ===== Auth Modal (mandatory checkout gate: Masuk / Daftar) ===== */}
      {showLoginModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-stone-900/60 backdrop-blur-xs"
            onClick={() => { setShowLoginModal(false); setAuthError(''); }}
          />
          <div className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl z-10 animate-slide-up space-y-4">
            {/* Tabs */}
            <div className="grid grid-cols-2 gap-1 rounded-xl bg-stone-100 p-1">
              <button
                onClick={() => { setAuthMode('login'); setAuthError(''); }}
                className={`rounded-lg py-2 text-xs font-bold transition ${authMode === 'login' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500'}`}
              >
                Masuk
              </button>
              <button
                onClick={() => { setAuthMode('register'); setAuthError(''); }}
                className={`rounded-lg py-2 text-xs font-bold transition ${authMode === 'register' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500'}`}
              >
                Daftar
              </button>
            </div>

            <div className="text-center">
              <h3 className="text-base font-bold text-stone-900">
                {authMode === 'login' ? 'Masuk untuk Melanjutkan' : 'Daftar Member Baru'}
              </h3>
              <p className="text-xs text-stone-500 mt-1">
                {authMode === 'login'
                  ? 'Login member untuk checkout dan kumpulkan poin loyalty.'
                  : 'Buat akun untuk checkout dan mulai kumpulkan poin.'}
              </p>
            </div>

            {authError && (
              <div className="rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">{authError}</div>
            )}

            {authMode === 'login' ? (
              <div className="space-y-3">
                <input
                  type="text"
                  value={authIdentifier}
                  onChange={e => setAuthIdentifier(e.target.value)}
                  placeholder="Email atau No. HP"
                  className="block w-full rounded-xl border border-stone-300 bg-white py-2.5 px-4 text-stone-900 outline-none text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                />
                <PasswordInput
                  value={authPassword}
                  onChange={e => setAuthPassword(e.target.value)}
                  placeholder="Password"
                  autoComplete="current-password"
                  className="rounded-xl border border-stone-300 bg-white py-2.5 px-4 text-stone-900 outline-none text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                />
                <button
                  onClick={async () => {
                    if (!authIdentifier || !authPassword) {
                      setAuthError('Email/No. HP dan password harus diisi');
                      return;
                    }
                    setAuthError('');
                    setAuthLoading(true);
                    try {
                      await login(authIdentifier, authPassword);
                      setShowLoginModal(false);
                      setAuthIdentifier(''); setAuthPassword('');
                      setShowPaymentSelection(true);
                    } catch (err) {
                      setAuthError(err.message || 'Login gagal');
                    } finally {
                      setAuthLoading(false);
                    }
                  }}
                  disabled={authLoading}
                  className="w-full rounded-xl bg-amber-600 hover:bg-amber-700 py-3 text-sm font-bold text-white disabled:bg-amber-400"
                >
                  {authLoading ? 'Memproses...' : 'Masuk & Lanjut Checkout'}
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <input
                  type="text"
                  value={regName}
                  onChange={e => setRegName(e.target.value)}
                  placeholder="Nama lengkap"
                  className="block w-full rounded-xl border border-stone-300 bg-white py-2.5 px-4 text-stone-900 outline-none text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                />
                <input
                  type="email"
                  value={regEmail}
                  onChange={e => setRegEmail(e.target.value)}
                  placeholder="Email"
                  className="block w-full rounded-xl border border-stone-300 bg-white py-2.5 px-4 text-stone-900 outline-none text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                />
                <input
                  type="tel"
                  value={regPhone}
                  onChange={e => setRegPhone(e.target.value)}
                  placeholder="No. HP (opsional)"
                  className="block w-full rounded-xl border border-stone-300 bg-white py-2.5 px-4 text-stone-900 outline-none text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                />
                <div>
                  <label className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">Tgl Lahir (opsional)</label>
                  <input
                    type="date"
                    value={regBirthday}
                    onChange={e => setRegBirthday(e.target.value)}
                    className="block w-full mt-1 rounded-xl border border-stone-300 bg-white py-2.5 px-4 text-stone-900 outline-none text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                  />
                </div>
                <PasswordInput
                  value={authPassword}
                  onChange={e => setAuthPassword(e.target.value)}
                  placeholder="Password (min. 6 karakter)"
                  autoComplete="new-password"
                  className="rounded-xl border border-stone-300 bg-white py-2.5 px-4 text-stone-900 outline-none text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                />
                <button
                  onClick={async () => {
                    if (!regName || !regEmail || !authPassword) {
                      setAuthError('Nama, email, dan password harus diisi');
                      return;
                    }
                    if (authPassword.length < 6) {
                      setAuthError('Password minimal 6 karakter');
                      return;
                    }
                    setAuthError('');
                    setAuthLoading(true);
                    try {
                      await register({
                        name: regName,
                        email: regEmail,
                        phone: regPhone || undefined,
                        birthday: regBirthday || undefined,
                        password: authPassword
                      });
                      setShowLoginModal(false);
                      setRegName(''); setRegEmail(''); setRegPhone(''); setRegBirthday(''); setAuthPassword('');
                      setShowPaymentSelection(true);
                    } catch (err) {
                      setAuthError(err.message || 'Registrasi gagal');
                    } finally {
                      setAuthLoading(false);
                    }
                  }}
                  disabled={authLoading}
                  className="w-full rounded-xl bg-amber-600 hover:bg-amber-700 py-3 text-sm font-bold text-white disabled:bg-amber-400"
                >
                  {authLoading ? 'Memproses...' : 'Daftar & Lanjut Checkout'}
                </button>
              </div>
            )}

            <button
              onClick={() => { setShowLoginModal(false); setAuthError(''); }}
              className="w-full rounded-xl border border-stone-200 py-2.5 text-xs font-semibold text-stone-600 hover:bg-stone-50"
            >
              Batal
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default CustomerMenu;
