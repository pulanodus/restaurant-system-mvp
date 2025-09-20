'use client';

import React, { createContext, useContext, useReducer, useCallback, useEffect, ReactNode } from 'react';

// ============================================
// SIMPLE WORKING CART CONTEXT - RESET VERSION
// ============================================

export interface CartItem {
  id: string;
  menu_item_id: string;
  name: string;
  price: number;
  quantity: number;
  notes?: string;
  isShared?: boolean;
  isTakeaway?: boolean;
  customizations?: any[];
  addedAt?: number;
  splitCount?: number;
  sharedWith?: string[];
  discountedPrice?: number;
  // Split bill properties
  isSplit?: boolean;
  splitPrice?: number;
  originalPrice?: number;
  splitBillId?: string;
  participants?: string[];
  hasSplitData?: boolean;
}

interface CartState {
  items: CartItem[];
  isLoading: boolean;
  error: string | null;
  total: number;
}

type CartAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'ADD_ITEM'; payload: CartItem }
  | { type: 'UPDATE_QUANTITY'; payload: { id: string; quantity: number } }
  | { type: 'REMOVE_ITEM'; payload: string }
  | { type: 'CLEAR_CART' }
  | { type: 'LOAD_ITEMS'; payload: CartItem[] };

const cartReducer = (state: CartState, action: CartAction): CartState => {
  console.log(`🛒 CART REDUCER: ${action.type}`, { 
    action, 
    currentItems: state.items.length 
  });
  
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    
    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false };
    
    case 'ADD_ITEM': {
      const newItem = action.payload;
      console.log(`🔍 ADD_ITEM: Looking for existing item`, { newItem });

      // Find existing item by menu_item_id
      const existingItemIndex = state.items.findIndex(item => 
        item.menu_item_id === newItem.menu_item_id
      );
      
      if (existingItemIndex >= 0) {
        // Update existing item - INCREMENT quantity
        console.log(`✅ Found existing item at index ${existingItemIndex}`);
          const updatedItems = [...state.items];
        const existingItem = updatedItems[existingItemIndex];
        if (existingItem) {
          updatedItems[existingItemIndex] = {
            ...existingItem,
            quantity: existingItem.quantity + 1,
            notes: newItem.notes || existingItem.notes || '',
          };
        }
        
        return {
          ...state,
          items: updatedItems,
          total: calculateTotal(updatedItems),
        };
      } else {
        // Add new item
        console.log(`➕ Adding new item to cart`);
        const newItems = [...state.items, { 
          ...newItem, 
          quantity: 1,
          id: newItem.id || `item-${Date.now()}`,
          menu_item_id: newItem.menu_item_id || newItem.id || `item-${Date.now()}`,
          name: newItem.name || '',
          price: newItem.price || 0,
        }];
        
        return {
          ...state,
          items: newItems,
          total: calculateTotal(newItems),
        };
      }
      }
    
    case 'UPDATE_QUANTITY': {
      const { id, quantity } = action.payload;
      console.log(`🔄 UPDATE_QUANTITY:`, { id, quantity });
      
      if (quantity <= 0) {
        // Remove item if quantity is 0 or negative
        const filteredItems = state.items.filter(item => item.id !== id);
        return {
          ...state,
          items: filteredItems,
          total: calculateTotal(filteredItems)
        };
      }
      
      const updatedItems = state.items.map(item => 
        item.id === id ? { ...item, quantity } : item
      );
      
      return {
        ...state,
        items: updatedItems,
        total: calculateTotal(updatedItems)
      };
    }
    
    case 'REMOVE_ITEM': {
      const id = action.payload;
      console.log(`🗑️ REMOVE_ITEM:`, { id });
      const filteredItems = state.items.filter(item => item.id !== id);
      return {
        ...state,
        items: filteredItems,
        total: calculateTotal(filteredItems)
      };
    }
    
    case 'CLEAR_CART':
      console.log(`🧹 CLEAR_CART: Clearing all items`);
      return { ...state, items: [], total: 0 };
    
    case 'LOAD_ITEMS':
      console.log(`📥 LOAD_ITEMS:`, { items: action.payload });
      const loadedItems = action.payload || [];
      return {
        ...state,
        items: loadedItems,
        total: calculateTotal(loadedItems),
        isLoading: false
      };
    
    default:
      console.warn(`⚠️ Unknown cart action:`, (action as any).type);
      return state;
  }
};

// Helper function to calculate cart total
const calculateTotal = (items: CartItem[]): number => {
  const subtotal = items.reduce((total, item) => {
    // For split bill items, use the split price (per person price)
    // For regular items, use the regular price
    const itemPrice = (item.isSplit && item.splitPrice) ? item.splitPrice : (item.price || 0);
    const itemQuantity = item.quantity || 1;
    const itemTotal = itemPrice * itemQuantity;
    return total + itemTotal;
  }, 0);
  
  const vat = subtotal * 0.14; // 14% VAT
  const total = subtotal + vat;
  
  return Math.round(total * 100) / 100; // Round to 2 decimal places
};

