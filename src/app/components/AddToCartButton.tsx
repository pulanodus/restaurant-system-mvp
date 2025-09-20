'use client';

import React, { useState, useCallback } from 'react';
import { useCart } from '@/contexts/CartContext';

interface AddToCartButtonProps {
  item: {
    id: string;
    menu_item_id?: string;
    name: string;
    price: number;
    specialInstructions?: string;
  };
  quantity: number;
  disabled?: boolean;
  className?: string;
  children: React.ReactNode;
}

export const AddToCartButton: React.FC<AddToCartButtonProps> = ({
  item,
  quantity,
  disabled = false,
  className = '',
  children
}) => {
  const { addItem } = useCart();
  const [isAdding, setIsAdding] = useState(false);

  const handleAddToCart = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();
    
    // Prevent double-clicks and multiple dispatches
    if (isAdding || disabled) {
      console.log('🚫 Add to cart blocked - already adding or disabled');
      return;
    }

    setIsAdding(true);
    
    try {
      console.log('🛒 Adding to cart:', {
        name: item.name,
        id: item.id,
        quantity: quantity,
        price: item.price
      });

      const cartItem = {
        id: item.id,
        menu_item_id: item.menu_item_id,
        name: item.name,
        price: item.price,
        quantity: quantity, // Use exact quantity, not accumulated
        specialInstructions: item.specialInstructions,
        originalPrice: item.price,
        isShared: false,
        isSplit: false
      };

      addItem(cartItem);
      
      // Small delay to prevent rapid successive clicks
      await new Promise(resolve => setTimeout(resolve, 300));
      
    } catch (error) {
      console.error('❌ Error adding item to cart:', error);
    } finally {
      setIsAdding(false);
    }
  }, [addItem, item, quantity, isAdding, disabled]);

  return (
    <button
      onClick={handleAddToCart}
      disabled={disabled || isAdding}
      className={`${className} ${isAdding ? 'opacity-50 cursor-not-allowed' : ''}`}
      type="button"
    >
      {isAdding ? 'Adding...' : children}
    </button>
  );
};

// Usage example:
export const MenuItemCard: React.FC<{
  item: any;
  quantity: number;
  onQuantityChange: (qty: number) => void;
}> = ({ item, quantity, onQuantityChange }) => {
  return (
    <div className="menu-item-card">
      <h3>{item.name}</h3>
      <p>₱{item.price.toFixed(2)}</p>
      
      <div className="quantity-controls">
        <button onClick={() => onQuantityChange(Math.max(1, quantity - 1))}>-</button>
        <span>{quantity}</span>
        <button onClick={() => onQuantityChange(quantity + 1)}>+</button>
      </div>
      
      <AddToCartButton
        item={item}
        quantity={quantity}
        className="add-to-cart-btn"
      >
        Add to Cart
      </AddToCartButton>
    </div>
  );
};
