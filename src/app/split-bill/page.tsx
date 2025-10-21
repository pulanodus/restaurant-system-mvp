'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, 
  UserPlus, 
  Trash2, 
  Check
} from 'lucide-react';
import { useCart, CartProvider } from '@/contexts/CartContext';
import { handleError } from '@/lib/error-handling';
import GlobalNavigation from '@/app/components/GlobalNavigation';

interface SplitBillContentProps {
  sessionId: string;
  itemId?: string;
}

interface SessionDiner {
  id: string;
  name: string;
}

interface CartItem {
  id: string;
  menu_item_id: string;
  name: string;
  price: number;
  quantity: number;
  notes?: string;
  isShared?: boolean;
  isTakeaway?: boolean;
  participants?: string[];
  totalPeople?: number;
  // Split bill properties
  isSplit?: boolean;
  splitPrice?: number;
  originalPrice?: number;
  splitCount?: number;
  splitBillId?: string;
  hasSplitData?: boolean;
}

function SplitBillContent({ sessionId, itemId }: SplitBillContentProps) {
  const { state, updateItem, loadCartItems } = useCart();
  const router = useRouter();
  const [sessionDiners, setSessionDiners] = useState<SessionDiner[]>([]);
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [hasInitializedSelection, setHasInitializedSelection] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<CartItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [currentDinerName, setCurrentDinerName] = useState<string | null>(null);

  // Helper function to generate consistent colors for avatars
  const getAvatarColor = (name: string) => {
    const colors = [
      'bg-red-500',
      'bg-blue-500', 
      'bg-green-500',
      'bg-yellow-500',
      'bg-purple-500',
      'bg-pink-500',
      'bg-indigo-500',
      'bg-teal-500',
      'bg-orange-500',
      'bg-cyan-500'
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  // Helper function to get initials
  const getInitials = (name: string) => {
    return name.split(' ').map(word => word.charAt(0).toUpperCase()).join('').slice(0, 2);
  };

  // Load session diners and cart items
  useEffect(() => {
    loadSessionData();
  }, [sessionId]);

  // Simple: Always ensure current user is selected when session diners are loaded
  useEffect(() => {
    if (sessionDiners.length > 0 && state.dinerName && !hasInitializedSelection) {
      const currentDinerId = sessionDiners.find(d => d.name === state.dinerName)?.id;
      if (currentDinerId) {
        setSelectedParticipants([currentDinerId]); // Start with ONLY current user selected
        setHasInitializedSelection(true);
        // Debug logging removed for production security
      }
    }
  }, [sessionDiners, state.dinerName, hasInitializedSelection]);

  const loadSessionData = async () => {
    try {
      setIsLoading(true);
      
      // Load session diners
      const sessionResponse = await fetch(`/api/sessions/${sessionId}`);
      let sessionDinersData: SessionDiner[] = [];
      if (sessionResponse.ok) {
        const sessionData = await sessionResponse.json();
        if (sessionData.success && sessionData.session.diners) {
          sessionDinersData = sessionData.session.diners;
          setSessionDiners(sessionDinersData);
          
          // Get current diner name from cart context
          const currentDiner = state.dinerName;
          setCurrentDinerName(currentDiner);
          // Debug logging removed for production security
        }
      }

      // Load cart items from API directly to ensure we have the latest data
      // CRITICAL FIX: Include dinerName to maintain user isolation
      const cartResponse = await fetch('/api/cart/load', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, dinerName: state.dinerName })
      });

      if (cartResponse.ok) {
        const cartData = await cartResponse.json();
        const cartItems = cartData.items || [];
        setItems(cartItems);
        // Debug logging removed for production security
        
        // Debug: Log all items with their split data
        cartItems.forEach((item: any, index: number) => {
          // Debug logging removed for production security
        });

        // If specific itemId is provided, select only that item
        if (itemId) {
          const item = cartItems.find((item: CartItem) => item.menu_item_id === itemId);
          if (item) {
            setSelectedItems(new Set([item.id]));
            // Debug logging removed for production security
            // Debug logging removed for production security
            
            // SIMPLIFIED: Always start fresh with only current user selected
            // This prevents cross-contamination between different items
            // Debug logging removed for production security
            setHasInitializedSelection(false); // Reset initialization flag
          } else {
            // Debug logging removed for production security
          }
        } else {
          // Select all shared items by default
          const sharedItems = cartItems.filter((item: CartItem) => item.isShared);
          setSelectedItems(new Set(sharedItems.map((item: CartItem) => item.id)));
        }
      } else {
        console.error('❌ Failed to load cart items');
        setError('Failed to load cart items');
      }

    } catch (error) {
      const appError = handleError(error, {
        operation: 'Load Split Bill Data',
        sessionId
      });
      setError(appError.message);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleItemSelection = (itemId: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.add(itemId);
    }
    setSelectedItems(newSelected);
  };

  const handleQuantityChange = async (itemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      // Remove item from selection if quantity becomes 0
      const newSelected = new Set(selectedItems);
      newSelected.delete(itemId);
      setSelectedItems(newSelected);
      return;
    }

    try {
      // Update the item quantity in the local state
      setItems(prevItems => 
        prevItems.map(item => 
          item.id === itemId 
            ? { ...item, quantity: newQuantity }
            : item
        )
      );

      // Also update the cart via API to keep it in sync
      const response = await fetch('/api/cart/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          itemId, 
          quantity: newQuantity,
          options: {
            notes: items.find(i => i.id === itemId)?.notes,
            isShared: items.find(i => i.id === itemId)?.isShared,
            isTakeaway: items.find(i => i.id === itemId)?.isTakeaway
          }
        })
      });

      if (!response.ok) {
        console.error('Failed to update quantity in cart');
        // Revert the local state change
        setItems(prevItems => 
          prevItems.map(item => 
            item.id === itemId 
              ? { ...item, quantity: items.find(i => i.id === itemId)?.quantity || 1 }
              : item
          )
        );
      } else {
        // Debug logging removed for production security
      }
    } catch (error) {
      console.error('Error updating quantity:', error);
      // Revert the local state change
      setItems(prevItems => 
        prevItems.map(item => 
          item.id === itemId 
            ? { ...item, quantity: items.find(i => i.id === itemId)?.quantity || 1 }
            : item
        )
      );
    }
  };


  const toggleParticipant = (participantId: string) => {
    // SIMPLIFIED: Current user is always selected and cannot be deselected
    const currentDiner = state.dinerName;
    const currentDinerId = sessionDiners.find(d => d.name === currentDiner)?.id;
    
    if (participantId === currentDinerId) {
      // Debug logging removed for production security
      return; // Always keep current user selected
    }
    
    // Toggle other participants
    const newSelected = [...selectedParticipants];
    const index = newSelected.indexOf(participantId);
    if (index > -1) {
      newSelected.splice(index, 1);
      // Debug logging removed for production security
    } else {
      newSelected.push(participantId);
      // Debug logging removed for production security
    }
    setSelectedParticipants(newSelected);
  };

  const selectAllParticipants = () => {
    const allDinerIds = sessionDiners.map(diner => diner.id);
    // Debug logging removed for production security
    setSelectedParticipants(allDinerIds);
  };

  const deselectAllParticipants = () => {
    // Debug logging removed for production security
    setSelectedParticipants([]);
  };

  const toggleSelectAll = () => {
    if (selectedParticipants.length === sessionDiners.length) {
      deselectAllParticipants();
    } else {
      selectAllParticipants();
    }
  };


  const addCustomParticipant = () => {
    const name = prompt('Enter participant name:');
    if (name && name.trim()) {
      const newDiner: SessionDiner = {
        id: `custom_${Date.now()}`,
        name: name.trim()
      };
      setSessionDiners([...sessionDiners, newDiner]);
      setSelectedParticipants([...selectedParticipants, newDiner.id]);
    }
  };

  const removeCustomParticipant = (participantId: string) => {
    if (participantId.startsWith('custom_')) {
      setSessionDiners(sessionDiners.filter(diner => diner.id !== participantId));
      setSelectedParticipants(selectedParticipants.filter(id => id !== participantId));
    }
  };

  const calculateSplitAmounts = () => {
    const selectedItemsData = items.filter(item => selectedItems.has(item.id));
    
    // CRITICAL FIX: Calculate total amount correctly
    const totalAmount = selectedItemsData.reduce((sum, item) => {
      const itemTotal = item.price * item.quantity;
      // Debug logging removed for production security
      return sum + itemTotal;
    }, 0);
    
    // CRITICAL FIX: Ensure participant count is a number and debug the array
    const participantCount = Number(selectedParticipants.length);
    
    // Debug logging removed for production security
    
    if (participantCount === 0) return { totalAmount: 0, perPerson: 0 };
    
    // CRITICAL FIX: Simple division - this should be the correct formula
    const perPerson = totalAmount / participantCount;
    
    // Debug logging removed for production security
    
    return { totalAmount, perPerson };
  };

  const handleSaveSplit = async () => {
    if (selectedItems.size === 0) {
      setError('Please select at least one item to split');
      return;
    }

    if (selectedParticipants.length === 0) {
      setError('Please select at least one participant');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const selectedItemsData = items.filter(item => selectedItems.has(item.id));
      const participantNames = selectedParticipants.map(id => {
        const diner = sessionDiners.find(d => d.id === id);
        return diner ? diner.name : `Participant ${id}`;
      });

      // Process each selected item using the splits service API
      for (const item of selectedItemsData) {
        // CRITICAL FIX: Always recalculate original price from current item data
        // Don't use stored originalPrice as it might be from old split bills
        const originalPrice = item.price * item.quantity;
        
        // Debug logging removed for production security

        // Create split bill via API
        const splitResponse = await fetch('/api/splits/service', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sessionId,
            menuItemId: item.menu_item_id,
            originalPrice: originalPrice,
            splitCount: selectedParticipants.length,
            participants: participantNames
          }),
        });

        if (!splitResponse.ok) {
          const errorData = await splitResponse.json();
          throw new Error(errorData.error || 'Failed to create split bill');
        }

        const splitResult = await splitResponse.json();
        // Debug logging removed for production security
      }

      // Reload cart items to get updated split bill data
      // Debug logging removed for production security
      await loadCartItems();

      // Navigate back to cart review
      // CRITICAL FIX: Preserve diner name in navigation to maintain user isolation
      const dinerNameParam = state.dinerName ? `&dinerName=${encodeURIComponent(state.dinerName)}` : '';
      router.push(`/cart-review?sessionId=${sessionId}${dinerNameParam}`);
    } catch (error) {
      const appError = handleError(error, {
        operation: 'Save Split Bill',
        sessionId
      });
      setError(appError.message);
    } finally {
      setIsLoading(false);
    }
  };

  const { totalAmount, perPerson } = calculateSplitAmounts();

  // Debug logging
  // Debug logging removed for production security

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00d9ff] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading split bill options...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-50 flex flex-col">
      <div className="max-w-[480px] mx-auto bg-white h-full flex flex-col">
        {/* Header */}
        <div className="sticky top-0 border-b px-4 py-4 z-10" style={{ backgroundColor: '#00d9ff', borderColor: '#00d9ff' }}>
          <div className="flex items-center">
            <Link 
              href={`/cart-review?sessionId=${sessionId}${state.dinerName ? `&dinerName=${encodeURIComponent(state.dinerName)}` : ''}`}
              className="flex items-center justify-center w-10 h-10 rounded-full hover:opacity-80 transition-colors"
              style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </Link>
            <h1 className="text-lg font-semibold text-white ml-4 text-center flex-1">Split with Others</h1>
          </div>
        </div>

        {/* Content - scrollable area */}
        <div className="flex-1 overflow-y-auto pb-20">
          <div className="px-4 py-6 space-y-6">
          {/* Item being split */}
          <div className="bg-white rounded-lg shadow-sm p-4 border-2" style={{ borderColor: '#00d9ff' }}>
            {selectedItems.size > 0 ? (
              <>
                {Array.from(selectedItems).map((itemId) => {
                  const item = items.find(i => i.id === itemId);
                  if (!item) {
                    // Debug logging removed for production security
                    return null;
                  }
                  return (
                    <div key={item.id}>
                      <h2 className="text-lg font-semibold text-gray-900 mb-2">{item.name}</h2>
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border" style={{ borderColor: '#00d9ff' }}>
                        <div className="flex items-center space-x-3">
                          <button
                            onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                            className="w-8 h-8 rounded-full text-white flex items-center justify-center hover:opacity-80 transition-colors"
                            style={{ backgroundColor: '#00d9ff' }}
                          >
                            <span className="font-medium">-</span>
                          </button>
                          <span className="w-8 text-center font-medium text-gray-900">{item.quantity}</span>
                          <button
                            onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                            className="w-8 h-8 rounded-full text-white flex items-center justify-center hover:opacity-80 transition-colors"
                            style={{ backgroundColor: '#00d9ff' }}
                          >
                            <span className="font-medium">+</span>
                          </button>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold" style={{ color: '#00d9ff' }}>P{(item.price * item.quantity).toFixed(2)}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </>
            ) : (
              <div className="text-center py-4">
                <p className="text-gray-500 mb-2">No items selected for splitting</p>
                <p className="text-xs text-gray-400">
                  Debug: selectedItems={selectedItems.size}, items={items.length}, itemId={itemId}
                </p>
              </div>
            )}
            <p className="text-sm text-gray-600 mt-3">"Select who will share this item. The cost will be split equally."</p>
          </div>

          {/* Participants Selection */}
          <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Who's sharing?</h2>
                <p className="text-xs text-gray-500 mt-1">
              You are permanently selected as the initiator. Add or remove other participants below.
                </p>
              </div>
              <button
                onClick={toggleSelectAll}
                className="text-sm px-3 py-1 rounded-lg hover:opacity-80 transition-colors"
                style={{ backgroundColor: '#f0fdff', color: '#00d9ff' }}
              >
                {selectedParticipants.length === sessionDiners.length ? 'Deselect all' : 'Select all'}
              </button>
            </div>

            <div className="space-y-3">
              {sessionDiners.map((diner) => {
                const currentDiner = state.dinerName;
                const isCurrentUser = diner.name === currentDiner;
                const isSelected = selectedParticipants.includes(diner.id);
                
                return (
                  <div 
                    key={diner.id} 
                    className={`flex items-center space-x-3 p-3 border-2 rounded-lg ${
                      isCurrentUser 
                        ? 'bg-green-50 border-green-300' 
                        : 'border-gray-200'
                    }`}
                    style={{ borderColor: isCurrentUser ? '#10b981' : '#00d9ff' }}
                  >
                    <div className="flex items-center space-x-3 flex-1">
                      <div className={`w-10 h-10 rounded-full ${getAvatarColor(diner.name)} flex items-center justify-center text-white font-semibold text-sm`}>
                        {getInitials(diner.name)}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">
                          {diner.name}
                          {isCurrentUser && (
                            <span className="ml-2 text-xs px-2 py-1 rounded-full bg-green-100 text-green-800 font-medium">
                              You
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    {isCurrentUser ? (
                      <div className="flex items-center justify-center w-6 h-6 rounded border-2 bg-green-100" style={{ borderColor: '#10b981' }}>
                        <Check className="w-4 h-4" style={{ color: '#10b981' }} />
                      </div>
                    ) : (
                      <button
                        onClick={() => toggleParticipant(diner.id)}
                        className="flex items-center justify-center w-6 h-6 rounded border-2 hover:opacity-80 transition-colors"
                        style={{ borderColor: '#00d9ff' }}
                      >
                        {isSelected ? (
                          <Check className="w-4 h-4" style={{ color: '#00d9ff' }} />
                        ) : (
                          <div className="w-4 h-4"></div>
                        )}
                      </button>
                    )}
                    {diner.id.startsWith('custom_') && (
                      <button
                        onClick={() => removeCustomParticipant(diner.id)}
                        className="text-red-500 hover:text-red-700 transition-colors ml-2"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Split Calculation - separate section for better visibility */}
          {selectedItems.size > 0 && selectedParticipants.length > 0 ? (
            <div className="rounded-lg p-4 border-2" style={{ backgroundColor: '#f0fdff', borderColor: '#00d9ff' }}>
              <div className="text-center">
                <p className="text-lg font-semibold" style={{ color: '#00d9ff' }}>
                  Split {selectedParticipants.length} ways: P{perPerson.toFixed(2)} per person
                </p>
                <p className="text-sm mt-1" style={{ color: '#00d9ff' }}>
                  Total: P{totalAmount.toFixed(2)} ÷ {selectedParticipants.length} people
                </p>
                <p className="text-xs mt-2 italic" style={{ color: '#00d9ff' }}>
                  💡 Adjust quantity above to see split update in real-time
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 rounded-lg p-4 border-2 border-gray-200">
              <div className="text-center">
                <p className="text-gray-500 mb-2">Split calculation will appear here</p>
                <p className="text-xs text-gray-400">
                  Debug: selectedItems={selectedItems.size}, selectedParticipants={selectedParticipants.length}
                </p>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

            {/* Action Button */}
            <div className="pt-6 pb-4">
              <button
                onClick={handleSaveSplit}
                disabled={isLoading || selectedItems.size === 0 || selectedParticipants.length === 0}
                className={`w-full py-4 px-4 rounded-lg font-semibold text-lg transition-colors ${
                  isLoading || selectedItems.size === 0 || selectedParticipants.length === 0
                    ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                    : 'text-white hover:opacity-80'
                }`}
                style={{ 
                  backgroundColor: isLoading || selectedItems.size === 0 || selectedParticipants.length === 0 
                    ? undefined 
                    : '#00d9ff' 
                }}
              >
                {isLoading ? 'Saving Split...' : `Add Shared Item (${selectedParticipants.length} people)`}
              </button>
            </div>
          </div>
        </div>

        {/* Global Navigation Bar - fixed at bottom */}
        <div className="flex-shrink-0">
          <GlobalNavigation sessionId={sessionId} />
        </div>
      </div>
    </div>
  );
}

function SplitBillPageContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('sessionId');
  const itemId = searchParams.get('itemId');
  const dinerName = searchParams.get('dinerName'); // CRITICAL FIX: Extract diner name from URL

  if (!sessionId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Invalid Request</h1>
          <p className="text-gray-600 mb-4">Session ID is required</p>
          <Link href="/" className="text-[#00d9ff] hover:underline">
            Return to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <CartProvider sessionId={sessionId} dinerName={dinerName || undefined}>
      <SplitBillContent sessionId={sessionId} itemId={itemId || undefined} />
    </CartProvider>
  );
}

export default function SplitBillPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Loading...</h1>
          <p className="text-gray-600">Preparing split bill page...</p>
        </div>
      </div>
    }>
      <SplitBillPageContent />
    </Suspense>
  );
}