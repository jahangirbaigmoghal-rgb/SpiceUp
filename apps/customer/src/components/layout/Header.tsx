import { Link, useLocation } from 'react-router-dom';
import { ShoppingBag, ChevronRight } from 'lucide-react';
import { useCart } from '../../lib/cart-context';
import type { StoreSettings } from '../../types';

interface HeaderProps {
  settings: StoreSettings;
}

export function Header({ settings }: HeaderProps) {
  const { itemCount } = useCart();
  const location = useLocation();
  const showCart = location.pathname === '/menu' && itemCount > 0;

  return (
    <header className="sticky top-0 z-30 h-16 px-4 sm:px-6 flex items-center justify-between bg-white/90 backdrop-blur-md border-b border-slate-100 shadow-sm">
      {/* Brand */}
      <Link to="/menu" className="flex items-center gap-3 group">
        <div className="w-10 h-10 bg-gradient-to-tr from-brand-600 to-brand-400 rounded-xl flex items-center justify-center shadow-sm transition-transform group-hover:scale-105">
          <ShoppingBag className="w-5 h-5 text-white" />
        </div>
        <div className="hidden sm:block">
          <span className="font-extrabold text-base tracking-tight text-slate-900 block leading-tight">
            {settings.storeName || 'SpiceUp'}
          </span>
          <span className="text-xs text-slate-500">
            {settings.pwaBannerSub || 'Order Online'}
          </span>
        </div>
      </Link>

      {/* Right side */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Open / closed status */}
        <div className="hidden sm:flex items-center gap-1.5 text-sm text-slate-500">
          {settings.storeIsOpen ? (
            <>
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75 animate-ping" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
              </span>
              <span className="font-medium">Open till {settings.storeCloseTime || '23:30'}</span>
            </>
          ) : (
            <>
              <span className="h-2 w-2 rounded-full bg-red-500" />
              <span className="font-medium">Closed</span>
            </>
          )}
        </div>

        {/* Mobile open/closed dot */}
        <div className="flex sm:hidden items-center gap-1">
          <span
            className={`h-2 w-2 rounded-full ${settings.storeIsOpen ? 'bg-green-500' : 'bg-red-500'}`}
          />
        </div>

        {/* Cart button */}
        {showCart && (
          <Link
            to="/checkout"
            className="inline-flex items-center gap-2 h-10 px-4 bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white rounded-xl text-sm font-bold transition-all shadow-md shadow-brand-500/20"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Cart ({itemCount})</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        )}
      </div>
    </header>
  );
}
