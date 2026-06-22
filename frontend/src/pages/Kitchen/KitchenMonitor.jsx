import React, { useEffect, useState } from 'react';
import { useOrder } from '../../context/OrderContext';
import { 
  ChefHat, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Sparkles,
  ArrowRight
} from 'lucide-react';

const KitchenMonitor = () => {
  const { orders, updateStatus, fetchOrders } = useOrder();
  const [currentTimes, setCurrentTimes] = useState({});

  // Fetch orders on mount to ensure freshness
  useEffect(() => {
    fetchOrders();
  }, []);

  // Update timer every minute
  useEffect(() => {
    const timer = setInterval(() => {
      const times = {};
      orders.forEach(o => {
        const diffMs = new Date() - new Date(o.created_at);
        const diffMins = Math.floor(diffMs / 60000);
        times[o.id] = diffMins;
      });
      setCurrentTimes(times);
    }, 30000); // update every 30 seconds

    // Initial calculation
    const initialTimes = {};
    orders.forEach(o => {
      const diffMs = new Date() - new Date(o.created_at);
      const diffMins = Math.floor(diffMs / 60000);
      initialTimes[o.id] = diffMins;
    });
    setCurrentTimes(initialTimes);

    return () => clearInterval(timer);
  }, [orders]);

  // Filter orders
  // Kitchen processes orders that are 'paid' and currently preparing
  const activeOrders = orders.filter(o => 
    o.status === 'preparing' && o.payment_status === 'paid'
  );

  const completedToday = orders.filter(o => 
    o.status === 'completed' && 
    new Date(o.created_at).toDateString() === new Date().toDateString()
  ).slice(0, 10); // Show last 10 completed orders

  const handleCompleteOrder = async (orderId) => {
    try {
      await updateStatus(orderId, 'completed');
    } catch (err) {
      alert(err.message || 'Gagal mengubah status pesanan');
    }
  };

  const getWaitTimeColor = (mins) => {
    if (mins >= 15) return 'bg-red-50 text-red-700 border-red-200 animate-pulse';
    if (mins >= 8) return 'bg-amber-50 text-amber-700 border-amber-200';
    return 'bg-stone-50 text-stone-700 border-stone-200';
  };

  return (
    <div className="p-4 md:p-6 bg-stone-50 min-h-[calc(100vh-64px)] space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-stone-900 flex items-center gap-2">
            <ChefHat className="h-6 w-6 text-amber-600" />
            <span>Monitor Antrean Dapur & Barista</span>
          </h2>
          <p className="text-xs text-stone-500">Pantau dan kelola pesanan masuk untuk disajikan.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-white border border-stone-200 px-4 py-2 shadow-xs flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-xs font-semibold text-stone-600">Terhubung Realtime SSE</span>
          </div>
        </div>
      </div>

      {/* Grid split: Active preparing vs History */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        
        {/* Active Preparing Orders (3 Cols) */}
        <div className="xl:col-span-3 space-y-4">
          <h3 className="text-sm font-bold text-stone-700 flex items-center gap-1.5">
            <span>Antrean Pengerjaan</span>
            <span className="rounded-full bg-amber-600 px-2 py-0.5 text-xs text-white">
              {activeOrders.length} Pesanan
            </span>
          </h3>

          {activeOrders.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-stone-300 p-16 text-center bg-white/50">
              <ChefHat className="h-12 w-12 text-stone-350 mx-auto mb-2 animate-bounce" />
              <p className="text-stone-500 text-sm font-semibold">Semua antrean kosong!</p>
              <p className="text-stone-400 text-xs mt-1">Dapur sedang santai. Pesanan baru akan muncul di sini secara otomatis.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {activeOrders.map(order => {
                const waitMins = currentTimes[order.id] || 0;
                
                return (
                  <div 
                    key={order.id} 
                    className="rounded-2xl border border-stone-200 bg-white shadow-sm flex flex-col justify-between overflow-hidden animate-slide-up"
                  >
                    {/* Card Header */}
                    <div className="border-b border-stone-100 p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="text-lg font-black tracking-wider text-stone-900 leading-none">{order.order_number}</h4>
                          <span className="text-[10px] font-semibold text-stone-500 uppercase mt-1 block">Pelanggan: {order.customer_name}</span>
                        </div>
                        {/* Wait Timer Pill */}
                        <div className={`rounded-lg px-2.5 py-1 text-xs font-bold border flex items-center gap-1 shrink-0 ${getWaitTimeColor(waitMins)}`}>
                          <Clock className="h-3.5 w-3.5" />
                          <span>{waitMins}m</span>
                        </div>
                      </div>
                      
                      {order.notes && (
                        <div className="mt-2 rounded-lg bg-stone-50 p-2 border border-stone-150">
                          <p className="text-[10px] font-medium text-stone-600 leading-normal">
                            <strong>Note Pesanan:</strong> "{order.notes}"
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Card Body: Items List */}
                    <div className="flex-grow p-4 space-y-3">
                      {order.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-start text-xs border-b border-stone-50 pb-2">
                          <div className="min-w-0 pr-3">
                            <p className="font-bold text-stone-850">
                              {item.name}
                              {item.is_redeemed_by_points && (
                                <span className="ml-1 text-[9px] font-bold text-amber-700 bg-amber-50 px-1 py-0.5 rounded">Point Redeem</span>
                              )}
                            </p>
                            
                            {/* Product-specific customizations/notes (critical) */}
                            {item.notes && (
                              <p className="text-[10px] text-amber-700 font-extrabold mt-0.5 flex items-center gap-0.5 animate-soft-pulse">
                                <Sparkles className="h-3 w-3 fill-amber-500 stroke-none" />
                                <span>Note: "{item.notes}"</span>
                              </p>
                            )}
                          </div>
                          <span className="font-black text-stone-900 bg-stone-100 px-2 py-0.5 rounded-md shrink-0">
                            x{item.quantity}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Card Actions */}
                    <div className="bg-stone-50 p-4 border-t border-stone-100">
                      <button
                        onClick={() => handleCompleteOrder(order.id)}
                        className="btn-transition w-full rounded-xl bg-amber-600 hover:bg-amber-700 py-3 text-xs font-bold text-white shadow-md shadow-amber-600/10 flex items-center justify-center gap-1.5"
                      >
                        <CheckCircle className="h-4 w-4" />
                        <span>Selesai & Sajikan</span>
                      </button>
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Completed Today Sidebar History (1 Col) */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-stone-700">Selesai Hari Ini</h3>
          
          <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm space-y-3">
            {completedToday.length === 0 ? (
              <p className="text-center py-8 text-xs text-stone-400">Belum ada pesanan disajikan hari ini.</p>
            ) : (
              completedToday.map(o => (
                <div key={o.id} className="flex justify-between items-center text-xs border-b border-stone-50 pb-2.5">
                  <div>
                    <h5 className="font-bold text-stone-900 flex items-center gap-1">
                      <span>{o.order_number}</span>
                      <span className="text-[9px] text-emerald-700 bg-emerald-50 px-1 py-0.2 rounded font-semibold border border-emerald-100">Selesai</span>
                    </h5>
                    <p className="text-[10px] text-stone-500 mt-0.5">{o.customer_name}</p>
                  </div>
                  <span className="text-[10px] text-stone-400">{new Date(o.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

    </div>
  );
};

export default KitchenMonitor;
