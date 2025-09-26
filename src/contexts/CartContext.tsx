'use client'

import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

// Types
export interface CartItem {
  id: string
  menu_item_id: string
  name: string
  price: number
  quantity: number
  notes?: string | undefined
  isShared?: boolean | undefined
  isTakeaway?: boolean | undefined
  customizations?: any[] | undefined
  addedAt?: number
  splitCount?: number
  sharedWith?: string[]
  discountedPrice?: number
  // Split bill properties
  isSplit?: boolean
  splitPrice?: number
  originalPrice?: number
  splitBillId?: string
  participants?: string[]
  hasSplitData?: boolean
}

interface CartState {
  items: CartItem[]
  sessionId: string | null
  dinerName: string | null
  isLoading: boolean
  error: string | null
  isCleared: boolean
}

type CartAction =
  | { type: 'SET_SESSION'; payload: string }
  | { type: 'SET_DINER_NAME'; payload: string }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'LOAD_ITEMS'; payload: CartItem[] }
  | { type: 'ADD_ITEM'; payload: CartItem }
  | { type: 'REMOVE_ITEM'; payload: string }
  | { type: 'UPDATE_QUANTITY'; payload: { id: string; quantity: number } }
  | { type: 'UPDATE_ITEM'; payload: { itemId: string; options: any } }
  | { type: 'UPDATE_SPLIT_DATA'; payload: { menuItemId: string; splitCount: number; sharedWith: string[]; discountedPrice: number } }
  | { type: 'CLEAR_CART' }
  | { type: 'SET_CLEARED'; payload: boolean }

// Initial state
const initialState: CartState = {
  items: [],
  sessionId: null,
  dinerName: null,
  isLoading: false,
  error: null,
  isCleared: false
}

// Reducer
function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'SET_SESSION':
      return { ...state, sessionId: action.payload }
    
    case 'SET_DINER_NAME':
      console.log('🔍 CartContext - SET_DINER_NAME reducer called with:', action.payload);
      return { ...state, dinerName: action.payload }
    
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload }
    
    case 'SET_ERROR':
      return { ...state, error: action.payload }
    
    case 'LOAD_ITEMS':
      return { ...state, items: action.payload, isLoading: false }
    
    case 'ADD_ITEM':
      // Check for existing item with same menu_item_id, options, and customizations
      const existingItem = state.items.find(item => {
        const itemCustomizations = item.customizations || [];
        const payloadCustomizations = action.payload.customizations || [];
        const itemCustomizationsKey = JSON.stringify(itemCustomizations.sort());
        const payloadCustomizationsKey = JSON.stringify(payloadCustomizations.sort());
        
        return item.menu_item_id === action.payload.menu_item_id &&
               item.notes === action.payload.notes &&
               item.isShared === action.payload.isShared &&
               item.isTakeaway === action.payload.isTakeaway &&
               itemCustomizationsKey === payloadCustomizationsKey;
      })
      
      if (existingItem) {
        return {
          ...state,
          items: state.items.map(item =>
            item.id === existingItem.id
              ? { ...item, quantity: item.quantity + 1 }
              : item
          )
        }
      }
      return { ...state, items: [...state.items, { ...action.payload, addedAt: Date.now() }] }
    
    case 'REMOVE_ITEM':
      return {
        ...state,
        items: state.items.filter(item => item.id !== action.payload)
      }
    
    case 'UPDATE_QUANTITY':
      return {
        ...state,
        items: state.items.map(item =>
          item.id === action.payload.id
            ? { ...item, quantity: action.payload.quantity }
            : item
        ).filter(item => item.quantity > 0)
      }
    
    case 'UPDATE_ITEM':
      return {
        ...state,
        items: state.items.map(item =>
          item.id === action.payload.itemId
            ? { ...item, ...action.payload.options }
            : item
        )
      }
    
    case 'UPDATE_SPLIT_DATA':
      return {
        ...state,
        items: state.items.map(item =>
          item.menu_item_id === action.payload.menuItemId
            ? { 
                ...item, 
                splitCount: action.payload.splitCount,
                sharedWith: action.payload.sharedWith,
                discountedPrice: action.payload.discountedPrice
              }
            : item
        )
      }
    
    case 'CLEAR_CART':
      return { ...state, items: [], isCleared: true }
    
    case 'SET_CLEARED':
      return { ...state, isCleared: action.payload }
    
    default:
      return state
  }
}

// Context
const CartContext = createContext<{
  state: CartState
  dispatch: React.Dispatch<CartAction>
  addItem: (item: any, options?: { notes?: string; isShared?: boolean; isTakeaway?: boolean; customizations?: any[] }) => Promise<void>
  removeItem: (itemId: string) => Promise<void>
  updateQuantity: (itemId: string, quantity: number, options?: { notes?: string; isShared?: boolean; isTakeaway?: boolean; customizations?: any[] }) => Promise<void>
  updateItem: (updateData: { itemId: string; quantity: number; options: any }) => Promise<void>
  updateSplitData: (menuItemId: string, splitCount: number, sharedWith: string[], discountedPrice: number) => void
  getItemQuantity: (menuItemId: string) => number
  clearCart: () => Promise<void>
  loadCartItems: () => Promise<void>
  setDinerName: (dinerName: string) => void
} | null>(null)

