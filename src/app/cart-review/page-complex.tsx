'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useCart } from '@/contexts/CartContextSimple';
import { ArrowLeft, Edit3, Users } from 'lucide-react';
import ClearCartButton from '@/app/components/ClearCartButton';

interface CartItem {
  id: string;
  menu_item_id: string;
  name: string;
  price: number;
  quantity: number;
  notes?: string | undefined;
  isShared?: boolean | undefined;
  isTakeaway?: boolean | undefined;
  splitCount?: number | undefined;
  sharedWith?: string[] | undefined;
  discountedPrice?: number | undefined;
  addedAt?: number;
  // Split bill properties
  splitBill?: boolean;
  isSplit?: boolean;
  splitPrice?: number;
  originalPrice?: number;
  userPrice?: number;
  totalPeople?: number;
  participants?: string[];
  splitDetails?: any;
}

function CartReviewContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams.get('sessionId');
  const { state, updateQuantity, removeItem, loadCartItems } = useCart();
  
  console.log('🔍 Cart review - sessionId:', sessionId);
  console.log('🔍 Cart review - cart state:', state);
  console.log('🔍 Cart review - cart items count:', state.items.length);

  // Load cart items when page loads
  useEffect(() => {
    console.log('🔄 Cart Review component mounted/updated');
    console.log('Session ID:', sessionId);
    console.log('Current cart items:', state.items?.map(item => ({
      id: item.id,
      name: item.name,
      isSplit: (item as any).isSplit,
      splitPrice: (item as any).splitPrice
    })));
    
    if (sessionId) {
      console.log('⚠️  About to load cart items - split data may be lost here');
      loadCartItems();
    }
  }, [sessionId, loadCartItems]);

  const handleQuantityChange = async (itemId: string, newQuantity: number) => {
    console.log('🔄 Cart review - handleQuantityChange called:', { itemId, newQuantity });
    
    if (newQuantity <= 0) {
      console.log('🔄 Cart review - Removing item:', itemId);
      await removeItem(itemId);
    } else {
      console.log('🔄 Cart review - Updating quantity:', { itemId, newQuantity });
      await updateQuantity(itemId, newQuantity);
    }
  };

  const handleEditSplit = (itemId: string) => {
    // Navigate to split bill page to edit split settings
    router.push(`/split-bill?sessionId=${sessionId}&itemId=${itemId}`);
  };

  // 🔍 SESSION STORAGE DIAGNOSTICS
  const checkSessionStorage = () => {
    console.log('💾 SESSION STORAGE CHECK:');
    console.log('Cart items in sessionStorage:', 
      JSON.parse(sessionStorage.getItem('cartItems') || 'null'));
    console.log('Split data in sessionStorage:', 
      JSON.parse(sessionStorage.getItem('allSplitData') || 'null'));
    console.log('All session keys:', Object.keys(sessionStorage));
  };

  // 🔍 QUICK DIAGNOSTIC RUNNER
  const runDiagnostics = () => {
    console.log('=== SPLIT STATE DIAGNOSTICS ===');
    checkSessionStorage();
    console.log('Current cart context items:', state.items);
    console.log('Items with split data:', state.items?.filter(item => (item as any).isSplit));
    console.log('============================');
  };

  // Run diagnostics on component mount
  useEffect(() => {
    runDiagnostics();
  }, []);

  // Process cart items with split bill data
  const processedCartItems = state.items.map(item => {
    // Get split data from sessionStorage
    const allSplitData = sessionStorage.getItem('allSplitData');
    let splitDataMap: { [key: string]: any } = {};
    if (allSplitData) {
      try {
        splitDataMap = JSON.parse(allSplitData);
      } catch (error) {
        console.error('Error parsing split data:', error);
      }
    }
    
    const itemSplitData = splitDataMap[item.menu_item_id];
    
    // 🔍 SPLIT BILL DEBUG: Track item processing
    if (item.isShared) {
      console.log('🔄 Split Item Processing:', {
        itemId: item.id,
        menuItemId: item.menu_item_id,
        itemName: item.name,
        isShared: item.isShared,
        hasSplitData: !!itemSplitData,
        splitData: itemSplitData,
        originalPrice: item.price
      });
    }
    
    // 🔍 PRICE DEBUG: Log all item prices for debugging
    console.log('💰 Item Price Debug:', {
      name: item.name,
      originalPrice: item.price,
      isShared: item.isShared,
      isSplit: (item as any).isSplit,  // ← Track split status
      splitPrice: (item as any).splitPrice,  // ← Track split price
      hasSplitData: !!itemSplitData,
      splitData: itemSplitData,
      // Additional debug info
      menu_item_id: item.menu_item_id,
      id: item.id,
      allItemProperties: Object.keys(item)
    });
    
    // Calculate split bill pricing
    let userPrice = item.price;
    let splitBill = false;
    let splitWith: string[] = [];
    let totalPeople = 1;
    
    // ✅ FIXED: Check if item is already split (from SPLIT_ITEM action)
    if ((item as any).isSplit && (item as any).splitPrice) {
      splitBill = true;
      userPrice = (item as any).splitPrice; // Use the stored split price
      splitWith = (item as any).splitDetails?.sharedWith || [];
      totalPeople = (item as any).splitDetails?.splitCount || 1;
      
      console.log('💰 Using Stored Split Price:', {
        itemName: item.name,
        originalPrice: (item as any).originalPrice,
        splitPrice: (item as any).splitPrice,
        userPrice: userPrice,
        isSplit: (item as any).isSplit
      });
    } else if (item.isShared && itemSplitData && itemSplitData.splitCount > 1) {
      // Fallback for legacy split data
      splitBill = true;
      splitWith = itemSplitData.sharedWith || [];
      totalPeople = itemSplitData.splitCount;
      userPrice = item.price / totalPeople; // User pays only their portion
      
      console.log('💰 Legacy Split Price Calculation:', {
        itemName: item.name,
        originalPrice: item.price,
        splitCount: totalPeople,
        userPrice: userPrice,
        splitData: itemSplitData
      });
    }
    
    return {
      ...item,
      price: userPrice, // Update price to user's portion for split bills
      splitCount: item.isShared ? (itemSplitData?.splitCount || 3) : undefined,
      sharedWith: item.isShared ? (Array.isArray(itemSplitData?.sharedWith) ? itemSplitData.sharedWith : ['Alice', 'Bob', 'Charlie']) : undefined,
      discountedPrice: item.isShared ? (itemSplitData?.discountedPrice || item.price / 3) : undefined,
      // Add split bill properties
      splitBill: splitBill,
      originalPrice: splitBill ? item.price : item.price,
      userPrice: userPrice,
      totalPeople: totalPeople
    };
  }).sort((a, b) => {
    // Sort by when items were added to cart
    const timeA = a.addedAt || 0;
    const timeB = b.addedAt || 0;
    return timeA - timeB;
  });

  // ✅ COMPREHENSIVE PRICE VALIDATION UTILITY
  const validateSplitPricing = (item: any) => {
    if (!item.isSplit) return { isValid: true, issues: [] };
    
    const issues = [];
    const originalPrice = parseFloat(item.originalPrice);
    const splitPrice = parseFloat(item.splitPrice);
    const quantity = parseInt(item.quantity);
    const splitCount = parseInt(item.splitCount);
    
    console.log('🔍 Price Validation Input:', {
      itemName: item.name,
      originalPrice,
      splitPrice,
      quantity,
      splitCount,
      participants: item.participants
    });
    
    // Validation checks
    const expectedSplitPrice = originalPrice / splitCount;
    const priceDifference = Math.abs(splitPrice - expectedSplitPrice);
    
    if (priceDifference > 0.01) {
      issues.push(`Split price mismatch: expected ${expectedSplitPrice.toFixed(2)}, got ${splitPrice.toFixed(2)} (difference: ${priceDifference.toFixed(2)})`);
    }
    
    if (originalPrice <= 0) {
      issues.push('Original price should be positive');
    }
    
    if (splitPrice <= 0) {
      issues.push('Split price should be positive');
    }
    
    if (splitCount <= 0) {
      issues.push('Split count should be positive');
    }
    
    if (quantity <= 0) {
      issues.push('Quantity should be positive');
    }
    
    // Additional validation: Check if original price makes sense
    const expectedOriginalPrice = (item.price || 0) * quantity;
    if (Math.abs(originalPrice - expectedOriginalPrice) > 0.01) {
      issues.push(`Original price seems wrong: expected ${expectedOriginalPrice} (${item.price} × ${quantity}), got ${originalPrice}`);
    }
    
    console.log('✅ Split Bill Validation Result:', {
      itemName: item.name,
      originalPrice,
      splitPrice,
      expectedSplitPrice,
      expectedOriginalPrice,
      quantity,
      splitCount,
      priceDifference,
      isValid: issues.length === 0,
      issues
    });
    
    return {
      isValid: issues.length === 0,
      issues
    };
  };

  // ✅ ENHANCED PRICING VALIDATION (matching your code structure)
  const validateSplitPricingEnhanced = (item: any) => {
    if (!item.isSplit) {
      return { isValid: true, message: 'Not a split item' };
    }
    
    const originalPrice = parseFloat(item.originalPrice);
    const splitPrice = parseFloat(item.splitPrice);
    const quantity = parseInt(item.quantity) || 1;
    const participantCount = item.splitCount || (item.participants ? item.participants.length : 1);
    
    // Calculate expected values
    const expectedSplitPrice = originalPrice / participantCount;
    const expectedOriginalFromSplit = splitPrice * participantCount;
    
    console.log('🔍 Enhanced Price Validation Debug:', {
      itemName: item.name,
      originalPrice: originalPrice,
      splitPrice: splitPrice,
      quantity: quantity,
      participantCount: participantCount,
      expectedSplitPrice: expectedSplitPrice.toFixed(2),
      expectedOriginalFromSplit: expectedOriginalFromSplit.toFixed(2),
      splitPriceMatch: Math.abs(splitPrice - expectedSplitPrice) < 0.01,
      originalPriceReasonable: originalPrice >= splitPrice,
      validation: {
        originalPriceIsPositive: originalPrice > 0,
        splitPriceIsPositive: splitPrice > 0,
        participantCountIsPositive: participantCount > 0,
        originalPriceGreaterThanSplit: originalPrice >= splitPrice,
        splitPriceMatchesCalculation: Math.abs(splitPrice - expectedSplitPrice) < 0.01
      }
    });
    
    // Validation checks
    if (Math.abs(splitPrice - expectedSplitPrice) > 0.01) {
      return {
        isValid: false,
        message: `Split price mismatch: expected ${expectedSplitPrice.toFixed(2)}, got ${splitPrice.toFixed(2)}`
      };
    }
    
    if (originalPrice < splitPrice) {
      return {
        isValid: false,
        message: `Original price (${originalPrice}) should be greater than or equal to split price (${splitPrice})`
      };
    }
    
    return {
      isValid: true,
      message: 'Split pricing is valid',
      details: {
        originalPrice: originalPrice,
        splitPrice: splitPrice,
        participantCount: participantCount
      }
    };
  };

  // ✅ COMPREHENSIVE DIAGNOSTIC FUNCTION
  const runSplitBillDiagnostics = () => {
    console.log('🔍 === SPLIT BILL DIAGNOSTICS ===');
    
    const splitItems = state.items.filter((item: any) => item.isSplit);
    console.log(`📊 Found ${splitItems.length} split items out of ${state.items.length} total items`);
    
    splitItems.forEach((item: any, index: number) => {
      console.log(`\n🔍 Split Item #${index + 1}: "${item.name}"`);
      
      const originalPrice = parseFloat(item.originalPrice || 0);
      const splitPrice = parseFloat(item.splitPrice || 0);
      const quantity = parseInt(item.quantity || 1);
      const splitCount = parseInt(item.splitCount || 1);
      const participants = item.participants || [];
      
      const expectedSplitPrice = originalPrice / splitCount;
      const expectedTotalPrice = splitPrice * splitCount;
      
      console.log('📊 Item Analysis:', {
        originalPrice: originalPrice,
        splitPrice: splitPrice,
        quantity: quantity,
        splitCount: splitCount,
        participants: participants,
        expectedSplitPrice: expectedSplitPrice,
        expectedTotalPrice: expectedTotalPrice,
        issues: []
      });
      
      // Check for issues
      const issues = [];
      if (Math.abs(splitPrice - expectedSplitPrice) > 0.01) {
        issues.push(`Split price mismatch: expected ₱${expectedSplitPrice.toFixed(2)}, got ₱${splitPrice.toFixed(2)}`);
      }
      if (originalPrice < splitPrice) {
        issues.push(`Original price (₱${originalPrice}) should be greater than or equal to split price (₱${splitPrice})`);
      }
      if (originalPrice <= 0) {
        issues.push(`Original price should be positive, got ${originalPrice}`);
      }
      
      if (issues.length > 0) {
        console.error('❌ Issues found:', issues);
      } else {
        console.log('✅ No issues found');
      }
    });
    
    const totals = calculateTotal(state.items);
    console.log('\n💰 Current Cart Totals:', totals);
    
    console.log('🔍 === DIAGNOSTICS COMPLETE ===');
  };

  // ✅ DEBUG FUNCTION TO IDENTIFY PRICING ISSUES
  const debugPricingIssue = (item: any) => {
    console.log('🚨 PRICING ISSUE DEBUG:', {
      itemName: item.name,
      isSplit: item.isSplit,
      rawData: {
        originalPrice: item.originalPrice,
        splitPrice: item.splitPrice,
        currentPrice: item.price,
        quantity: item.quantity,
        splitCount: item.splitCount,
        participants: item.participants
      },
      calculations: {
        expectedOriginalPrice: (item.price || 0) * item.quantity,
        expectedSplitPrice: item.originalPrice ? item.originalPrice / (item.splitCount || 1) : 0,
        actualSplitPrice: item.splitPrice
      },
      displayValues: {
        fullPriceDisplay: item.originalPrice,
        splitPriceDisplay: item.splitPrice,
        userShareDisplay: item.splitPrice
      }
    });
  };

  // Simple reset function
  const resetCartData = () => {
    sessionStorage.clear();
    window.location.reload();
  };

  // ✅ EXPOSE SIMPLE RESET FUNCTION
  useEffect(() => {
    (window as any).resetCartData = resetCartData;
    console.log('🔧 Reset function available: resetCartData()');
  }, []);

  // ✅ CLEAN PRICE CALCULATION FUNCTION
  const calculateItemPrice = (item: any) => {
    console.log('💰 Price Calculation Debug:', {
      name: item.name,
      isSplit: item.isSplit,
      originalPrice: item.originalPrice,
      splitPrice: item.splitPrice,
      currentPrice: item.price,
      quantity: item.quantity
    });
    
    // Debug pricing issues
    if (item.isSplit) {
      debugPricingIssue(item);
    }
    
    // Validate split pricing using enhanced validation
    if (item.isSplit) {
      const validation = validateSplitPricingEnhanced(item);
      if (!validation.isValid) {
        console.warn('⚠️ Enhanced split pricing validation failed:', validation.message);
      } else {
        console.log('✅ Enhanced split pricing validation passed:', validation.message);
      }
    }
    
    // ✅ For split items, use the split price for individual calculations
    // For regular items, use the original price
    if (item.isSplit && item.splitPrice) {
      return item.splitPrice;
    }
    
    return item.originalPrice || item.price;
  };

  // ✅ CLEAN TOTAL CALCULATION FUNCTION
  const calculateTotal = (items: any[]) => {
    const subtotal = items.reduce((sum: number, item: any) => {
      const itemPrice = calculateItemPrice(item);
      return sum + (itemPrice * item.quantity);
  }, 0);

    const vat = subtotal * 0.14;
  const total = subtotal + vat;
    
    console.log('💰 Total Calculation Debug:', {
      items: items.map((item: any) => ({
        name: item.name,
        price: calculateItemPrice(item),
        quantity: item.quantity,
        isSplit: item.isSplit
      })),
      subtotal,
      vat,
      total
    });
    
    return { subtotal, vat, total };
  };

  // Calculate totals using clean function
  const { subtotal, vat, total } = calculateTotal(processedCartItems);

  if (state.isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00d9ff] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your cart...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-[480px] mx-auto bg-white min-h-screen">
        {/* Header Section */}
        <div className="sticky top-0 bg-[#00d9ff] text-white px-4 py-4 z-10">
          <div className="flex items-center justify-between">
            <Link 
              href={`/session/${sessionId}`}
              className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-white hover:bg-opacity-20 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-lg font-semibold">Cart Review</h1>
            {sessionId && (
              <ClearCartButton 
                sessionId={sessionId} 
                variant="subtle" 
                className="text-white hover:text-white hover:bg-white hover:bg-opacity-20"
              />
            )}
          </div>
        </div>

        {/* Cart Items */}
        <div className="px-4 py-6 space-y-4">
          {processedCartItems.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-500 text-lg mb-4">Your cart is empty</div>
              <Link 
                href={`/session/${sessionId}`}
                className="text-[#00d9ff] hover:underline font-medium"
              >
                Browse Menu
              </Link>
            </div>
          ) : (
            processedCartItems.map((item, index) => (
              <div key={item.id} className="bg-white border border-gray-200 rounded-lg p-4">
                {/* Item Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="text-base font-semibold text-gray-900">
                      {item.name}
                      {(item as any).isSplit && (
                        <span className="text-sm text-blue-600 ml-2">(Split Bill)</span>
                      )}
                      {item.isShared && !(item as any).isSplit && (
                        <span className="text-sm text-gray-500 ml-2">(Shared)</span>
                      )}
                      {item.isTakeaway && (
                        <span className="text-sm text-gray-500 ml-2">(Takeaway)</span>
                      )}
                    </h3>
                    
                    {/* Cost price below item name - only show for non-split items */}
                    {!(item as any).isSplit && (
                      <div className="text-sm italic text-gray-500 mt-1">
                        P{item.price.toFixed(2)} each
                      </div>
                    )}
                    
                    {/* Split Bill Details */}
                    {(item as any).isSplit && (item as any).originalPrice && (
                      <div className="mt-2 space-y-1">
                        <div className="text-xs text-gray-800 italic">
                          <div>Full price P{(item as any).originalPrice.toFixed(2)}</div>
                          <div>Split {item.splitCount} ways with {Array.isArray((item as any).participants) ? (item as any).participants.join(', ') : ((item as any).participants || 'Unknown')}</div>
                        </div>
                      </div>
                    )}
                    
                    {/* Regular shared info */}
                    {item.isShared && !(item as any).isSplit && (
                      <div className="mt-2">
                        <div className="text-xs text-gray-800 italic">
                          <div>Full price P{(item.price * item.quantity).toFixed(2)}</div>
                          <div>Split with others</div>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Right side - Price and Quantity Controls */}
                  <div className="text-right">
                    {/* Item Total Price */}
                    <div className="text-lg font-bold text-gray-900 mb-2">
                      P{(calculateItemPrice(item) * item.quantity).toFixed(2)}
                    </div>
                    
                    {/* Quantity Controls */}
                    <div className="flex items-center justify-end space-x-1">
                      <button
                        onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                        className="w-8 h-8 flex items-center justify-center bg-[#00d9ff] text-white rounded-full hover:bg-[#00c4e6] transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-xs font-medium"
                      >
                        -
                      </button>
                      <span className="w-6 text-center font-medium text-gray-900 text-xs">{item.quantity}</span>
                      <button
                        onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                        className="w-8 h-8 flex items-center justify-center bg-[#00d9ff] text-white rounded-full hover:bg-[#00c4e6] transition-colors disabled:opacity-50 text-xs font-medium"
                      >
                        +
                      </button>
                    </div>
                    
                    {/* Edit Split Link - only for shared items */}
                    {item.isShared && (
                      <button
                        onClick={() => handleEditSplit(item.menu_item_id)}
                        className="text-[#00d9ff] text-sm font-medium hover:underline flex items-center space-x-1 mt-2 ml-auto"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>Edit Split</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Special Instructions */}
                {item.notes && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Notes:</span> {item.notes}
                    </p>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Order Summary Section */}
        {processedCartItems.length > 0 && (
          <div className="sticky bottom-0 bg-white border-t border-gray-200 px-4 py-4">
            <div className="space-y-4 mb-4">
              <div className="flex justify-between text-base font-bold">
                <span className="text-gray-900">Subtotal:</span>
                <span className="text-gray-900">P{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-base font-bold">
                <span className="text-gray-900">VAT (14%):</span>
                <span className="text-gray-900">P{vat.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xl font-bold border-t-2 border-gray-300 pt-4">
                <span className="text-gray-900">Total:</span>
                <span className="text-[#00d9ff]">P{total.toFixed(2)}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              {/* Live Bill Button */}
              <Link
                href={`/live-bill?sessionId=${sessionId}`}
                className="w-full bg-gray-100 text-gray-700 py-3 px-6 rounded-lg font-medium text-base hover:bg-gray-200 transition-colors flex items-center justify-center space-x-2"
              >
                <Users className="w-5 h-5" />
                <span>View Live Bill</span>
              </Link>
              
              {/* Confirm Order Button */}
              <button
                onClick={async () => {
                  try {
                    console.log('🍽️ Confirming orders from cart review...');
                    
                    // Call the orders confirmation API
                    const response = await fetch('/api/orders/confirm', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        sessionId: sessionId
                      })
                    });

                    if (!response.ok) {
                      const errorData = await response.json();
                      throw new Error(errorData.error || 'Failed to confirm orders');
                    }

                    const result = await response.json();
                    console.log('✅ Cart Review - Orders confirmed successfully:', result);
                    console.log('✅ Cart Review - Confirmed orders count:', result.confirmedOrders?.length || 0);
                    
                    // Small delay to ensure database consistency
                    await new Promise(resolve => setTimeout(resolve, 500));
                    
                    // Navigate to confirmation page with from parameter
                    router.push(`/order-confirmation?sessionId=${sessionId}&total=${total.toFixed(2)}`);
                  } catch (error) {
                    console.error('❌ Error confirming orders:', error);
                    alert(`Failed to confirm orders: ${error instanceof Error ? error.message : 'Unknown error'}`);
                  }
                }}
                className="w-full bg-[#00d9ff] text-white py-4 px-6 rounded-lg font-semibold text-lg hover:bg-[#00c4e6] transition-colors flex items-center justify-center space-x-2"
              >
                <span>Confirm Order</span>
                <span className="text-sm opacity-90">(P{total.toFixed(2)})</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function CartReviewPage() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('sessionId');

  if (!sessionId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Session Not Found</h1>
          <Link href="/" className="text-[#00d9ff] hover:underline">
            Return to Home
          </Link>
        </div>
      </div>
    );
  }

  return <CartReviewContent />;
}
