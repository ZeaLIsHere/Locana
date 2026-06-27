import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  FileText,
  Calendar,
  Filter,
  RefreshCw,
  ChevronRight,
  ReceiptText,
  CreditCard,
  BarChart3,
  Clock,
  TrendingUp,
  Users,
  MessageSquareText,
  Store,
  Layers
} from 'lucide-react';

// ===== Report Tab Definitions =====
const REPORT_TABS = [
  { group: 'Penjualan', items: [
    { id: 'recapitulation_detail', label: 'Rekap Transaksi Detail', icon: ReceiptText, endpoint: 'sales' },
    { id: 'daily_summary', label: 'Ringkasan Harian', icon: Calendar, endpoint: 'sales' },
    { id: 'daily_menu', label: 'Penjualan Menu Harian', icon: Layers, endpoint: 'sales' },
    { id: 'daily_menu_category', label: 'Penjualan Kategori Harian', icon: BarChart3, endpoint: 'sales' },
    { id: 'menu_by_time', label: 'Menu Terlaris per Jam', icon: Clock, endpoint: 'sales' },
    { id: 'avg_menu_by_time', label: 'Rata-rata Menu per Jam', icon: TrendingUp, endpoint: 'sales' },
    { id: 'average_spending', label: 'Rata-rata Belanja (AOV)', icon: TrendingUp, endpoint: 'sales' },
  ]},
  { group: 'Pembayaran', items: [
    { id: 'payment_summary', label: 'Rekap Metode Pembayaran', icon: CreditCard, endpoint: 'sales' },
    { id: 'daily_payment', label: 'Pembayaran Harian', icon: CreditCard, endpoint: 'sales' },
  ]},
  { group: 'POS & Operasional', items: [
    { id: 'staff_daily', label: 'Performa Kasir Harian', icon: Users, endpoint: 'pos' },
    { id: 'guest_comment', label: 'Komentar Pelanggan', icon: MessageSquareText, endpoint: 'pos' },
    { id: 'monthly_pos', label: 'Rekap POS Bulanan', icon: Store, endpoint: 'pos' },
    { id: 'daily_pos', label: 'Rekap POS Harian', icon: Store, endpoint: 'pos' },
  ]},
];

const ALL_TABS = REPORT_TABS.flatMap(g => g.items);

