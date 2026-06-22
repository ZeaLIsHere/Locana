import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Coffee, Key, Mail, ShieldAlert, Sparkles, User, Users } from 'lucide-react';

const Login = () => {
  const { login, error: authError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const demoAccounts = [
    { label: 'Pelanggan', email: 'customer@locana.com', pass: 'customer123', color: 'bg-stone-100 hover:bg-stone-200 text-stone-800' },
    { label: 'Kasir POS', email: 'cashier@locana.com', pass: 'cashier123', color: 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200' },
    { label: 'Dapur/Barista', email: 'kitchen@locana.com', pass: 'kitchen123', color: 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200' },
    { label: 'Manager', email: 'manager@locana.com', pass: 'manager123', color: 'bg-blue-50 hover:bg-blue-100 text-blue-800 border-blue-200' },
    { label: 'Owner', email: 'owner@locana.com', pass: 'owner123', color: 'bg-purple-50 hover:bg-purple-100 text-purple-800 border-purple-200' }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Email dan password harus diisi');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err.message || 'Login gagal');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (demoEmail, demoPass) => {
    setError('');
    setEmail(demoEmail);
    setPassword(demoPass);
    setLoading(true);
    try {
      await login(demoEmail, demoPass);
    } catch (err) {
      setError(err.message || 'Login demo gagal');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-stretch bg-stone-50">
      
      {/* Left Side: Modern Visual Presentation (Desktop only) */}
      <div className="relative hidden w-1/2 overflow-hidden bg-stone-900 lg:block">
        <div className="absolute inset-0 bg-cover bg-center opacity-40" style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&q=80&w=1200")' }}></div>
        <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-900/60 to-transparent"></div>
        
        <div className="absolute bottom-16 left-16 right-16 flex flex-col justify-end text-white">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-600 shadow-lg shadow-amber-600/35">
            <Coffee className="h-7 w-7 text-white" />
          </div>
          <span className="text-xs font-bold uppercase tracking-widest text-amber-500">Premium Coffee Shop</span>
          <h2 className="mt-2 text-4xl font-extrabold tracking-tight leading-tight">
            Selamat Datang di <br />
            Aplikasi Pemesanan Locana
          </h2>
          <p className="mt-4 max-w-md text-stone-300">
            Sistem terintegrasi untuk melayani pemesanan pelanggan secara mandiri, monitor POS kasir, antrean masak dapur, hingga pelaporan penjualan komprehensif.
          </p>
        </div>
      </div>

      {/* Right Side: Login Form */}
      <div className="flex w-full flex-col justify-center px-4 py-8 sm:px-8 lg:w-1/2 lg:px-20 xl:px-24">
        <div className="mx-auto w-full max-w-md">
          
          {/* Header Mobile Logo */}
          <div className="flex items-center gap-2 lg:hidden mb-6">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-600 text-white shadow-md">
              <Coffee className="h-5.5 w-5.5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-stone-900 leading-none">LOCANA</h1>
              <p className="text-[9px] font-semibold text-amber-600 uppercase tracking-widest mt-0.5">Ordering System</p>
            </div>
          </div>

          <div className="mb-6">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight">Masuk Akun</h2>
            <p className="mt-1.5 text-xs text-stone-500">Silakan masuk untuk memesan dan mengumpulkan poin loyalty.</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {(error || authError) && (
              <div className="flex items-start gap-2.5 rounded-xl bg-red-50 p-4 text-sm text-red-700 border border-red-200">
                <ShieldAlert className="h-5 w-5 shrink-0 text-red-600" />
                <span>{error || authError}</span>
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-stone-700">Email Pengguna</label>
              <div className="relative mt-1">
                <Mail className="absolute top-3.5 left-3.5 h-4.5 w-4.5 text-stone-400" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@locana.com"
                  className="block w-full rounded-xl border border-stone-300 bg-white py-3 pr-4 pl-11 text-stone-900 shadow-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none text-sm transition"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="pass" className="block text-sm font-semibold text-stone-700">Kata Sandi</label>
              </div>
              <div className="relative mt-1">
                <Key className="absolute top-3.5 left-3.5 h-4.5 w-4.5 text-stone-400" />
                <input
                  id="pass"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full rounded-xl border border-stone-300 bg-white py-3 pr-4 pl-11 text-stone-900 shadow-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none text-sm transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-transition flex w-full items-center justify-center rounded-xl bg-amber-600 py-3 text-sm font-bold text-white shadow-md shadow-amber-600/20 hover:bg-amber-700 focus:outline-none disabled:bg-amber-500/60"
            >
              {loading ? 'Memproses...' : 'Masuk'}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
              <div className="w-full border-t border-stone-200"></div>
            </div>
            <div className="relative flex justify-center text-xs font-bold uppercase tracking-wider">
              <span className="bg-stone-50 px-3 text-stone-500 flex items-center gap-1">
                <Sparkles className="h-3 w-3 text-amber-500" /> Uji Coba Demo Akun
              </span>
            </div>
          </div>

          {/* Demo Account Buttons Grid */}
          <div className="grid grid-cols-2 gap-2">
            {demoAccounts.map(demo => (
              <button
                key={demo.label}
                type="button"
                onClick={() => handleQuickLogin(demo.email, demo.pass)}
                disabled={loading}
                className={`btn-transition rounded-xl border border-stone-200/80 px-3 py-2.5 text-xs font-semibold text-left transition-all ${demo.color} shadow-sm flex flex-col justify-between`}
              >
                <span>{demo.label}</span>
                <span className="text-[10px] font-normal text-stone-500/80 mt-1 truncate">{demo.email}</span>
              </button>
            ))}
          </div>

        </div>
      </div>

    </div>
  );
};

export default Login;
