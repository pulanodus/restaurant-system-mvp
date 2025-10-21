'use client';

import { useState, useEffect } from 'react';

import { useCart } from '@/contexts/CartContext';
import BottomSheetModal from './BottomSheetModal';

interface CenteredModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemName: string;
  itemPrice: number;
  itemDescription?: string;
  rating?: number;
  preparationTime?: string;
  sessionId: string;
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
}

const CenteredModal = ({
  isOpen,
  onClose,
  itemName,
  itemPrice,
  itemDescription,
  rating: _rating,
  preparationTime,
  sessionId: _sessionId,
  item
}: CenteredModalProps): React.JSX.Element | null => {
  const [notes, setNotes] = useState('');
  const [isShared, setIsShared] = useState(false);
  const [_isTakeaway, _setIsTakeaway] = useState(false); // Disabled as requested
  const [isUpdating, setIsUpdating] = useState(false);
  const { state, getItemQuantity, addItem, loadCartItems } = useCart();
  const cart = state.items;
  
  // Find the cart item for this menu item
  const cartItem = cart?.find((cartItem: any) => cartItem.menu_item_id === item?.id);
  const _currentQuantity = getItemQuantity(item?.id || '');
  
  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setNotes(cartItem?.notes || '');
      setIsShared(cartItem?.isShared || false);
      _setIsTakeaway(false); // Always disabled
    }
  }, [isOpen, cartItem]);

  // Calculate real-time price based on options
  const calculatePrice = (): number => {
    const basePrice = itemPrice;
    // Add any price modifications based on options here
    // For now, we'll keep it simple and just return the base price
    // Future: Add pricing logic for shared items, customizations, etc.
    return basePrice;
  };

  // Remove the old handleAddToCart function - we don't add items in the modal anymore

  const handleToggleShared = (): void => {
    // Toggle shared item - if it's already shared, uncheck it
    // If it's not shared, check it (and takeaway will be automatically unchecked)
    setIsShared(!isShared);
    // Takeaway is disabled, so we don't need to handle it
    // The mutual exclusivity is handled by the fact that takeaway is always disabled
  };

  const handleMakeShared = async () => {
    if (!item || !sessionId) return;

    setIsUpdating(true);
    
    try {
      // First, check if item is already in cart
      
      const existingCartItem = cart?.find((cartItem: any) => 
        cartItem.menu_item_id === item.id && 
        cartItem.diner_name === cartItem.diner_name
      );
      
      
      if (existingCartItem) {
        // Update existing item to be shared
        const updateData = {
          is_shared: true,
          notes: notes || undefined
        };
        
        
        const response = await fetch('/api/cart/update', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            itemId: existingCartItem.id,
            options: updateData
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('❌ FAILED TO UPDATE ITEM TO SHARED:');
          console.error('Status:', response.status);
          console.error('Error:', errorText);
          console.error('Item ID:', existingCartItem.id);
          console.error('Update Data:', updateData);
          
          // Special case: If item is already in cart, we can still proceed
          if (response.status === 400 && errorText.includes('already in cart')) {
            // Don't add a new item, just proceed to split-bill page
          }
        }
      } else {
        // Add new item as shared
        await addItem(item, { 
          notes: notes || undefined, 
          isShared: true, 
          isTakeaway: false 
        });
      }
      
      // Navigate to split-bill page
      window.location.href = `/split-bill?itemId=${existingCartItem?.id || 'new'}&sessionId=${sessionId}`;
    } catch (error) {
      console.error('Error making item shared:', error);
      setIsUpdating(false);
    }
  };

  const handleUpdateItem = async () => {
    if (!item || !sessionId) return;

    setIsUpdating(true);
    
    try {
      // Check if item is already in cart
      const existingCartItem = cart?.find((cartItem: any) => 
        cartItem.menu_item_id === item.id && 
        cartItem.diner_name === cartItem.diner_name
      );
      
      if (existingCartItem) {
        // Update existing item
        const updateData = {
          notes: notes || undefined
        };
        
        
        const response = await fetch('/api/cart/update', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            itemId: existingCartItem.id,
            options: updateData
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('❌ FAILED TO UPDATE ITEM:');
          console.error('Status:', response.status);
          console.error('Error:', errorText);
          console.error('Item ID:', existingCartItem.id);
          console.error('Update Data:', updateData);
          
          // Special case: If item is already in cart, we can still proceed
          if (response.status === 400 && errorText.includes('already in cart')) {
            // Don't add a new item, just proceed to cart review
          }
        }
      } else {
        // Add new item
        await addItem(item, { 
          notes: notes || undefined, 
          isShared: false, 
          isTakeaway: false 
        });
      }
      
      // Navigate to cart review page
      window.location.href = `/cart-review?sessionId=${sessionId}`;
      onClose();
    } catch (error) {
      console.error('Error updating item:', error);
      setIsUpdating(false);
    }
  };

  return (
    <BottomSheetModal
      isOpen={isOpen}
      onClose={onClose}
      title="Customize Item"
      maxHeight="90vh"
    >
      {/* Item Banner without Image */}
      <div className="w-full h-24 bg-gray-100 flex items-center justify-center">
        <div className="text-gray-400 text-4xl font-bold">
          {itemName.charAt(0).toUpperCase()}
        </div>
      </div>

      {/* Item Details */}
      <div className="p-6 text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">{itemName}</h2>
        {itemDescription && (
          <p className="text-sm italic text-gray-500 mb-4">{itemDescription}</p>
        )}
        
        {/* Quantity and Totals Display */}
        {cartItem && cartItem.quantity > 0 && (
          <div className="mb-4 p-4 border-2 border-[#00d9ff] rounded-lg">
            <div className="flex items-center justify-between text-sm">
              <div className="text-left text-black font-medium">
                Total: {cartItem.quantity} × P{itemPrice.toFixed(0)}
              </div>
              <div className="text-right font-bold text-black text-lg">
                P{(cartItem.quantity * itemPrice).toFixed(2)}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Special Instructions */}
      <div className="px-6 mb-6">
        <h3 className="text-base font-semibold text-gray-800 mb-3">Special Instructions <span className="text-gray-500 font-bold">(optional)</span></h3>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Extra spicy / No onions / Extra cheese / etc..."
          className="w-full px-4 py-3 border-2 border-[#00d9ff] rounded-xl text-sm text-gray-600 placeholder-gray-400 placeholder:font-normal resize-none focus:ring-2 focus:ring-[#00d9ff] focus:border-transparent transition-colors bg-gray-50"
          rows={3}
        />
      </div>

      {/* Options */}
      <div className="px-6 mb-8">
        <h3 className="text-base font-semibold text-gray-800 mb-4">Options</h3>
        
        {/* Shared Item */}
        <div className={`p-4 border-2 rounded-xl mb-4 transition-all duration-200 cursor-pointer ${
          isShared 
            ? 'border-[#00d9ff] bg-blue-50' 
            : 'border-gray-200 hover:border-[#00d9ff] hover:bg-blue-50'
        }`} onClick={() => !isUpdating && handleToggleShared()}>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-base font-medium text-gray-700 cursor-pointer">
                    Shared Item
                  </label>
                  <p className="text-sm text-gray-500 mt-1">
                    Split the cost with others at your table
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={isShared}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleShared();
                  }}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#00d9ff] focus:ring-offset-2 ${
                    isShared ? 'bg-[#00d9ff]' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      isShared ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Takeaway - Disabled */}
        <div className="p-4 border-2 border-gray-200 rounded-xl opacity-50 cursor-not-allowed">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-base font-medium text-gray-500">
                    Takeaway (Coming Soon)
                  </label>
                  <p className="text-sm text-gray-400 mt-1">
                    Package this item to go
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={false}
                  disabled
                  className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-200 cursor-not-allowed"
                >
                  <span className="inline-block h-4 w-4 transform rounded-full bg-white translate-x-1" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="px-6 py-6 border-t border-gray-200 bg-white sticky bottom-0">
        {isShared ? (
          // Shared item button
          <button
            onClick={handleShareWithOthers}
            disabled={isUpdating}
            className={`w-full py-4 px-6 rounded-2xl font-bold text-lg transition-all duration-200 shadow-lg ${
              isUpdating 
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                : 'bg-[#00d9ff] text-white hover:bg-[#00c4e6] hover:shadow-xl active:scale-95'
            }`}
          >
            {isUpdating ? (
              <div className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Updating...
              </div>
            ) : (
              'Share with Others?'
            )}
          </button>
        ) : (
          // Regular item button
          <button
            onClick={handleConfirmAndReview}
            disabled={isUpdating}
            className={`w-full py-4 px-6 rounded-2xl font-bold text-lg transition-all duration-200 shadow-lg ${
              isUpdating 
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                : 'bg-[#00d9ff] text-white hover:bg-[#00c4e6] hover:shadow-xl active:scale-95'
            }`}
          >
            {isUpdating ? (
              <div className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Updating...
              </div>
            ) : (
              'Review Cart'
            )}
          </button>
        )}
      </div>
    </BottomSheetModal>
  );
};

export default CenteredModal;