// ===== Column Definitions per Report Type =====
const COLUMN_DEFS = {
  recapitulation_detail: [
    { key: 'order_number', label: 'No. Pesanan' },
    { key: 'date', label: 'Tanggal', format: 'datetime' },
    { key: 'customer_name', label: 'Pelanggan' },
    { key: 'items_summary', label: 'Item', className: 'max-w-[220px] truncate' },
    { key: 'item_count', label: 'Qty' },
    { key: 'payment_method', label: 'Bayar' },
    { key: 'total_price', label: 'Total', format: 'idr' },
    { key: 'notes', label: 'Catatan' },
  ],
  daily_summary: [
    { key: 'date', label: 'Tanggal' },
    { key: 'total_transactions', label: 'Jumlah Transaksi' },
    { key: 'total_items', label: 'Item Terjual' },
    { key: 'total_revenue', label: 'Total Omzet', format: 'idr' },
    { key: 'average_order_value', label: 'AOV', format: 'idr' },
  ],
  payment_summary: [
    { key: 'payment_method', label: 'Metode Pembayaran' },
    { key: 'total_transactions', label: 'Jumlah Transaksi' },
    { key: 'transaction_percentage', label: '% Transaksi', format: 'percent' },
    { key: 'total_revenue', label: 'Total Omzet', format: 'idr' },
    { key: 'revenue_percentage', label: '% Omzet', format: 'percent' },
  ],
  daily_payment: [
    { key: 'date', label: 'Tanggal' },
    { key: 'qris_count', label: 'QRIS (Trx)' },
    { key: 'qris_revenue', label: 'QRIS (Omzet)', format: 'idr' },
    { key: 'cashier_count', label: 'Kasir (Trx)' },
    { key: 'cashier_revenue', label: 'Kasir (Omzet)', format: 'idr' },
    { key: 'total_revenue', label: 'Total', format: 'idr' },
  ],
  daily_menu_category: [
    { key: 'date', label: 'Tanggal' },
    { key: 'category', label: 'Kategori' },
    { key: 'total_qty', label: 'Qty Terjual' },
    { key: 'total_revenue', label: 'Revenue', format: 'idr' },
  ],
  daily_menu: [
    { key: 'date', label: 'Tanggal' },
    { key: 'product_name', label: 'Nama Menu' },
    { key: 'total_qty', label: 'Qty Terjual' },
    { key: 'total_revenue', label: 'Revenue', format: 'idr' },
  ],
  menu_by_time: [
    { key: 'hour', label: 'Jam' },
    { key: 'product_name', label: 'Nama Menu' },
    { key: 'total_qty', label: 'Total Qty' },
    { key: 'total_revenue', label: 'Total Revenue', format: 'idr' },
  ],
  avg_menu_by_time: [
    { key: 'hour', label: 'Jam' },
    { key: 'product_name', label: 'Nama Menu' },
    { key: 'avg_qty_per_day', label: 'Rata-rata Qty/Hari' },
    { key: 'avg_revenue_per_day', label: 'Rata-rata Revenue/Hari', format: 'idr' },
    { key: 'total_qty', label: 'Total Qty' },
    { key: 'total_revenue', label: 'Total Revenue', format: 'idr' },
  ],
  average_spending: [
    { key: 'period', label: 'Periode' },
    { key: 'period_type', label: 'Tipe' },
    { key: 'total_transactions', label: 'Jumlah Transaksi' },
    { key: 'total_revenue', label: 'Total Omzet', format: 'idr' },
    { key: 'average_order_value', label: 'AOV', format: 'idr' },
  ],
  staff_daily: [
    { key: 'date', label: 'Tanggal' },
    { key: 'cashier_name', label: 'Nama Kasir' },
    { key: 'total_transactions', label: 'Transaksi' },
    { key: 'total_items', label: 'Item' },
    { key: 'total_revenue', label: 'Omzet', format: 'idr' },
  ],
  guest_comment: [
    { key: 'date', label: 'Tanggal', format: 'datetime' },
    { key: 'order_number', label: 'No. Pesanan' },
    { key: 'customer_name', label: 'Pelanggan' },
    { key: 'source', label: 'Sumber' },
    { key: 'comment', label: 'Komentar' },
  ],
  monthly_pos: [
    { key: 'period', label: 'Bulan' },
    { key: 'total_transactions', label: 'Transaksi' },
    { key: 'total_items', label: 'Item' },
    { key: 'total_revenue', label: 'Omzet', format: 'idr' },
    { key: 'active_days', label: 'Hari Aktif' },
    { key: 'avg_daily_revenue', label: 'Omzet/Hari', format: 'idr' },
    { key: 'avg_order_value', label: 'AOV', format: 'idr' },
    { key: 'qris_count', label: 'QRIS' },
    { key: 'cashier_count', label: 'Kasir' },
    { key: 'member_orders', label: 'Member' },
    { key: 'guest_orders', label: 'Guest' },
  ],
  daily_pos: [
    { key: 'date', label: 'Tanggal' },
    { key: 'total_transactions', label: 'Trx' },
    { key: 'total_items', label: 'Item' },
    { key: 'total_revenue', label: 'Omzet', format: 'idr' },
    { key: 'avg_order_value', label: 'AOV', format: 'idr' },
    { key: 'qris_count', label: 'QRIS' },
    { key: 'cashier_count', label: 'Kasir' },
    { key: 'member_orders', label: 'Member' },
    { key: 'guest_orders', label: 'Guest' },
    { key: 'peak_hour', label: 'Jam Ramai' },
  ],
};

// ===== Formatters =====
const formatIDR = (num) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num || 0);

