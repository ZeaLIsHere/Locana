import React from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  BarChart3, 
  ChefHat, 
  CreditCard, 
  Layers, 
  ShoppingBag, 
  Users,
  Settings
} from 'lucide-react';

const Sidebar = ({ currentPage, onPageChange }) => {
  const { user } = useAuth();
  
  if (!user || user.role === 'customer') return null;

  const menuItems = [
    {
      id: 'manager',
      label: 'Laporan Analitik',
      icon: BarChart3,
      roles: ['owner', 'manager']
    },
    {
      id: 'cashier',
      label: 'POS Kasir',
      icon: CreditCard,
      roles: ['owner', 'cashier']
    },
    {
      id: 'kitchen',
      label: 'Monitor Dapur',
      icon: ChefHat,
      roles: ['owner', 'kitchen']
    },
    {
      id: 'customer',
      label: 'Menu Pelanggan (Test)',
      icon: ShoppingBag,
      roles: ['owner'] // Owner can test customer ordering
    }
  ];

  return (
    <aside className="w-full shrink-0 border-b border-stone-200 bg-stone-900 text-stone-300 md:h-[calc(100vh-64px)] md:w-64 md:border-r md:border-b-0">
      <div className="flex flex-row overflow-x-auto p-2 md:flex-col md:overflow-x-visible md:p-4 md:space-y-1.5">
        <div className="hidden px-3 py-2 text-xs font-bold uppercase tracking-widest text-stone-500 md:block">
          Modul Operasional
        </div>
        
        {menuItems
          .filter(item => item.roles.includes(user.role))
          .map(item => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => onPageChange(item.id)}
                className={`btn-transition flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium whitespace-nowrap md:whitespace-normal md:w-full ${
                  isActive
                    ? 'bg-amber-600 text-white shadow-md shadow-amber-600/15'
                    : 'hover:bg-stone-800 hover:text-white text-stone-400'
                }`}
              >
                <Icon className={`h-4.5 w-4.5 ${isActive ? 'text-white' : 'text-stone-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
      </div>
    </aside>
  );
};

export default Sidebar;
