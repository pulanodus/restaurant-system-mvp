'use client';

import { useState } from 'react';
import { Trash2 } from 'lucide-react';

interface ClearCartButtonProps {
  sessionId: string;
  variant?: 'default' | 'subtle';
  className?: string;
}

export default function ClearCartButton({ 
  sessionId, 
  variant = 'default',
  className = ''
}: ClearCartButtonProps) {
  const [isClearing, setIsClearing] = useState(false);

  const handleClearCart = async () => {
    if (!confirm('Clear all orders for this session? This will remove all items from the cart.')) {
      return;
    }

    setIsClearing(true);
    try {
      const response = await fetch('/api/cart/cleanup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId })
      });

      if (response.ok) {
        alert('Orders cleared! Please refresh the page to see the changes.');
        window.location.reload();
      } else {
        const errorData = await response.json();
        alert(`Failed to clear orders: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error clearing cart:', error);
      alert('Error clearing orders. Please try again.');
    } finally {
      setIsClearing(false);
    }
  };

  if (variant === 'subtle') {
    return (
      <button
        onClick={handleClearCart}
        disabled={isClearing}
        className={`inline-flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
        title="Clear all items from cart"
      >
        <Trash2 className="w-3.5 h-3.5" />
        {isClearing ? 'Clearing...' : 'Clear Cart'}
      </button>
    );
  }

  return (
    <button
      onClick={handleClearCart}
      disabled={isClearing}
      className={`inline-flex items-center gap-2 px-3 py-2 bg-red-500 text-white text-sm font-medium rounded-lg hover:bg-red-600 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      <Trash2 className="w-4 h-4" />
      {isClearing ? 'Clearing...' : 'Clear All'}
    </button>
  );
}