// Provider component
export function CartProvider({ children, sessionId, dinerName }: { children: React.ReactNode; sessionId: string; dinerName?: string | null }) {
  const [state, dispatch] = useReducer(cartReducer, initialState)

  // Use the sessionId passed from DynamicLayout
  const currentSessionId = sessionId
  
  // Set diner name if provided
  useEffect(() => {
    if (dinerName && dinerName !== state.dinerName) {
      console.log('🔍 CartProvider - Setting diner name from props:', dinerName);
      dispatch({ type: 'SET_DINER_NAME', payload: dinerName });
    }
  }, [dinerName, state.dinerName]);
  
  console.log('🚀 CartProvider initialized:', {
    sessionId: currentSessionId,
    dinerName: dinerName,
    stateDinerName: state.dinerName,
    sessionIdLength: currentSessionId?.length || 0,
    stateItems: state.items,
    stateItemsLength: state.items?.length || 0,
    isLoading: state.isLoading,
    error: state.error
  });

  // Load cart items from database
  const loadCartItems = useCallback(async () => {
    if (!currentSessionId) {
      console.log('CartContext - No sessionId, skipping loadCartItems')
      return
    }

    if (!state.dinerName) {
      console.log('CartContext - No dinerName, skipping loadCartItems')
      // Clear cart if no diner name to prevent showing other users' items
      dispatch({ type: 'LOAD_ITEMS', payload: [] })
      return
    }

    console.log('CartContext - Loading cart items for sessionId:', currentSessionId, 'and dinerName:', state.dinerName)

    try {
      dispatch({ type: 'SET_LOADING', payload: true })
      dispatch({ type: 'SET_ERROR', payload: null })

      console.log('🟡 CartContext - Making API request to:', window.location.origin + '/api/cart/load');
      console.log('🟡 CartContext - Request body:', { sessionId: currentSessionId, dinerName: state.dinerName });
      console.log('🟡 CartContext - Current dinerName state:', state.dinerName);

      const response = await fetch('/api/cart/load', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: currentSessionId, dinerName: state.dinerName })
      })

      console.log('🟡 CartContext - API response status:', response.status);
      console.log('🟡 CartContext - API response ok:', response.ok);

      if (!response.ok) {
        const errorData = await response.json()
        console.error('❌ CartContext - API error response:', errorData);
        throw new Error(errorData.error || 'Failed to load cart items')
      }

      const { items } = await response.json()
      console.log('CartContext - Loaded cart items for', state.dinerName, ':', items)
      dispatch({ type: 'LOAD_ITEMS', payload: items || [] })
    } catch (error) {
      console.error('Error loading cart items:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to load cart items'
      dispatch({ type: 'SET_ERROR', payload: errorMessage })
      // Clear cart on error to prevent showing stale data
      dispatch({ type: 'LOAD_ITEMS', payload: [] })
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false })
    }
  }, [currentSessionId, state.dinerName])

  // Set session ID when it changes
  useEffect(() => {
    console.log('🔍 CartContext - useEffect triggered, currentSessionId:', currentSessionId)
    if (currentSessionId) {
      dispatch({ type: 'SET_SESSION', payload: currentSessionId })
    }
  }, [currentSessionId])

  // CRITICAL FIX: Reload cart items when diner name changes
  useEffect(() => {
    if (currentSessionId && state.dinerName) {
      console.log('🔍 CartContext - Diner name changed, reloading cart items for:', state.dinerName)
      loadCartItems()
    }
  }, [state.dinerName, currentSessionId, loadCartItems])

  // Load cart items when sessionId is available (diner name loading is handled separately)
  useEffect(() => {
    if (currentSessionId) {
      console.log('🔍 CartContext - SessionId available, loading cart items:', {
        sessionId: currentSessionId,
        dinerName: state.dinerName
      })
      loadCartItems()
    } else {
      console.log('🔍 CartContext - Waiting for sessionId:', { 
        sessionId: currentSessionId, 
        dinerName: state.dinerName 
      })
    }
  }, [currentSessionId, loadCartItems])

  // Add item to cart
  const addItem = async (item: any, options?: { notes?: string; isShared?: boolean; isTakeaway?: boolean; customizations?: any[] }) => {
    console.log('🟢 CartContext - addItem called:', {
      itemName: item.name,
      itemId: item.id,
      currentSessionId,
      options
    });

    if (!currentSessionId) {
      console.error('❌ CartContext - No session ID available');
      dispatch({ type: 'SET_ERROR', payload: 'No session ID available' })
      return
    }

    console.log('CartContext - Adding new item:', item.name, 'Current cart items:', state.items.length)

    try {
      dispatch({ type: 'SET_ERROR', payload: null })
      
      // Reset cleared flag when adding new items
      if (state.isCleared) {
        dispatch({ type: 'SET_CLEARED', payload: false })
      }

      const requestBody = { sessionId: currentSessionId, item, options, dinerName: state.dinerName };
      console.log('🟡 CartContext - Making API request to:', window.location.origin + '/api/cart/add');
      console.log('🟡 CartContext - Request body:', requestBody);

      const response = await fetch('/api/cart/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      })

      console.log('🟡 CartContext - API response status:', response.status);
      console.log('🟡 CartContext - API response ok:', response.ok);

      if (!response.ok) {
        const errorData = await response.json()
        console.error('❌ CartContext - API error:', errorData);
        throw new Error(errorData.error || 'Failed to add item to cart')
      }

      const { item: cartItem } = await response.json()
      console.log('✅ CartContext - Item added successfully:', cartItem.name)
      dispatch({ type: 'ADD_ITEM', payload: cartItem })
    } catch (error) {
      console.error('❌ Error adding item to cart:', error)
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to add item to cart' })
    }
  }

  // Remove item from cart
  const removeItem = async (itemId: string) => {
    if (!currentSessionId) {
      console.error('❌ CartContext - No session ID available for removeItem');
      return
    }

    if (!state.dinerName) {
      console.error('❌ CartContext - No diner name available for removeItem');
      dispatch({ type: 'SET_ERROR', payload: 'No diner name available' })
      return
    }

    try {
      const response = await fetch('/api/cart/remove', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId, dinerName: state.dinerName })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to remove item from cart')
      }

      dispatch({ type: 'REMOVE_ITEM', payload: itemId })
    } catch (error) {
      console.error('Error removing item from cart:', error)
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to remove item from cart' })
    }
  }

  // Update item quantity
  const updateQuantity = async (itemId: string, quantity: number, options?: { notes?: string; isShared?: boolean; isTakeaway?: boolean; customizations?: any[] }) => {
    if (!currentSessionId) {
      console.error('❌ CartContext - No session ID available for updateQuantity');
      return
    }

    if (!state.dinerName) {
      console.error('❌ CartContext - No diner name available for updateQuantity');
      dispatch({ type: 'SET_ERROR', payload: 'No diner name available' })
      return
    }

    try {
      if (quantity <= 0) {
        await removeItem(itemId)
        return
      }

      const response = await fetch('/api/cart/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId, quantity, options, dinerName: state.dinerName })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update item quantity')
      }

      dispatch({ type: 'UPDATE_QUANTITY', payload: { id: itemId, quantity } })
    } catch (error) {
      console.error('Error updating item quantity:', error)
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to update item quantity' })
    }
  }

  // Update item with new options
  const updateItem = async (updateData: { itemId: string; quantity: number; options: any }) => {
    if (!currentSessionId) return

    try {
      const response = await fetch('/api/cart/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update item')
      }

      dispatch({ type: 'UPDATE_ITEM', payload: { itemId: updateData.itemId, options: updateData.options } })
    } catch (error) {
      console.error('Error updating item:', error)
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to update item' })
    }
  }

  // Update split data for an item
  const updateSplitData = (menuItemId: string, splitCount: number, sharedWith: string[], discountedPrice: number) => {
    // Ensure sharedWith is always an array
    const safeSharedWith = Array.isArray(sharedWith) ? sharedWith : []
    
    dispatch({
      type: 'UPDATE_SPLIT_DATA',
      payload: { menuItemId, splitCount, sharedWith: safeSharedWith, discountedPrice }
    })
  }

  // Get item quantity
  const getItemQuantity = (menuItemId: string): number => {
    const item = state.items.find(item => item.menu_item_id === menuItemId)
    return item ? item.quantity : 0
  }

  // Clear cart
  const clearCart = async () => {
    if (!currentSessionId) return

    try {
      console.log('CartContext - Clearing cart for sessionId:', currentSessionId)
      
      // Only clear local state - don't delete from database
      // The orders should be updated to 'preparing' status by the confirm API
      dispatch({ type: 'CLEAR_CART' })
      console.log('CartContext - Cart cleared successfully')
    } catch (error) {
      console.error('Error clearing cart:', error)
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to clear cart' })
    }
  }

  const setDinerName = (dinerName: string) => {
    console.log('🔍 CartContext - setDinerName called with:', dinerName);
    dispatch({ type: 'SET_DINER_NAME', payload: dinerName })
  }

  const value = {
    state,
    dispatch,
    addItem,
    removeItem,
    updateQuantity,
    updateItem,
    updateSplitData,
    getItemQuantity,
    clearCart,
    loadCartItems,
    setDinerName
  }

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  )
}

// Hook to use cart context
export function useCart() {
  const context = useContext(CartContext)
  if (!context) {
    console.error('useCart hook called outside of CartProvider')
    throw new Error('useCart must be used within a CartProvider')
  }
  return context
}
