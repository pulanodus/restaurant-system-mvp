'use client';

import { useCart } from '@/contexts/CartContext';
import { useState } from 'react';
import { Clock } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { getMenuItemPlaceholder } from '@/lib/placeholder-images';

interface MenuItemWithCartProps {
  item: {
    id: string;
    name: string;
    description?: string;
    price: number;
    image_url?: string;
    category?: string;
    rating?: number;
    preparation_time?: string;
  };
  sessionId: string;
}

const MenuItemWithCart = ({ item, sessionId }: MenuItemWithCartProps) => {
  const { state, getItemQuantity, addItem, removeItem, updateQuantity } = useCart();
  const currentQuantity = getItemQuantity(item.id);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const router = useRouter();

  console.log('🍽️ MenuItemWithCart rendered:', {
    itemName: item.name,
    itemId: item.id,
    sessionId,
    currentQuantity,
    cartState: state,
    cartItemsLength: state.items?.length || 0,
    hasAddItem: typeof addItem === 'function',
    hasUpdateQuantity: typeof updateQuantity === 'function'
  });

  // Test if cart context is working
  if (typeof addItem !== 'function') {
    console.error('❌ Cart context not working - addItem is not a function');
  }

  // Find the cart item for this menu item to get its ID
  const cartItem = state.items.find(cartItem => cartItem.menu_item_id === item.id);
  const cartItemId = cartItem?.id;

  const handleIncrement = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    console.log('🔵 MenuItemWithCart - Button clicked!', {
      itemName: item.name,
      itemId: item.id,
      currentQuantity,
      isLoading,
      isProcessing,
      cartItem,
      cartItemId,
      sessionId
    });
    
    if (isLoading || isProcessing) {
      console.log('MenuItemWithCart - Already processing, ignoring click');
      return;
    }
    
    console.log('MenuItemWithCart - Incrementing item:', item.name, 'Current quantity:', currentQuantity);
    setIsLoading(true);
    setIsProcessing(true);
    
    try {
      if (cartItem) {
        // If item is in cart, increment quantity
        console.log('MenuItemWithCart - Updating existing item quantity');
        await updateQuantity(cartItemId!, currentQuantity + 1);
      } else {
        // If new item, add it with default options
        console.log('MenuItemWithCart - Adding new item to cart');
        await addItem(item);
      }
    } catch (error) {
      console.error('❌ Error updating cart:', error);
    } finally {
      setIsLoading(false);
      // Add a small delay to prevent rapid clicks
      setTimeout(() => setIsProcessing(false), 500);
    }
  };

  const handleDecrement = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    if (isLoading || isProcessing || !cartItemId) {
      console.log('MenuItemWithCart - Already processing or no cart item, ignoring click');
      return;
    }
    
    console.log('MenuItemWithCart - Decrementing item:', item.name, 'Current quantity:', currentQuantity);
    setIsLoading(true);
    setIsProcessing(true);
    
    try {
      if (currentQuantity > 1) {
        console.log('MenuItemWithCart - Decreasing quantity');
        await updateQuantity(cartItemId!, currentQuantity - 1);
      } else {
        console.log('MenuItemWithCart - Removing item from cart');
        await removeItem(cartItemId);
      }
    } catch (error) {
      console.error('Error updating cart:', error);
    } finally {
      setIsLoading(false);
      // Add a small delay to prevent rapid clicks
      setTimeout(() => setIsProcessing(false), 500);
    }
  };

  const handleCardClick = () => {
    router.push(`/customize?sessionId=${sessionId}&itemId=${item.id}`);
  };

  return (
    <div onClick={handleCardClick} className="flex items-center justify-between p-3 bg-white rounded-lg shadow-sm border border-gray-100 cursor-pointer hover:shadow-md transition-shadow mb-2 md:mb-0 md:flex-col md:items-start md:p-4 md:h-full">
      {/* Item image and details */}
      <div className="flex items-center space-x-3 flex-grow min-w-0 md:flex-col md:space-x-0 md:space-y-3 md:w-full">
        <div className="w-20 h-20 bg-gray-200 rounded-md flex items-center justify-center flex-shrink-0 md:w-full md:h-32 relative overflow-hidden">
          <img 
            src={item.image_url || getMenuItemPlaceholder(item.name)} 
            alt={item.name} 
            className="w-full h-full object-cover rounded-md" 
            onError={(e) => {
              // Fallback to placeholder if image fails to load
              const target = e.target as HTMLImageElement;
              target.src = getMenuItemPlaceholder(item.name);
            }}
          />
          {item.rating && (
            <div className="absolute top-1 right-1 bg-black bg-opacity-70 text-white px-1.5 py-0.5 rounded-full flex items-center space-x-1">
              <span className="text-yellow-400 text-xs">★</span>
              <span className="text-xs font-medium">{item.rating}</span>
            </div>
          )}
        </div>
        <div className="flex-grow min-w-0 md:w-full">
          <h3 className="font-semibold text-gray-900 truncate text-sm md:text-base md:font-bold">{item.name}</h3>
          <p className="text-xs text-gray-600 mt-1 line-clamp-2 md:text-sm md:mt-2">{item.description}</p>
          <div className="mt-1 md:mt-2">
            <p className="text-base font-bold text-gray-900 md:text-lg">P{item.price.toFixed(2)}</p>
            {item.preparation_time && (
              <p className="text-xs text-gray-500 mt-1 flex items-center">
                <Clock size={12} className="mr-1" />
                {item.preparation_time}
              </p>
            )}
          </div>
        </div>
      </div>
      {/* Quantity controls */}
      <div className="flex items-center space-x-1 flex-shrink-0 ml-3 md:ml-0 md:mt-3 md:w-full md:justify-center" onClick={(e) => e.stopPropagation()}>
        {currentQuantity > 0 && (
          <button
            onClick={handleDecrement}
            disabled={isLoading || isProcessing}
            className="w-8 h-8 flex items-center justify-center rounded-full transition-colors bg-[#00d9ff] text-white hover:bg-[#00c4e6] disabled:opacity-50 disabled:cursor-not-allowed text-xs font-medium"
            aria-label={`Remove one ${item.name}`}
          >
            {isLoading ? '...' : '-'}
          </button>
        )}
        {currentQuantity > 0 && (
          <span className="w-6 text-center font-medium text-gray-900 text-xs">
            {currentQuantity}
          </span>
        )}
        <button
          onClick={handleIncrement}
          disabled={isLoading || isProcessing}
          className="w-8 h-8 flex items-center justify-center bg-[#00d9ff] text-white rounded-full hover:bg-[#00c4e6] transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-xs font-medium"
          aria-label={`Add one ${item.name}`}
        >
          {isLoading ? '...' : '+'}
        </button>
      </div>
    </div>
  );
};

export default MenuItemWithCart;