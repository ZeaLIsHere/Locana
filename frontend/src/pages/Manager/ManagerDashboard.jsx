import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { apiUrl } from '../../utils/api';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  LineChart, 
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  TrendingUp, 
  Users, 
  ShoppingBag, 
  Star, 
  Award, 
  Clock, 
  Calendar,
  AlertCircle,
  FileSpreadsheet
} from 'lucide-react';

const ManagerDashboard = () => {
  const { token } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Chart period states
  const [salesPeriod, setSalesPeriod] = useState('daily'); // 'daily', 'weekly', 'monthly'

  const fetchReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(apiUrl('/api/reports/dashboard'), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const reportData = await response.json();
        setData(reportData);
      } else {
        const errJson = await response.json();
        throw new Error(errJson.error || 'Gagal memuat data laporan');
      }
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchReport();
    }
  }, [token]);

  const formatIDR = (num) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(num);
  };

  if (loading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <div className="text-center space-y-2">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-amber-600 border-t-transparent mx-auto"></div>
          <p className="text-stone-500 text-sm">Menghitung metrik & memuat grafik...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center max-w-md mx-auto my-12 space-y-4 rounded-2xl bg-red-50 border border-red-200">
        <AlertCircle className="h-10 w-10 text-red-600 mx-auto" />
        <h3 className="text-lg font-bold text-stone-900">Gagal Memuat Laporan</h3>
        <p className="text-stone-600 text-xs">{error}</p>
        <button 
          onClick={fetchReport}
          className="btn-transition rounded-xl bg-amber-600 hover:bg-amber-700 px-4 py-2 text-xs font-bold text-white shadow"
        >
          Coba Lagi
        </button>
      </div>
    );
  }

  if (!data) return null;

  const { summary, charts, loyaltyEfficacy } = data;

  // Pie chart data for loyalty sales contribution
  const pieData = [
    { name: 'Transaksi Member', value: loyaltyEfficacy.loyaltySalesVolume },
    { name: 'Transaksi Tamu (Guest)', value: loyaltyEfficacy.guestSalesVolume }
  ];
  const COLORS = ['#d97706', '#78716c'];

  // Select appropriate sales chart data based on active period
  const getSalesChartData = () => {
    if (salesPeriod === 'monthly') return charts.monthlySales.map(item => ({ label: item.month, sales: item.sales }));
    if (salesPeriod === 'weekly') return charts.weeklySales.map(item => ({ label: item.week, sales: item.sales }));
    return charts.dailySales.map(item => ({ label: item.date.substring(5), sales: item.sales })); // daily
  };

  return (
    <div className="p-4 md:p-6 bg-stone-50 min-h-[calc(100vh-64px)] space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-stone-900 flex items-center gap-2">
            <FileSpreadsheet className="h-6 w-6 text-amber-600" />
            <span>Dashboard Analitik & Penjualan</span>
          </h2>
          <p className="text-xs text-stone-500">Analisis kinerja bisnis, performa member loyalty, dan penjualan harian Locana.</p>
        </div>
        <button 
          onClick={fetchReport}
          className="btn-transition rounded-xl bg-white border border-stone-200 hover:bg-stone-50 px-4 py-2 text-xs font-bold text-stone-700 shadow-sm shrink-0 self-start sm:self-center"
        >
          Refresh Data
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* Total Revenue Widget */}
        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs flex items-center gap-4">
          <div className="rounded-xl bg-amber-50 p-3 text-amber-700">
            <TrendingUp className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs text-stone-500 font-medium">Total Omzet Penjualan</p>
            <h4 className="text-lg font-extrabold text-stone-900 mt-0.5">{formatIDR(summary.totalRevenue)}</h4>
          </div>
        </div>

        {/* Total Transactions Widget */}
        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs flex items-center gap-4">
          <div className="rounded-xl bg-stone-100 p-3 text-stone-600">
            <ShoppingBag className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs text-stone-500 font-medium">Total Pesanan Sukses</p>
            <h4 className="text-lg font-extrabold text-stone-900 mt-0.5">{summary.totalOrders} Transaksi</h4>
          </div>
        </div>

        {/* Active Members Widget */}
        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs flex items-center gap-4">
          <div className="rounded-xl bg-blue-50 p-3 text-blue-600">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs text-stone-500 font-medium">Jumlah Member Aktif</p>
            <h4 className="text-lg font-extrabold text-stone-900 mt-0.5">{summary.activeMembers} Orang</h4>
          </div>
        </div>

        {/* Member Visit Frequency Widget */}
        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs flex items-center gap-4">
          <div className="rounded-xl bg-emerald-50 p-3 text-emerald-600">
            <Award className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs text-stone-500 font-medium">Rata-rata Kunjungan Member</p>
            <h4 className="text-lg font-extrabold text-stone-900 mt-0.5">{summary.averageMemberVisits}x / Member</h4>
          </div>
        </div>

      </div>

      {/* Row 1 Charts: Sales Trends & Loyalty Impact */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Sales Trend Chart (2 Cols) */}
        <div className="lg:col-span-2 rounded-2xl border border-stone-200 bg-white p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-3">
            <div>
              <h3 className="font-bold text-stone-900 text-sm flex items-center gap-1.5">
                <Calendar className="h-4.5 w-4.5 text-amber-600" />
                <span>Tren Omzet Penjualan</span>
              </h3>
              <p className="text-xs text-stone-500">Akumulasi penjualan sukses berdasarkan kurun waktu.</p>
            </div>
            
            {/* Period Selector Tabs */}
            <div className="flex bg-stone-100 rounded-lg p-0.5 shrink-0 self-start sm:self-center">
              {['daily', 'weekly', 'monthly'].map(p => (
                <button
                  key={p}
                  onClick={() => setSalesPeriod(p)}
                  className={`btn-transition rounded-md px-3 py-1.5 text-[11px] font-bold capitalize ${
                    salesPeriod === p ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-500 hover:text-stone-850'
                  }`}
                >
                  {p === 'daily' ? 'Harian' : p === 'weekly' ? 'Mingguan' : 'Bulanan'}
                </button>
              ))}
            </div>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={getSalesChartData()} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#d97706" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#d97706" stopOpacity={0.01}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f4" />
                <XAxis dataKey="label" stroke="#a8a29e" fontSize={10} tickLine={false} />
                <YAxis stroke="#a8a29e" fontSize={10} tickLine={false} />
                <Tooltip formatter={(value) => [formatIDR(value), 'Penjualan']} />
                <Area type="monotone" dataKey="sales" stroke="#d97706" strokeWidth={2} fillOpacity={1} fill="url(#colorSales)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Loyalty Program Sales Ratio Pie (1 Col) */}
        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs space-y-4">
          <div className="border-b border-stone-100 pb-3">
            <h3 className="font-bold text-stone-900 text-sm flex items-center gap-1.5">
              <Award className="h-4.5 w-4.5 text-amber-600" />
              <span>Kontribusi Transaksi Member</span>
            </h3>
            <p className="text-xs text-stone-500">Rasio penjualan yang dibeli oleh member vs umum.</p>
          </div>

          <div className="h-48 flex justify-center items-center relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [formatIDR(value), 'Volume']} />
              </PieChart>
            </ResponsiveContainer>
            
            {/* Center label */}
            <div className="absolute flex flex-col items-center">
              <span className="text-[10px] uppercase font-bold text-stone-500 tracking-wider">MEMBER RATIO</span>
              <span className="text-xl font-black text-amber-700">{loyaltyEfficacy.memberSalesRatio}%</span>
            </div>
          </div>

          {/* Legends */}
          <div className="flex justify-around text-xs pt-2">
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-3 rounded-full bg-amber-600"></div>
              <span className="text-stone-600 font-medium">Member: {loyaltyEfficacy.memberSalesRatio}%</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-3 rounded-full bg-stone-500"></div>
              <span className="text-stone-600 font-medium">Guest/Umum: {(100 - loyaltyEfficacy.memberSalesRatio).toFixed(1)}%</span>
            </div>
          </div>
        </div>

      </div>

      {/* Row 2 Charts: Best Sellers & Peak Hours */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Best Selling Products */}
        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs space-y-4">
          <div className="border-b border-stone-100 pb-3">
            <h3 className="font-bold text-stone-900 text-sm flex items-center gap-1.5">
              <ShoppingBag className="h-4.5 w-4.5 text-amber-600" />
              <span>Daftar Produk Terlaris</span>
            </h3>
            <p className="text-xs text-stone-500">5 menu teratas yang paling banyak dibeli pelanggan.</p>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.bestSellers} layout="vertical" margin={{ top: 10, right: 10, left: 15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f5f5f4" />
                <XAxis type="number" stroke="#a8a29e" fontSize={10} tickLine={false} />
                <YAxis dataKey="name" type="category" stroke="#a8a29e" fontSize={9} tickLine={false} width={100} />
                <Tooltip formatter={(value) => [value, 'Terjual']} />
                <Bar dataKey="quantity" fill="#d97706" radius={[0, 6, 6, 0]}>
                  {charts.bestSellers.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === 0 ? '#b45309' : '#d97706'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Peak Hours line chart */}
        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs space-y-4">
          <div className="border-b border-stone-100 pb-3">
            <h3 className="font-bold text-stone-900 text-sm flex items-center gap-1.5">
              <Clock className="h-4.5 w-4.5 text-amber-600" />
              <span>Analisis Jam Ramai Pengunjung</span>
            </h3>
            <p className="text-xs text-stone-500">Distribusi jumlah pesanan berdasarkan jam operasional.</p>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={charts.hourlyPeak} margin={{ top: 10, right: 15, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f4" />
                <XAxis dataKey="hour" stroke="#a8a29e" fontSize={10} tickLine={false} />
                <YAxis stroke="#a8a29e" fontSize={10} tickLine={false} />
                <Tooltip formatter={(value) => [value, 'Jumlah Kunjungan/Pesanan']} />
                <Line type="monotone" dataKey="visits" stroke="#d97706" strokeWidth={2.5} activeDot={{ r: 6 }} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Row 3: Members Leaderboard & Loyalty Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Top Spending Members Table (2 Cols) */}
        <div className="lg:col-span-2 rounded-2xl border border-stone-200 bg-white p-5 shadow-xs space-y-4">
          <div className="border-b border-stone-100 pb-3">
            <h3 className="font-bold text-stone-900 text-sm flex items-center gap-1.5">
              <Users className="h-4.5 w-4.5 text-amber-600" />
              <span>Pelanggan Member Teraktif (Top Spenders)</span>
            </h3>
            <p className="text-xs text-stone-500">Member dengan total nominal belanja terbesar di Locana.</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-stone-200 text-stone-500 font-bold">
                  <th className="py-2">Nama Member</th>
                  <th className="py-2">Frekuensi Order</th>
                  <th className="py-2 text-right">Total Transaksi</th>
                </tr>
              </thead>
              <tbody>
                {charts.topSpendingMembers.map((member, i) => (
                  <tr key={member.id} className="border-b border-stone-100 font-medium text-stone-750">
                    <td className="py-3 flex items-center gap-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-50 text-[10px] font-bold text-amber-700">
                        {i + 1}
                      </span>
                      <span>{member.name}</span>
                    </td>
                    <td className="py-3">{member.visits} Kunjungan</td>
                    <td className="py-3 text-right font-bold text-stone-900">{formatIDR(member.totalSpend)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Loyalty Program effectiveness metrics (1 Col) */}
        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs space-y-4">
          <div className="border-b border-stone-100 pb-3">
            <h3 className="font-bold text-stone-900 text-sm flex items-center gap-1.5">
              <Star className="h-4.5 w-4.5 text-amber-600" />
              <span>Efektivitas Loyalty Program</span>
            </h3>
            <p className="text-xs text-stone-500">Metrik penggunaan loyalty points oleh pelanggan.</p>
          </div>

          <div className="space-y-4 text-xs">
            
            <div className="rounded-xl border border-stone-150 p-4 space-y-3 bg-stone-50/50">
              <div className="flex justify-between">
                <span className="text-stone-500">Total Poin yang Didistribusikan</span>
                <span className="font-bold text-stone-900 flex items-center gap-0.5">
                  <Star className="h-3.5 w-3.5 fill-amber-500 stroke-none" /> {loyaltyEfficacy.totalPointsEarned} Pts
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Total Poin yang Ditukarkan</span>
                <span className="font-bold text-stone-900 flex items-center gap-0.5">
                  <Star className="h-3.5 w-3.5 fill-amber-500 stroke-none text-amber-750" /> {loyaltyEfficacy.totalPointsRedeemed} Pts
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between font-bold text-stone-800">
                <span>Rasio Penukaran Poin (Redemption Rate)</span>
                <span>{loyaltyEfficacy.pointsRedeemedRatio}%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-stone-200 overflow-hidden">
                <div 
                  className="h-full bg-amber-600 rounded-full" 
                  style={{ width: `${Math.min(100, loyaltyEfficacy.pointsRedeemedRatio)}%` }}
                />
              </div>
              <p className="text-[10px] text-stone-500 mt-1 leading-normal">
                Persentase dari poin yang dibagikan yang berhasil ditukarkan kembali menjadi makanan/minuman oleh pelanggan. Rasio yang sehat berkisar antara 15% - 40%.
              </p>
            </div>

            <div className="rounded-xl border border-stone-150 p-4 bg-stone-50/50">
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="font-bold text-stone-850">Rasio Order Member</h4>
                  <p className="text-[10px] text-stone-500 mt-0.5">Persentase total invoice dari loyalty member.</p>
                </div>
                <span className="text-base font-black text-amber-600 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200/50">
                  {loyaltyEfficacy.loyaltyOrdersPercent}%
                </span>
              </div>
            </div>

          </div>
        </div>

      </div>

    </div>
  );
};

export default ManagerDashboard;
