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
import SalesReports from './pages/Manager/SalesReports';
import MenuManagement from './pages/Manager/MenuManagement';
import TableManagement from './pages/Manager/TableManagement';

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

  // Detect /table/:n URL — render table ordering page bypassing login gate
  const tablePathMatch = window.location.pathname.match(/^\/table\/(\d+)$/);
  const tableRouteNumber = tablePathMatch ? parseInt(tablePathMatch[1]) : null;

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

  // Table route: accessible without login
  if (tableRouteNumber) {
    return (
      <div className="min-h-screen bg-stone-50">
        <CustomerMenu tableNumber={tableRouteNumber} />
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
      case 'reports':
        return <SalesReports />;
      case 'menu-management':
        return <MenuManagement />;
      case 'table-management':
        return <TableManagement />;
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
