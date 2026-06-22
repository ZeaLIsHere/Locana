import React, { useState } from 'react';
import { useOrder } from '../../context/OrderContext';
import { useAuth } from '../../context/AuthContext';
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
  AlertCircle
} from 'lucide-react';

const CustomerMenu = ({ isCartOpen, setIsCartOpen }) => {
  const { user, refreshProfile } = useAuth();
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
  const [cartNotes, setCartNotes] = useState({});
  const [checkoutNotes, setCheckoutNotes] = useState('');

  // Checkout Modal State
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [checkoutResult, setCheckoutResult] = useState(null);
  const [simulatingPayment, setSimulatingPayment] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  // Totals
  const { totalPrice, totalPointsCost, totalPointsEarned, totalItemsCount } = getCartTotals();

  // Filter products
  const filteredProducts = products.filter(product => {
    const matchesCategory = activeCategory === 'all' || product.category_id === activeCategory;
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (product.description && product.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch && product.is_available;
  });

  const handleAddToCart = (product, isRedeemed = false) => {
    const notes = cartNotes[product.id] || '';
    addToCart(product, 1, notes, isRedeemed);
    // Reset item input notes
    setCartNotes(prev => ({ ...prev, [product.id]: '' }));
  };

  const handleCheckout = async (method) => {
    try {
      const result = await checkout(method, checkoutNotes);
      setCheckoutResult(result);
      setShowCheckoutModal(true);
      setIsCartOpen(false);
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
      const response = await fetch(`/api/orders/${checkoutResult.order.id}/pay`, {
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

  const formatIDR = (num) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(num);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-8">

      {/* Header Banner */}
      <div className="mb-8 rounded-2xl bg-amber-950 p-6 text-white shadow-xl shadow-stone-900/10 flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 h-40 w-40 rounded-full bg-amber-900/25 blur-xl"></div>
        <div className="z-10">
          <span className="text-xs font-bold uppercase tracking-widest text-amber-500">Cafe Favoritmu</span>
          <h2 className="text-2xl font-bold md:text-3xl mt-1">Locana Menu</h2>
          <p className="text-stone-400 text-sm mt-1 max-w-md">Nikmati kopi premium dan makanan lezat pilihan kami langsung di meja Anda.</p>
        </div>
        {user?.role === 'customer' && (
          <div className="z-10 bg-amber-900/40 rounded-xl p-4 border border-amber-800/40 flex items-center gap-3 shrink-0 self-start md:self-center">
            <div className="bg-amber-600 p-2.5 rounded-lg">
              <Star className="h-5 w-5 fill-white stroke-none" />
            </div>
            <div>
              <p className="text-xs text-amber-300 font-medium uppercase tracking-wider">Loyalty Member</p>
              <p className="text-lg font-extrabold text-white">{user.loyalty_points || 0} Poin</p>
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

      {/* Products Grid */}
      {filteredProducts.length === 0 ? (
        <div className="my-12 text-center">
          <p className="text-stone-500">Menu tidak ditemukan. Coba kata kunci lain.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {filteredProducts.map(product => {
            const hasEnoughPoints = user && product.points_cost > 0 && user.loyalty_points >= product.points_cost;

            return (
              <div key={product.id} className="btn-transition flex flex-col overflow-hidden rounded-2xl border border-stone-200/80 bg-white shadow-sm hover:shadow-md hover-scale">

                {/* Product Image */}
                <div className="relative h-44 w-full bg-stone-100">
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                  {product.points_reward > 0 && (
                    <div className="absolute top-3 left-3 rounded-full bg-amber-500/90 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm flex items-center gap-1 backdrop-blur-xs">
                      <Star className="h-3 w-3 fill-white stroke-none" />
                      <span>+{product.points_reward} Poin</span>
                    </div>
                  )}
                </div>

                {/* Product Info */}
                <div className="flex flex-grow flex-col p-4">
                  <h3 className="font-bold text-stone-900 leading-snug">{product.name}</h3>
                  <p className="mt-1 text-xs text-stone-500 line-clamp-2 flex-grow">{product.description}</p>

                  {/* Note Input per Product */}
                  <div className="mt-3">
                    <input
                      type="text"
                      placeholder="Catatan khusus (es dikit, dll)..."
                      value={cartNotes[product.id] || ''}
                      onChange={(e) => setCartNotes({ ...cartNotes, [product.id]: e.target.value })}
                      className="w-full rounded-lg border border-stone-200/80 px-2.5 py-1.5 text-[11px] text-stone-700 outline-none focus:border-amber-500 bg-stone-50"
                    />
                  </div>

                  {/* Price & Action Buttons */}
                  <div className="mt-4 flex flex-col gap-2 pt-3 border-t border-stone-100">
                    <div className="flex items-center justify-between">
                      <span className="text-base font-bold text-stone-900">{formatIDR(product.price)}</span>
                      {product.points_cost > 0 && (
                        <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md flex items-center gap-0.5 border border-amber-100">
                          {product.points_cost} Pts
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 gap-1.5 mt-1">
                      <button
                        onClick={() => handleAddToCart(product, false)}
                        className="btn-transition rounded-xl bg-amber-600 hover:bg-amber-700 px-3 py-2 text-xs font-bold text-white shadow-xs flex items-center justify-center gap-1"
                      >
                        <Plus className="h-3.5 w-3.5" /> Beli
                      </button>

                      {/* Loyalty Redeem Button (visible only to logged-in customers with enough points) */}
                      {user?.role === 'customer' && product.points_cost > 0 && (
                        <button
                          onClick={() => handleAddToCart(product, true)}
                          disabled={!hasEnoughPoints}
                          className={`btn-transition rounded-xl px-3 py-2 text-xs font-bold border transition flex items-center justify-center gap-1 ${hasEnoughPoints
                              ? 'bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200'
                              : 'bg-stone-50 text-stone-400 border-stone-200 cursor-not-allowed'
                            }`}
                        >
                          <Star className="h-3.5 w-3.5 fill-current" /> Tukar Poin
                        </button>
                      )}
                    </div>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* Cart Drawer Overlay & Sidebar */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div
            onClick={() => setIsCartOpen(false)}
            className="absolute inset-0 bg-stone-900/40 backdrop-blur-xs"
          />

          {/* Drawer Panel */}
          <div className="relative flex h-full w-full max-w-md flex-col bg-white shadow-2xl animate-slide-up">

            {/* Drawer Header */}
            <div className="flex items-center justify-between border-b border-stone-200 px-5 py-4">
              <div className="flex items-center gap-2">
                <ShoppingBag className="h-5 w-5 text-amber-600" />
                <h3 className="text-lg font-bold text-stone-900">Keranjang Belanja</h3>
                <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-semibold text-stone-600">
                  {totalItemsCount}
                </span>
              </div>
              <button
                onClick={() => setIsCartOpen(false)}
                className="btn-transition rounded-lg p-1.5 hover:bg-stone-100 text-stone-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Drawer Items list */}
            <div className="flex-grow overflow-y-auto px-5 py-4 space-y-4">
              {cart.length === 0 ? (
                <div className="flex h-64 flex-col items-center justify-center text-center">
                  <ShoppingBag className="h-10 w-10 text-stone-300 mb-2" />
                  <p className="text-stone-500 text-sm">Keranjang Anda masih kosong.</p>
                </div>
              ) : (
                cart.map((item, idx) => (
                  <div key={`${item.product_id}-${item.is_redeemed_by_points}-${idx}`} className="flex gap-3 border-b border-stone-100 pb-4">
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="h-16 w-16 rounded-xl object-cover bg-stone-100 shrink-0"
                    />
                    <div className="flex-grow min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-bold text-sm text-stone-900 truncate">{item.name}</h4>
                        <button
                          onClick={() => removeFromCart(item.product_id, item.is_redeemed_by_points, item.notes)}
                          className="text-stone-400 hover:text-red-600 transition"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      {/* Price / Points tag */}
                      <p className="text-xs mt-0.5 font-semibold">
                        {item.is_redeemed_by_points ? (
                          <span className="text-amber-700 flex items-center gap-0.5">
                            <Star className="h-3 w-3 fill-amber-500 stroke-none" /> {item.points_cost} Poin (Redeem)
                          </span>
                        ) : (
                          <span className="text-stone-700">{formatIDR(item.price_per_unit)}</span>
                        )}
                      </p>

                      {/* Display note if any */}
                      {item.notes && (
                        <p className="text-[10px] text-amber-600 font-medium italic mt-1 bg-amber-50/50 px-2 py-0.5 rounded-md inline-block">
                          Note: "{item.notes}"
                        </p>
                      )}

                      {/* Quantity Controller */}
                      <div className="flex items-center gap-2 mt-2">
                        <button
                          onClick={() => updateCartQty(item.product_id, item.is_redeemed_by_points, item.notes, item.quantity - 1)}
                          className="btn-transition rounded-md border border-stone-200 p-1 hover:bg-stone-50 text-stone-600"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="text-xs font-bold text-stone-800 w-5 text-center">{item.quantity}</span>
                        <button
                          onClick={() => updateCartQty(item.product_id, item.is_redeemed_by_points, item.notes, item.quantity + 1)}
                          className="btn-transition rounded-md border border-stone-200 p-1 hover:bg-stone-50 text-stone-600"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Drawer Footer / Summary */}
            {cart.length > 0 && (
              <div className="border-t border-stone-200 bg-stone-50 p-5 space-y-4">

                {/* Checkout Custom Notes */}
                <div>
                  <label className="text-xs font-semibold text-stone-600">Catatan Tambahan Pesanan (Opsional)</label>
                  <input
                    type="text"
                    value={checkoutNotes}
                    onChange={(e) => setCheckoutNotes(e.target.value)}
                    placeholder="Contoh: Nomor meja 5, sendok garpu..."
                    className="w-full mt-1.5 rounded-xl border border-stone-300 bg-white px-3 py-2 text-xs text-stone-800 outline-none focus:border-amber-500"
                  />
                </div>

                {/* Calculations */}
                <div className="space-y-1.5 text-xs text-stone-600 border-t border-stone-200/60 pt-3">
                  {totalPointsCost > 0 && (
                    <div className="flex justify-between text-amber-700 font-semibold">
                      <span>Total Poin Ditukar</span>
                      <span className="flex items-center gap-0.5">
                        <Star className="h-3 w-3 fill-amber-500 stroke-none" /> {totalPointsCost} Pts
                      </span>
                    </div>
                  )}
                  {totalPointsEarned > 0 && (
                    <div className="flex justify-between text-emerald-700 font-semibold">
                      <span>Poin yang Didapat</span>
                      <span>+{totalPointsEarned} Pts</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-stone-200/60 pt-2 text-sm font-bold text-stone-900">
                    <span>Total Pembayaran</span>
                    <span>{formatIDR(totalPrice)}</span>
                  </div>
                </div>

                {/* Checkout buttons */}
                <div className="grid grid-cols-2 gap-3.5 pt-2">
                  <button
                    onClick={() => handleCheckout('online_qris')}
                    className="btn-transition rounded-xl bg-amber-600 hover:bg-amber-700 py-3 text-xs font-bold text-white shadow-md shadow-amber-600/10 flex flex-col items-center justify-center gap-1"
                  >
                    <QrCode className="h-4.5 w-4.5" />
                    <span>Bayar Online (QRIS)</span>
                  </button>
                  <button
                    onClick={() => handleCheckout('cashier')}
                    className="btn-transition rounded-xl bg-stone-800 hover:bg-stone-900 py-3 text-xs font-bold text-white shadow-md shadow-stone-800/10 flex flex-col items-center justify-center gap-1"
                  >
                    <Store className="h-4.5 w-4.5" />
                    <span>Bayar di Kasir</span>
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* Checkout Results Modal */}
      {showCheckoutModal && checkoutResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-xs" onClick={() => { if (paymentSuccess || checkoutResult.order.payment_method === 'cashier') setShowCheckoutModal(false); }} />

          <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white p-6 shadow-2xl z-10 animate-slide-up">

            {/* QRIS Online Checkout view */}
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
                      onClick={() => setShowCheckoutModal(false)}
                      className="btn-transition w-full rounded-xl bg-amber-600 hover:bg-amber-700 py-3 text-sm font-bold text-white shadow-md shadow-amber-600/10 mt-6"
                    >
                      Selesai
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                      <span className="text-sm font-bold text-stone-900 text-left">Pembayaran QRIS Midtrans</span>
                      <button
                        onClick={() => setShowCheckoutModal(false)}
                        className="text-stone-400 hover:text-stone-600"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>

                    <div className="py-2">
                      <p className="text-xs text-stone-500">Scan kode QRIS di bawah ini untuk membayar:</p>
                      <h4 className="text-xl font-extrabold text-stone-900 mt-1">{formatIDR(checkoutResult.order.total_price)}</h4>
                    </div>

                    {/* QR Code image mock */}
                    <div className="mx-auto flex h-52 w-52 items-center justify-center rounded-xl bg-stone-50 p-3 border border-stone-200">
                      <img
                        src={checkoutResult.qris_url}
                        alt="QRIS QR Code"
                        className="h-full w-full object-contain"
                      />
                    </div>

                    <div className="rounded-xl bg-amber-50 border border-amber-200/50 p-3 text-left flex items-start gap-2.5">
                      <AlertCircle className="h-4.5 w-4.5 text-amber-700 shrink-0 mt-0.5" />
                      <div className="text-[11px] text-amber-800 leading-normal">
                        <strong>Simulasi Demo:</strong> Pada fase prototipe ini, Anda dapat menyimulasikan pembayaran selesai instan dengan menekan tombol simulasi di bawah.
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
              /* Pay at Cashier Checkout view */
              <div className="text-center space-y-4">
                <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                  <span className="text-sm font-bold text-stone-900">Pemesanan Bayar di Kasir</span>
                  <button
                    onClick={() => setShowCheckoutModal(false)}
                    className="text-stone-400 hover:text-stone-600"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="py-2">
                  <span className="text-[11px] font-bold uppercase tracking-widest text-amber-600">Kode Unik Transaksi</span>
                  <h3 className="text-3xl font-extrabold text-stone-900 tracking-wider mt-1">{checkoutResult.order.order_number}</h3>
                  <p className="text-xs text-stone-500 mt-2">Harap tunjukkan kode di atas kepada Kasir untuk menyelesaikan pembayaran.</p>
                </div>

                {/* Simulated Barcode */}
                <div className="mx-auto border border-stone-200 rounded-xl p-4 bg-stone-50 flex flex-col items-center justify-center w-64">
                  {/* Mock Barcode sticks */}
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

                <div className="rounded-xl bg-stone-50 p-4 text-left border border-stone-150 space-y-2.5 text-xs text-stone-600">
                  <div className="flex justify-between">
                    <span>Total Pembayaran</span>
                    <span className="font-bold text-stone-900">{formatIDR(checkoutResult.order.total_price)}</span>
                  </div>
                  {checkoutResult.order.points_redeemed > 0 && (
                    <div className="flex justify-between text-amber-700">
                      <span>Poin Ditukarkan</span>
                      <span>{checkoutResult.order.points_redeemed} Pts</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Status Transaksi</span>
                    <span className="font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded">Belum Dibayar</span>
                  </div>
                </div>

                <button
                  onClick={() => setShowCheckoutModal(false)}
                  className="btn-transition w-full rounded-xl bg-stone-800 hover:bg-stone-900 py-3 text-sm font-bold text-white"
                >
                  Tutup & Simpan Kode
                </button>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
};

export default CustomerMenu;
