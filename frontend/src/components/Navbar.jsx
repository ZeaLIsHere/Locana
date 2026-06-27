import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useOrder } from '../context/OrderContext';
import { LogOut, Star, ShoppingBag } from 'lucide-react';
import logoLocana from '../assets/logo-locana.png';

const Navbar = ({ onCartClick, showCartBadge = false }) => {
  const { user, logout } = useAuth();
  const { cart } = useOrder();

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'owner': return 'bg-purple-900/30 text-purple-400 border border-purple-800/50';
      case 'manager': return 'bg-blue-900/30 text-blue-400 border border-blue-800/50';
      case 'cashier': return 'bg-emerald-900/30 text-emerald-400 border border-emerald-800/50';
      case 'kitchen': return 'bg-amber-900/30 text-amber-400 border border-amber-800/50';
      default: return 'bg-stone-900/30 text-stone-400 border border-stone-800/50';
    }
  };

  const getRoleLabel = (role) => {
    switch (role) {
      case 'owner': return 'Owner';
      case 'manager': return 'Manager';
      case 'cashier': return 'Kasir';
      case 'kitchen': return 'Dapur/Barista';
      default: return 'Pelanggan';
    }
  };

  const cartItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <nav className="glass-panel sticky top-0 z-40 border-b border-stone-200/80 bg-white/85 px-3.5 py-2.5 md:px-8 md:py-3.5">
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        
        {/* Brand Logo */}
        <div className="flex items-center gap-1.5 md:gap-2">
          <img src={logoLocana} alt="Locana" className="h-8.5 md:h-10 w-auto shrink-0" />
        </div>

        {/* User Stats & Navigation */}
        <div className="flex items-center gap-2 md:gap-4">
          {user && (
            <div className="flex items-center gap-2 md:gap-3">
              {/* Loyalty Point Widget for Customer */}
              {user.role === 'customer' && (
                <div className="flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 md:px-3 md:py-1 text-xs md:text-sm font-semibold text-amber-700 border border-amber-200/60 shadow-sm animate-pulse-soft shrink-0">
                  <Star className="h-3.5 w-3.5 fill-amber-500 stroke-amber-600" />
                  <span>{user.loyalty_points || 0} Pts</span>
                </div>
              )}

              {/* User Identity */}
              <div className="hidden flex-col items-end md:flex">
                <span className="text-sm font-semibold text-stone-800">{user.name}</span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${getRoleBadgeColor(user.role)}`}>
                  {getRoleLabel(user.role)}
                </span>
              </div>

              {/* Cart Button (for Customer role only) */}
              {user.role === 'customer' && onCartClick && (
                <button
                  onClick={onCartClick}
                  className="btn-transition relative flex h-8.5 w-8.5 md:h-10 md:w-10 items-center justify-center rounded-xl bg-stone-100 hover:bg-amber-50 hover:text-amber-700 text-stone-600 shadow-inner shrink-0"
                  aria-label="Keranjang Belanja"
                >
                  <ShoppingBag className="h-4.5 w-4.5 md:h-5 md:w-5" />
                  {cartItemsCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-amber-600 text-[8px] md:text-[10px] font-bold text-white ring-2 ring-white">
                      {cartItemsCount}
                    </span>
                  )}
                </button>
              )}

              {/* Logout Button */}
              <button
                onClick={logout}
                className="btn-transition flex h-8.5 w-8.5 md:h-10 md:w-10 items-center justify-center rounded-xl bg-stone-100 hover:bg-red-50 hover:text-red-600 text-stone-600 shrink-0"
                title="Keluar"
              >
                <LogOut className="h-4 w-4 md:h-4.5 md:w-4.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
