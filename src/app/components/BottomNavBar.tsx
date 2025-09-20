'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UtensilsCrossed, Receipt, ShoppingCart, Bell, HelpCircle, FileText } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { useState, useRef, useEffect } from 'react';

interface BottomNavBarProps {
  sessionId?: string;
}

const BottomNavBar = ({ sessionId }: BottomNavBarProps) => {
  const pathname = usePathname();
  const { state } = useCart();
  const [isWaiterDropdownOpen, setIsWaiterDropdownOpen] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Extract sessionId from URL if not provided
  const currentSessionId = sessionId || (pathname.includes('/session/') ? pathname.split('/session/')[1]?.split('/')[0] : '');

  // Calculate total cart quantity from context
  const cartItemCount = state.items.reduce((total: number, item: any) => total + item.quantity, 0);

  // Ensure client-side rendering to prevent hydration mismatch
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsWaiterDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Handle waiter button click
  const handleWaiterClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsWaiterDropdownOpen(!isWaiterDropdownOpen);
  };

  // Handle waiter option selection
  const handleWaiterOption = (option: 'help' | 'bill') => {
    setIsWaiterDropdownOpen(false);
    if (option === 'help') {
      // Navigate to help page or show help modal
      window.location.href = currentSessionId ? `/waiter/help?sessionId=${currentSessionId}` : '/waiter/help';
    } else if (option === 'bill') {
      // Start the new payment flow
      if (currentSessionId) {
        // Calculate current totals from cart
        const cartSubtotal = state.items.reduce((sum: number, item: any) => {
          if (item.isSplit && item.splitPrice) {
            return sum + item.splitPrice;
          } else {
            return sum + (item.price * item.quantity);
          }
        }, 0);
        const vat = cartSubtotal * 0.14;
        
        // Navigate to tipping modal via payment confirmation page
        const params = new URLSearchParams({
          sessionId: currentSessionId,
          subtotal: cartSubtotal.toString(),
          vat: vat.toString(),
          tipAmount: '0',
          finalTotal: (cartSubtotal + vat).toString()
        });
        
        window.location.href = `/payment-confirmation?${params.toString()}`;
      } else {
        // Fallback to old bill request page
        window.location.href = '/waiter/bill';
      }
    }
  };

  // Define navigation items with session-aware URLs
  const navItems = [
    { 
      href: currentSessionId ? `/session/${currentSessionId}` : '#', 
      icon: UtensilsCrossed, 
      label: 'Menu',
      isActive: (path: string) => {
        // Menu button is active when on the main menu page (session page)
        return currentSessionId ? path.includes(`/session/${currentSessionId}`) && !path.includes('/customize') : false;
      }
    },
    { 
      href: currentSessionId ? `/live-bill?sessionId=${currentSessionId}` : '/live-bill', 
      icon: Receipt, 
      label: 'Live Bill',
      isActive: (path: string) => {
        // Bill button is active on live-bill pages
        return path.includes('/live-bill');
      }
    },
    { 
      href: currentSessionId ? `/cart-review?sessionId=${currentSessionId}` : '/cart', 
      icon: ShoppingCart, 
      label: 'Cart',
      isActive: (path: string) => {
        // Cart button is active on cart-review pages
        return path.includes('/cart-review') || path === '/cart';
      }
    },
  ];

  // Helper function to get stable class names - only calculate active state on client
  const getNavItemClasses = (isActive: boolean) => {
    const baseClasses = 'group flex flex-col items-center justify-center p-2 w-20 transition-all duration-200 relative rounded-xl';
    const activeClasses = 'text-white bg-[#00d9ff] shadow-md';
    const inactiveClasses = 'text-gray-600 hover:text-white hover:bg-[#00d9ff] hover:shadow-sm';
    
    // Only apply active classes on client side to prevent hydration mismatch
    return `${baseClasses} ${isClient && isActive ? activeClasses : inactiveClasses}`;
  };

  const getTextClasses = (isActive: boolean) => {
    const baseClasses = 'text-[10px] mt-1 font-medium transition-colors duration-200 text-center leading-tight';
    const activeClasses = 'text-white';
    const inactiveClasses = 'text-gray-600 group-hover:text-white';
    
    // Only apply active classes on client side to prevent hydration mismatch
    return `${baseClasses} ${isClient && isActive ? activeClasses : inactiveClasses}`;
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-50 shadow-lg">
      <div className="flex justify-around items-center h-16 px-4 max-w-[480px] mx-auto">
        {navItems.map((item) => {
          const IconComponent = item.icon;
          // Only calculate isActive on client side to prevent hydration mismatch
          const isActive = isClient ? item.isActive(pathname) : false;
          const showBadge = item.label === 'Cart' && cartItemCount > 0;
          
          const handleMenuClick = (e: React.MouseEvent) => {
            if (item.label === 'Menu' && !currentSessionId) {
              e.preventDefault();
              alert('Please scan a QR code first to start a session');
            }
          };

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={handleMenuClick}
              className={getNavItemClasses(isActive)}
            >
              <div className="relative">
                <IconComponent 
                  size={isClient ? 18 : 20} 
                  className={`transition-transform duration-200 ${
                    isActive && isClient ? 'scale-110' : 'scale-100'
                  }`}
                />
                {showBadge && (
                  <div className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {cartItemCount > 99 ? '99+' : cartItemCount}
                  </div>
                )}
              </div>
              <span className={getTextClasses(isActive)}>
                {item.label}
              </span>
            </Link>
          );
        })}
        
        {/* Waiter Button with Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={handleWaiterClick}
            className={getNavItemClasses(false)} // Waiter button is never "active" in navigation sense
          >
            <div className="relative">
              <Bell 
                size={18} 
                className="transition-transform duration-200 scale-100"
              />
            </div>
            <span className={getTextClasses(false)}>
              Call Waiter
            </span>
          </button>
          
          {/* Dropdown Menu */}
          {isWaiterDropdownOpen && (
            <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-white rounded-xl shadow-lg border border-gray-100 py-2 min-w-[140px]">
              <button
                onClick={() => handleWaiterOption('help')}
                className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
              >
                <HelpCircle size={14} />
                <span>Need Help</span>
              </button>
              <button
                onClick={() => handleWaiterOption('bill')}
                className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
              >
                <FileText size={14} />
                <span>Request Bill</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default BottomNavBar;
