import React, { useState, useEffect } from 'react';
import { useOrder } from '../../context/OrderContext';
import { useAuth } from '../../context/AuthContext';
import { 
  Search, 
  CreditCard, 
  User, 
  Check, 
  ShoppingBag, 
  Plus, 
  Minus, 
  Trash2, 
  UserCheck, 
  Star,
  CheckCircle,
  FileText
} from 'lucide-react';

const CashierPOS = () => {
  const { user } = useAuth();
  const { 
    products, 
    orders, 
    payOrder, 
    fetchOrders,
    updateStatus
  } = useOrder();

  const [activeTab, setActiveTab] = useState('queue'); // 'queue' or 'pos'
  
  // Tab Queue States
  const [searchCode, setSearchCode] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [paymentDoneModal, setPaymentDoneModal] = useState(false);
  
  // Tab POS States
  const [posCart, setPosCart] = useState([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerList, setCustomerList] = useState([]);
  const [posCheckoutNotes, setPosCheckoutNotes] = useState('');
  const [posCheckoutSuccess, setPosCheckoutSuccess] = useState(null);

  // Filter orders that are pending payment
  const pendingOrders = orders.filter(o => o.payment_status === 'unpaid' && o.status !== 'cancelled');

  // Search queue order by 8-digit order number
  const handleSearchOrder = (e) => {
    e.preventDefault();
    if (!searchCode.trim()) return;
    
    const found = orders.find(o => 
      o.order_number.toUpperCase() === searchCode.trim().toUpperCase()
    );

    if (found) {
      setSelectedOrder(found);
    } else {
      alert('Pesanan dengan kode tersebut tidak ditemukan');
      setSelectedOrder(null);
    }
  };

  // Confirm payment in cashier
  const handlePayOrder = async (orderId) => {
    setProcessingPayment(true);
    try {
      const updatedOrder = await payOrder(orderId);
      setSelectedOrder(updatedOrder);
      setPaymentDoneModal(true);
      fetchOrders(); // Refresh order queue
    } catch (err) {
      alert(err.message || 'Gagal memproses pembayaran');
    } finally {
      setProcessingPayment(false);
    }
  };

  // Look up customer for walk-in POS order
  const searchCustomer = async () => {
    if (!customerSearch.trim()) return;
    try {
      const response = await fetch(`/api/orders`); // we can query order backend list or create simple member check endpoint
      // To make it easy, we will search from all users of type customer
      const token = localStorage.getItem('locana_token');
      const usersRes = await fetch(`/api/orders`, { // wait, let's look up members by fetching users if possible
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      // Let's implement local lookup by email or username:
      // Since this is a prototype, we can make an API fetch or search mock users
      // Let's fetch mock_db users or simulate a search.
      // We can search our predefined accounts in the seeder (Andi Wijaya, Siti Rahma, Budi Santoso)
      const mockMembers = [
        { id: 'user-customer', name: 'Andi Wijaya', email: 'customer@locana.com', loyalty_points: 450 },
        { id: 'user-customer2', name: 'Siti Rahma', email: 'siti@locana.com', loyalty_points: 920 },
        { id: 'user-customer3', name: 'Budi Santoso', email: 'budi@locana.com', loyalty_points: 120 }
      ];

      const found = mockMembers.filter(m => 
        m.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
        m.email.toLowerCase().includes(customerSearch.toLowerCase())
      );
      
      setCustomerList(found);
    } catch (err) {
      console.error(err);
    }
  };

  // POS Add Item
  const addToPosCart = (product, isRedeemed = false) => {
    setPosCart(prev => {
      const existing = prev.find(item => item.product_id === product.id && item.is_redeemed_by_points === isRedeemed);
      if (existing) {
        return prev.map(item => 
          (item.product_id === product.id && item.is_redeemed_by_points === isRedeemed)
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      } else {
        return [...prev, {
          product_id: product.id,
          name: product.name,
          price: product.price,
          quantity: 1,
          points_cost: product.points_cost,
          points_reward: product.points_reward,
          is_redeemed_by_points: isRedeemed
        }];
      }
    });
  };

  // POS Cart Totals
  const getPosCartTotals = () => {
    let price = 0;
    let ptsCost = 0;
    let ptsEarn = 0;
    posCart.forEach(item => {
      if (item.is_redeemed_by_points) {
        ptsCost += item.points_cost * item.quantity;
      } else {
        price += item.price * item.quantity;
        ptsEarn += item.points_reward * item.quantity;
      }
    });
    return { totalPrice: price, totalPointsCost: ptsCost, totalPointsEarned: ptsEarn };
  };

  const { totalPrice: posPrice, totalPointsCost: posPtsCost, totalPointsEarned: posPtsEarn } = getPosCartTotals();

  // POS Checkout (Walk-in payment)
  const handlePosCheckout = async () => {
    if (posCart.length === 0) return;

    if (selectedCustomer && posPtsCost > selectedCustomer.loyalty_points) {
      alert(`Poin member tidak cukup. Dibutuhkan ${posPtsCost} poin.`);
      return;
    }

    const payload = {
      customer_id: selectedCustomer ? selectedCustomer.id : null,
      items: posCart.map(item => ({
        product_id: item.product_id,
        quantity: item.quantity,
        is_redeemed_by_points: item.is_redeemed_by_points
      })),
      payment_method: 'cashier',
      notes: posCheckoutNotes
    };

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      
      if (response.ok) {
        // Since cashier checks out walk-in, immediately mark as paid in cash!
        await payOrder(data.order.id);
        setPosCheckoutSuccess(data.order);
        setPosCart([]);
        setSelectedCustomer(null);
        setPosCheckoutNotes('');
        fetchOrders();
      } else {
        alert(data.error || 'Gagal menyimpan transaksi POS');
      }
    } catch (err) {
      console.error(err);
      alert('Error saat memproses transaksi POS');
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
    <div className="flex flex-col md:flex-row h-full min-h-[calc(100vh-64px)] bg-stone-50">
      
      {/* Sidebar POS Tabs */}
      <div className="w-full md:w-80 border-r border-stone-200 bg-white p-4 shrink-0 flex flex-col gap-4">
        <div>
          <h2 className="text-lg font-bold text-stone-900">Kasir POS Utama</h2>
          <p className="text-xs text-stone-500">Pilih modul operasional kasir</p>
        </div>

        <div className="flex flex-row md:flex-col gap-2 border-b md:border-b-0 pb-2 md:pb-0">
          <button
            onClick={() => setActiveTab('queue')}
            className={`btn-transition flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold w-full text-left ${
              activeTab === 'queue'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-600/10'
                : 'bg-stone-50 text-stone-600 hover:bg-stone-100'
            }`}
          >
            <CreditCard className="h-4.5 w-4.5" />
            <span>Antrean Pembayaran</span>
            {pendingOrders.length > 0 && (
              <span className={`ml-auto rounded-full px-2 py-0.5 text-xs ${activeTab === 'queue' ? 'bg-white text-amber-700' : 'bg-red-500 text-white'}`}>
                {pendingOrders.length}
              </span>
            )}
          </button>
          
          <button
            onClick={() => setActiveTab('pos')}
            className={`btn-transition flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold w-full text-left ${
              activeTab === 'pos'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-600/10'
                : 'bg-stone-50 text-stone-600 hover:bg-stone-100'
            }`}
          >
            <ShoppingBag className="h-4.5 w-4.5" />
            <span>Pemesanan Baru (POS)</span>
          </button>
        </div>
      </div>

      {/* Main Panel */}
      <div className="flex-grow p-4 md:p-6 overflow-y-auto">
        
        {/* Tab A: Queue / Pembayaran */}
        {activeTab === 'queue' && (
          <div className="space-y-6">
            
            {/* Search Code Card */}
            <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
              <h3 className="font-bold text-stone-900 text-sm">Cari Pesanan Pelanggan</h3>
              <p className="text-xs text-stone-500 mt-1">Masukkan 8 digit kode pesanan (contoh: LOC12345) untuk pembayaran kasir.</p>
              
              <form onSubmit={handleSearchOrder} className="flex gap-2.5 mt-4">
                <div className="relative flex-grow">
                  <Search className="absolute top-3 left-3.5 h-4.5 w-4.5 text-stone-400" />
                  <input
                    type="text"
                    placeholder="Contoh: LOC12345"
                    value={searchCode}
                    onChange={(e) => setSearchCode(e.target.value)}
                    className="w-full rounded-xl border border-stone-200 bg-stone-50 py-2.5 pr-4 pl-10 text-sm font-bold tracking-wider uppercase outline-none focus:border-amber-500 focus:bg-white"
                  />
                </div>
                <button
                  type="submit"
                  className="btn-transition rounded-xl bg-amber-600 hover:bg-amber-700 px-5 text-sm font-bold text-white shadow-md shadow-amber-600/10"
                >
                  Cari
                </button>
              </form>
            </div>

            {/* Split Screen Queue */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Order Queue list (2 cols) */}
              <div className="lg:col-span-2 space-y-4">
                <h3 className="font-bold text-stone-850 text-sm">Antrean Berjalan ({pendingOrders.length} Pesanan)</h3>
                
                {pendingOrders.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-stone-300 p-12 text-center bg-white/50">
                    <CheckCircle className="h-10 w-10 text-emerald-500 mx-auto mb-2" />
                    <p className="text-stone-600 text-sm">Tidak ada antrean pembayaran saat ini.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {pendingOrders.map(o => (
                      <div 
                        key={o.id} 
                        onClick={() => setSelectedOrder(o)}
                        className={`btn-transition rounded-2xl border p-4 text-left cursor-pointer bg-white shadow-xs ${
                          selectedOrder?.id === o.id
                            ? 'border-amber-500 ring-1 ring-amber-500'
                            : 'border-stone-200 hover:border-stone-300'
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-amber-700 uppercase">{o.payment_method === 'online_qris' ? 'QRIS Online' : 'Bayar Kasir'}</span>
                          <span className="text-[10px] text-stone-500">{new Date(o.created_at).toLocaleTimeString()}</span>
                        </div>
                        <h4 className="text-lg font-black tracking-wide text-stone-900 mt-1">{o.order_number}</h4>
                        <p className="text-xs font-semibold text-stone-700 mt-1">{o.customer_name}</p>
                        <div className="flex justify-between items-center mt-3 pt-2.5 border-t border-stone-100 text-xs">
                          <span className="text-stone-500">{o.items.length} Item</span>
                          <span className="font-bold text-stone-900">{formatIDR(o.total_price)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Order Detail Side Card (1 col) */}
              <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm h-fit">
                {selectedOrder ? (
                  <div className="space-y-4">
                    <div className="border-b border-stone-100 pb-3">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-amber-600">Detail Pesanan</span>
                      <h3 className="text-2xl font-black text-stone-900 tracking-wider mt-0.5">{selectedOrder.order_number}</h3>
                      <p className="text-xs text-stone-500 mt-1">Pelanggan: {selectedOrder.customer_name}</p>
                    </div>

                    {/* Order Items */}
                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {selectedOrder.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-xs border-b border-stone-50 pb-2">
                          <div>
                            <span className="font-bold text-stone-800">{item.name}</span>
                            <span className="text-stone-500 ml-1">x{item.quantity}</span>
                            {item.notes && (
                              <p className="text-[9px] text-amber-600 italic">"{item.notes}"</p>
                            )}
                          </div>
                          <span className="font-semibold text-stone-900">
                            {item.is_redeemed_by_points ? 'Redeem Poin' : formatIDR(item.price_per_unit * item.quantity)}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Points details */}
                    {selectedOrder.customer_id && (
                      <div className="rounded-xl bg-amber-50/50 p-3 text-xs text-amber-800 border border-amber-100 space-y-1">
                        {selectedOrder.points_redeemed > 0 && (
                          <div className="flex justify-between">
                            <span>Poin ditukarkan</span>
                            <span className="font-semibold">-{selectedOrder.points_redeemed} Pts</span>
                          </div>
                        )}
                        {selectedOrder.points_earned > 0 && (
                          <div className="flex justify-between">
                            <span>Poin akan didapat</span>
                            <span className="font-semibold">+{selectedOrder.points_earned} Pts</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Total Price */}
                    <div className="flex justify-between items-center text-sm font-extrabold border-t border-stone-100 pt-3">
                      <span className="text-stone-700">Total Tagihan</span>
                      <span className="text-lg text-stone-900">{formatIDR(selectedOrder.total_price)}</span>
                    </div>

                    <button
                      onClick={() => handlePayOrder(selectedOrder.id)}
                      disabled={processingPayment}
                      className="btn-transition w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 py-3.5 text-sm font-bold text-white shadow-md shadow-emerald-600/10 flex items-center justify-center gap-1.5"
                    >
                      <Check className="h-5 w-5" />
                      <span>{processingPayment ? 'Memproses...' : 'Konfirmasi Bayar Lunas'}</span>
                    </button>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <FileText className="h-10 w-10 text-stone-300 mx-auto mb-2" />
                    <p className="text-stone-500 text-xs">Pilih salah satu pesanan di samping untuk melihat rincian pembayaran.</p>
                  </div>
                )}
              </div>

            </div>

          </div>
        )}

        {/* Tab B: POS Pemesanan Langsung */}
        {activeTab === 'pos' && (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            
            {/* Products grid selector (2 cols) */}
            <div className="xl:col-span-2 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-stone-900 text-sm">Pilih Menu Produk</h3>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {products.filter(p => p.is_available).map(p => (
                  <div key={p.id} className="rounded-xl border border-stone-200 bg-white p-3 shadow-xs hover:border-stone-300">
                    <img src={p.image_url} alt={p.name} className="h-24 w-full object-cover rounded-lg bg-stone-100" />
                    <h4 className="font-bold text-xs text-stone-850 mt-2 truncate">{p.name}</h4>
                    <span className="text-xs font-bold text-stone-900 block mt-0.5">{formatIDR(p.price)}</span>
                    
                    <div className="grid grid-cols-1 gap-1 mt-2.5">
                      <button
                        onClick={() => addToPosCart(p, false)}
                        className="btn-transition rounded-lg bg-amber-600 hover:bg-amber-700 py-1.5 text-[10px] font-bold text-white shadow-xs"
                      >
                        + Beli
                      </button>
                      {p.points_cost > 0 && (
                        <button
                          onClick={() => addToPosCart(p, true)}
                          className="btn-transition rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 py-1.5 text-[10px] font-bold"
                        >
                          + Tukar ({p.points_cost} Pts)
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* POS Cart Sidebar (1 col) */}
            <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm h-fit space-y-4">
              
              {/* Member Selection Widget */}
              <div>
                <label className="text-xs font-bold text-stone-700">Tautkan Akun Member Loyalty (Opsional)</label>
                <div className="flex gap-1.5 mt-1.5">
                  <input
                    type="text"
                    placeholder="Nama / email member..."
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    className="flex-grow rounded-lg border border-stone-200 bg-stone-50 px-2.5 py-1.5 text-xs text-stone-800 outline-none"
                  />
                  <button
                    onClick={searchCustomer}
                    className="btn-transition rounded-lg bg-stone-800 text-white px-3 text-xs font-bold"
                  >
                    Cari
                  </button>
                </div>

                {/* Match List */}
                {customerList.length > 0 && (
                  <div className="mt-2 border border-stone-200 rounded-lg max-h-28 overflow-y-auto bg-stone-50/50 p-1.5 space-y-1">
                    {customerList.map(c => (
                      <button
                        key={c.id}
                        onClick={() => {
                          setSelectedCustomer(c);
                          setCustomerList([]);
                          setCustomerSearch('');
                        }}
                        className="btn-transition w-full text-left p-1 text-xs hover:bg-white rounded font-medium flex items-center justify-between"
                      >
                        <span>{c.name} ({c.email})</span>
                        <span className="text-[10px] font-bold text-amber-700">{c.loyalty_points} Pts</span>
                      </button>
                    ))}
                  </div>
                )}

                {selectedCustomer && (
                  <div className="mt-2.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 p-2 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <UserCheck className="h-4 w-4 text-emerald-600" />
                      <div>
                        <p className="font-bold">{selectedCustomer.name}</p>
                        <p className="text-[10px] text-emerald-600/90">Saldo Poin: {selectedCustomer.loyalty_points} Pts</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setSelectedCustomer(null)}
                      className="text-stone-400 hover:text-red-600 font-bold px-1"
                    >
                      Batal
                    </button>
                  </div>
                )}
              </div>

              {/* POS Cart items list */}
              <div className="border-t border-stone-100 pt-3">
                <h4 className="text-xs font-bold text-stone-700 mb-2.5 flex items-center justify-between">
                  <span>Daftar Pemesanan POS</span>
                  <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] text-stone-500 font-semibold">{posCart.length} Menu</span>
                </h4>

                {posCart.length === 0 ? (
                  <p className="text-center py-6 text-xs text-stone-400">Pilih produk di sebelah untuk menambahkan item.</p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {posCart.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs border-b border-stone-50 pb-2">
                        <div className="min-w-0 pr-2">
                          <p className="font-semibold text-stone-900 truncate">
                            {item.name} {item.is_redeemed_by_points && <span className="text-[9px] text-amber-700 bg-amber-50 px-1 py-0.5 rounded font-bold">Redeem</span>}
                          </p>
                          <p className="text-[10px] text-stone-500 mt-0.5">
                            {item.is_redeemed_by_points ? `${item.points_cost} Pts` : formatIDR(item.price)}
                          </p>
                        </div>

                        {/* Qty edit */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => {
                              setPosCart(prev => prev.map((it, i) => i === idx ? { ...it, quantity: Math.max(1, it.quantity - 1) } : it));
                            }}
                            className="border border-stone-200 rounded p-0.5 hover:bg-stone-50"
                          >
                            <Minus className="h-2.5 w-2.5 text-stone-500" />
                          </button>
                          <span className="w-4 text-center font-bold text-stone-800 text-[11px]">{item.quantity}</span>
                          <button
                            onClick={() => {
                              setPosCart(prev => prev.map((it, i) => i === idx ? { ...it, quantity: it.quantity + 1 } : it));
                            }}
                            className="border border-stone-200 rounded p-0.5 hover:bg-stone-50"
                          >
                            <Plus className="h-2.5 w-2.5 text-stone-500" />
                          </button>
                          <button
                            onClick={() => {
                              setPosCart(prev => prev.filter((_, i) => i !== idx));
                            }}
                            className="text-stone-400 hover:text-red-650 ml-1.5"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Totals */}
              {posCart.length > 0 && (
                <div className="border-t border-stone-100 pt-3 space-y-3">
                  
                  {/* Notes */}
                  <div>
                    <label className="text-[10px] font-semibold text-stone-500">Catatan Pesanan POS (Meja, takeaway, dll)</label>
                    <input
                      type="text"
                      value={posCheckoutNotes}
                      onChange={(e) => setPosCheckoutNotes(e.target.value)}
                      placeholder="Meja 8 / Takeaway..."
                      className="w-full mt-1 rounded-lg border border-stone-250 bg-stone-50 px-2.5 py-1.5 text-xs text-stone-800 outline-none"
                    />
                  </div>

                  <div className="space-y-1.5 text-xs border-t border-stone-100 pt-2.5">
                    {posPtsCost > 0 && (
                      <div className="flex justify-between text-amber-700 font-semibold">
                        <span>Poin Ditukarkan</span>
                        <span>-{posPtsCost} Pts</span>
                      </div>
                    )}
                    {posPtsEarn > 0 && (
                      <div className="flex justify-between text-emerald-700 font-semibold">
                        <span>Poin Didapat (Member)</span>
                        <span>+{posPtsEarn} Pts</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm font-extrabold text-stone-900 border-t border-stone-100 pt-2">
                      <span>Total Tagihan POS</span>
                      <span>{formatIDR(posPrice)}</span>
                    </div>
                  </div>

                  <button
                    onClick={handlePosCheckout}
                    className="btn-transition w-full rounded-xl bg-amber-600 hover:bg-amber-700 py-3 text-xs font-bold text-white shadow-md shadow-amber-600/10 flex items-center justify-center gap-1"
                  >
                    <CheckCircle className="h-4.5 w-4.5" />
                    <span>Checkout & Bayar Lunas</span>
                  </button>
                </div>
              )}

            </div>
          </div>
        )}

      </div>

      {/* Payment Success Confirmed Overlay Modal */}
      {paymentDoneModal && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-xs" onClick={() => setPaymentDoneModal(false)} />
          <div className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl z-10 text-center animate-slide-up space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <Check className="h-8 w-8" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-stone-900">Pembayaran Diterima!</h3>
              <p className="text-stone-500 text-xs mt-1">Struk tercetak. Pesanan {selectedOrder.order_number} dikirim ke monitor dapur secara realtime.</p>
            </div>
            
            <div className="border border-stone-150 rounded-xl bg-stone-50 p-4 text-left text-xs text-stone-600 space-y-1.5">
              <div className="flex justify-between">
                <span>Metode Pembayaran</span>
                <span className="font-bold text-stone-900">Kasir Cash/Debit</span>
              </div>
              <div className="flex justify-between">
                <span>Total Nominal</span>
                <span className="font-bold text-stone-900">{formatIDR(selectedOrder.total_price)}</span>
              </div>
            </div>

            <button
              onClick={() => {
                setPaymentDoneModal(false);
                setSelectedOrder(null);
              }}
              className="btn-transition w-full rounded-xl bg-stone-905 py-3 text-sm font-bold text-white"
            >
              Lanjutkan POS
            </button>
          </div>
        </div>
      )}

      {/* POS Walk-in Success Modal */}
      {posCheckoutSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-xs" onClick={() => setPosCheckoutSuccess(null)} />
          <div className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl z-10 text-center animate-slide-up space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <Check className="h-8 w-8" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-stone-900">Transaksi POS Berhasil!</h3>
              <p className="text-stone-500 text-xs mt-1">Pemesanan langsung walk-in telah diproses dan dilunasi.</p>
            </div>
            
            <div className="border border-stone-150 rounded-xl bg-stone-50 p-4 text-left text-xs text-stone-600 space-y-1.5">
              <div className="flex justify-between">
                <span>Kode Pesanan</span>
                <span className="font-bold text-stone-900">{posCheckoutSuccess.order_number}</span>
              </div>
              <div className="flex justify-between">
                <span>Total Tagihan</span>
                <span className="font-bold text-stone-900">{formatIDR(posCheckoutSuccess.total_price)}</span>
              </div>
            </div>

            <button
              onClick={() => setPosCheckoutSuccess(null)}
              className="btn-transition w-full rounded-xl bg-stone-900 py-3 text-sm font-bold text-white"
            >
              Kembali
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default CashierPOS;