interface CartContextType {
  state: CartState;
  addItem: (item: any, options?: { notes?: string; isShared?: boolean; isTakeaway?: boolean; customizations?: any[] }) => Promise<void>;
  updateQuantity: (itemId: string, quantity: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  clearCart: () => void;
  getItemQuantity: (itemId: string) => number;
  loadCartItems: () => Promise<void>;
  cart: CartItem[];
  isLoading: boolean;
  error: string | null;
}

export const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children, sessionId }: { children: ReactNode; sessionId: string }) {
  const [state, dispatch] = useReducer(cartReducer, {
    items: [],
    isLoading: false,
    error: null,
    total: 0
  });

  // Load cart items from database
  const loadCartItems = useCallback(async () => {
    if (!sessionId) {
      console.log('🚫 No sessionId, skipping cart load');
      return;
    }

    try {
      console.log('🛒 CONTEXT-LOAD: Starting to load cart for session:', sessionId);
      dispatch({ type: 'SET_LOADING', payload: true });

      const response = await fetch(`/api/cart/load?sessionId=${sessionId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      console.log('🛒 CONTEXT-LOAD: Response status:', response.status, response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('🛒 CONTEXT-LOAD: API Error:', response.status, errorText);
        throw new Error(`Failed to load cart items: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      console.log('🛒 CONTEXT-LOAD: Raw API response:', data);
      
      const items = data.items || [];
      console.log('🛒 CONTEXT-LOAD: Processed items:', items, 'Count:', items.length);
      
      dispatch({ type: 'LOAD_ITEMS', payload: items });
    } catch (error) {
      console.error('🛒 CONTEXT-LOAD: Error loading cart items:', error);
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to load cart items' });
    }
  }, [sessionId]);

  // Add item to cart
  const addItem = useCallback(async (item: any, options?: { notes?: string; isShared?: boolean; isTakeaway?: boolean; customizations?: any[] }) => {
    if (!sessionId) return;
    
    console.log('🛒 CONTEXT-ADD: Called with item:', item.name);

    // Prevent duplicate calls
    if (state.isLoading) {
      console.log('🚫 BLOCKED: Cart is already loading, ignoring duplicate addItem call');
      return;
    }

    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });

      const response = await fetch('/api/cart/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          item: {
            ...item,
            quantity: 1 // Always send quantity 1 for new items
          },
          options: {
            notes: options?.notes || '',
            isShared: options?.isShared || false,
            isTakeaway: options?.isTakeaway || false,
            customizations: options?.customizations || []
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add item to cart');
      }

      const { item: addedItem } = await response.json();
      console.log('🛒 Frontend received item from API:', addedItem);
      
      dispatch({ type: 'ADD_ITEM', payload: addedItem });
      
    } catch (error) {
      console.error('Error adding item to cart:', error);
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to add item to cart' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [sessionId, state.isLoading]);

  // Update item quantity
  const updateQuantity = useCallback(async (itemId: string, quantity: number) => {
    if (!sessionId) return;

    console.log('🛒 CONTEXT-UPDATE: Called with itemId:', itemId, 'quantity:', quantity);

    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });
      
      const response = await fetch('/api/cart/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId,
          quantity
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update item quantity');
      }

      dispatch({ type: 'UPDATE_QUANTITY', payload: { id: itemId, quantity } });
      
    } catch (error) {
      console.error('Error updating item quantity:', error);
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to update item quantity' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [sessionId]);

  // Remove item from cart
  const removeItem = useCallback(async (itemId: string) => {
    if (!sessionId) return;

    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });

      const response = await fetch('/api/cart/remove', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to remove item from cart');
      }

      dispatch({ type: 'REMOVE_ITEM', payload: itemId });
      
    } catch (error) {
      console.error('Error removing item from cart:', error);
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to remove item from cart' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [sessionId]);

  // Clear cart
  const clearCart = useCallback(async () => {
    if (!sessionId) return;

    try {
      console.log('🛒 CONTEXT-CLEAR: Clearing cart for session:', sessionId);
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });

      const response = await fetch('/api/cart/clear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to clear cart');
      }

      console.log('🛒 CONTEXT-CLEAR: Cart cleared successfully');
      dispatch({ type: 'CLEAR_CART' });
      
    } catch (error) {
      console.error('Error clearing cart:', error);
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to clear cart' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [sessionId]);

  // Get item quantity
  const getItemQuantity = useCallback((itemId: string): number => {
    const item = state.items.find(cartItem => 
      cartItem.menu_item_id === itemId || cartItem.id === itemId
    );
    return item?.quantity || 0;
  }, [state.items]);

  // Load cart items on mount
  useEffect(() => {
    if (sessionId) {
        loadCartItems();
    }
  }, [sessionId, loadCartItems]);

  const contextValue: CartContextType = {
    state,
    addItem,
    updateQuantity,
    removeItem,
    clearCart,
    getItemQuantity,
    loadCartItems,
    cart: state.items,
    isLoading: state.isLoading,
    error: state.error
  };

  return (
    <CartContext.Provider value={contextValue}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
