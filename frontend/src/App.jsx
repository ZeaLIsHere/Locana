import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { OrderProvider, useOrder } from './context/OrderContext';
import Login from './pages/Login';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import CustomerMenu from './pages/Customer/CustomerMenu';
import CashierPOS from './pages/Cashier/CashierPOS';
import KitchenMonitor from './pages/Kitchen/KitchenMonitor';
import ManagerDashboard from './pages/Manager/ManagerDashboard';

const MainApp = () => {
  const { user, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState('customer');
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Set default page based on user role upon login
  useEffect(() => {
    if (user) {
      if (user.role === 'customer') {
        setCurrentPage('customer');
      } else if (user.role === 'kitchen') {
        setCurrentPage('kitchen');
      } else if (user.role === 'cashier') {
        setCurrentPage('cashier');
      } else {
        // Owner or Manager defaults to analytical reports dashboard
        setCurrentPage('manager');
      }
    }
  }, [user]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-50">
        <div className="text-center space-y-2">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-amber-600 border-t-transparent mx-auto"></div>
          <p className="text-stone-600 text-sm font-semibold">Menginisialisasi Sistem Pemesanan...</p>
        </div>
      </div>
    );
  }

  // Not logged in: Show login page
  if (!user) {
    return <Login />;
  }

  // Render correct page component based on currentPage state
  const renderPage = () => {
    switch (currentPage) {
      case 'customer':
        return <CustomerMenu isCartOpen={isCartOpen} setIsCartOpen={setIsCartOpen} />;
      case 'cashier':
        return <CashierPOS />;
      case 'kitchen':
        return <KitchenMonitor />;
      case 'manager':
        return <ManagerDashboard />;
      default:
        return <CustomerMenu isCartOpen={isCartOpen} setIsCartOpen={setIsCartOpen} />;
    }
  };

  const isStaff = user.role !== 'customer';

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col">
      {/* Top Navigation */}
      <Navbar onCartClick={() => setIsCartOpen(!isCartOpen)} />

      {/* Main Body */}
      <div className="flex flex-col md:flex-row flex-grow">
        {/* Left Sidebar navigation for staff members */}
        {isStaff && (
          <Sidebar currentPage={currentPage} onPageChange={setCurrentPage} />
        )}

        {/* Dynamic Center Work Area */}
        <main className="flex-grow">
          {renderPage()}
        </main>
      </div>
    </div>
  );
};

// Top-level App wrapper that injects providers
const App = () => {
  return (
    <AuthProvider>
      <OrderProvider>
        <MainApp />
      </OrderProvider>
    </AuthProvider>
  );
};

export default App;