const formatDatetime = (str) => {
  if (!str) return '-';
  const d = new Date(str);
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const formatCell = (value, format) => {
  if (value === undefined || value === null) return '-';
  if (format === 'idr') return formatIDR(value);
  if (format === 'percent') return `${value}%`;
  if (format === 'datetime') return formatDatetime(value);
  return String(value);
};

// ===== Component =====
const SalesReports = () => {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState('recapitulation_detail');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [totalCount, setTotalCount] = useState(0);

  // Date filter state — default last 90 days
  const today = new Date();
  const ninetyDaysAgo = new Date(today);
  ninetyDaysAgo.setDate(today.getDate() - 90);
  const [startDate, setStartDate] = useState(ninetyDaysAgo.toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(today.toISOString().split('T')[0]);

  // Sidebar collapse on mobile
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const fetchReport = async (tabId, sd, ed) => {
    const tab = ALL_TABS.find(t => t.id === tabId);
    if (!tab) return;

    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ type: tabId });
      if (sd) params.set('startDate', sd);
      if (ed) params.set('endDate', ed);

      const response = await fetch(`/api/reports/${tab.endpoint}?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        const errJson = await response.json();
        throw new Error(errJson.error || 'Gagal memuat laporan');
      }

      const result = await response.json();
      setData(result.data || []);
      setTotalCount(result.count || 0);
    } catch (err) {
      console.error(err);
      setError(err.message);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchReport(activeTab, startDate, endDate);
    }
  }, [token, activeTab]);

  const handleFilter = () => {
    fetchReport(activeTab, startDate, endDate);
  };

  const activeTabDef = ALL_TABS.find(t => t.id === activeTab);
  const columns = COLUMN_DEFS[activeTab] || [];

  return (
    <div className="flex flex-col lg:flex-row min-h-[calc(100vh-64px)]">

      {/* ===== Left Sidebar — Report Tabs ===== */}
      <div className={`${sidebarOpen ? 'block' : 'hidden'} lg:block w-full lg:w-72 shrink-0 border-b lg:border-b-0 lg:border-r border-stone-200 bg-white lg:bg-stone-50/50 overflow-y-auto lg:max-h-[calc(100vh-64px)]`}>
        <div className="p-4 space-y-5">
          {REPORT_TABS.map(group => (
            <div key={group.group}>
              <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-2 px-2">{group.group}</p>
              <div className="space-y-0.5">
                {group.items.map(tab => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => { setActiveTab(tab.id); setSidebarOpen(false); }}
                      className={`btn-transition w-full flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-xs font-medium text-left ${
                        isActive
                          ? 'bg-amber-600 text-white shadow-md shadow-amber-600/15'
                          : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'
                      }`}
                    >
                      <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-white' : 'text-stone-400'}`} />
                      <span className="truncate">{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ===== Main Content ===== */}
      <div className="flex-grow p-4 md:p-6 bg-stone-50 overflow-hidden flex flex-col">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-3">
            {/* Mobile sidebar toggle */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden btn-transition rounded-xl border border-stone-200 bg-white p-2.5 text-stone-600 hover:bg-stone-50 shadow-sm"
            >
              <FileText className="h-4.5 w-4.5" />
            </button>
            <div>
              <h2 className="text-lg font-bold text-stone-900 flex items-center gap-2">
                {activeTabDef && <activeTabDef.icon className="h-5 w-5 text-amber-600" />}
                <span>{activeTabDef?.label || 'Laporan'}</span>
              </h2>
              <p className="text-[11px] text-stone-500 flex items-center gap-1">
                <ChevronRight className="h-3 w-3" />
                <span>{totalCount} data ditemukan</span>
              </p>
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-5 rounded-xl border border-stone-200 bg-white p-3 shadow-xs">
          <div className="flex items-center gap-2 text-xs text-stone-500 font-semibold shrink-0">
            <Filter className="h-4 w-4 text-amber-600" />
            <span>Filter Tanggal:</span>
          </div>
          <div className="flex items-center gap-2 flex-grow flex-wrap">
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="rounded-lg border border-stone-200 px-3 py-2 text-xs text-stone-700 outline-none focus:border-amber-500 bg-stone-50 flex-grow min-w-[130px]"
            />
            <span className="text-xs text-stone-400 font-medium">s/d</span>
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="rounded-lg border border-stone-200 px-3 py-2 text-xs text-stone-700 outline-none focus:border-amber-500 bg-stone-50 flex-grow min-w-[130px]"
            />
            <button
              onClick={handleFilter}
              className="btn-transition rounded-xl bg-amber-600 hover:bg-amber-700 px-4 py-2 text-xs font-bold text-white shadow-sm flex items-center gap-1.5 shrink-0"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Terapkan</span>
            </button>
          </div>
        </div>

        {/* Table Container */}
        <div className="flex-grow rounded-2xl border border-stone-200 bg-white shadow-xs overflow-hidden flex flex-col">
          {loading ? (
            <div className="flex-grow flex items-center justify-center py-16">
              <div className="text-center space-y-2">
                <div className="h-8 w-8 animate-spin rounded-full border-3 border-amber-600 border-t-transparent mx-auto"></div>
                <p className="text-stone-500 text-xs">Menghitung data laporan...</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex-grow flex items-center justify-center py-16">
              <div className="text-center space-y-3 max-w-xs">
                <p className="text-red-600 text-sm font-semibold">Gagal Memuat Laporan</p>
                <p className="text-stone-500 text-xs">{error}</p>
                <button onClick={handleFilter} className="btn-transition rounded-xl bg-amber-600 hover:bg-amber-700 px-4 py-2 text-xs font-bold text-white">Coba Lagi</button>
              </div>
            </div>
          ) : data.length === 0 ? (
            <div className="flex-grow flex items-center justify-center py-16">
              <div className="text-center space-y-2">
                <FileText className="h-10 w-10 text-stone-300 mx-auto" />
                <p className="text-stone-500 text-sm">Tidak ada data untuk rentang tanggal ini.</p>
                <p className="text-stone-400 text-xs">Coba ubah filter tanggal atau pilih laporan lain.</p>
              </div>
            </div>
          ) : (
            <div className="overflow-auto flex-grow">
              <table className="w-full text-left text-xs border-collapse min-w-[640px]">
                <thead>
                  <tr className="bg-stone-50 border-b border-stone-200">
                    <th className="py-3 px-4 font-bold text-stone-500 text-[10px] uppercase tracking-wider whitespace-nowrap">#</th>
                    {columns.map(col => (
                      <th
                        key={col.key}
                        className={`py-3 px-4 font-bold text-stone-500 text-[10px] uppercase tracking-wider whitespace-nowrap ${
                          col.format === 'idr' || col.format === 'percent' ? 'text-right' : ''
                        }`}
                      >
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.map((row, idx) => (
                    <tr
                      key={idx}
                      className={`border-b border-stone-100 hover:bg-amber-50/30 transition ${
                        idx % 2 === 0 ? 'bg-white' : 'bg-stone-50/30'
                      }`}
                    >
                      <td className="py-2.5 px-4 text-stone-400 font-medium">{idx + 1}</td>
                      {columns.map(col => (
                        <td
                          key={col.key}
                          className={`py-2.5 px-4 text-stone-700 font-medium whitespace-nowrap ${
                            col.format === 'idr' || col.format === 'percent' ? 'text-right' : ''
                          } ${col.className || ''}`}
                          title={col.className?.includes('truncate') ? String(row[col.key] || '') : undefined}
                        >
                          {formatCell(row[col.key], col.format)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Footer */}
          {!loading && data.length > 0 && (
            <div className="border-t border-stone-100 px-4 py-3 flex items-center justify-between bg-stone-50/50">
              <p className="text-[11px] text-stone-500 font-medium">
                Menampilkan <span className="font-bold text-stone-700">{data.length}</span> data
              </p>
              <p className="text-[11px] text-stone-400">
                {startDate} — {endDate}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SalesReports;
