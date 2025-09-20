import { useState, useEffect, useCallback } from 'react';

// Debounced quantity updater to handle rapid clicks
export const useDebouncedQuantityUpdate = (dispatch: any, updateQuantityAPI: any, delay = 150) => {
  const [pendingUpdates, setPendingUpdates] = useState(new Map<string, number>());

  useEffect(() => {
    if (pendingUpdates.size === 0) return;

    const timeoutId = setTimeout(async () => {
      console.log('⏰ Processing debounced updates:', Array.from(pendingUpdates.entries()));
      
      for (const [itemId, totalChange] of pendingUpdates) {
        if (totalChange !== 0) {
          // Update frontend state immediately
          dispatch({
            type: 'INCREMENT_QUANTITY',
            payload: { id: itemId, change: totalChange }
          });
          
          // Make backend API call
          try {
            await updateQuantityAPI(itemId, totalChange);
            console.log('✅ Backend API updated for itemId:', itemId, 'change:', totalChange);
          } catch (error) {
            console.error('❌ Backend API update failed for itemId:', itemId, 'change:', totalChange, error);
          }
        }
      }
      
      setPendingUpdates(new Map());
    }, delay);

    return () => clearTimeout(timeoutId);
  }, [pendingUpdates, dispatch, updateQuantityAPI, delay]);

  const debouncedUpdate = useCallback((itemId: string, change: number) => {
    setPendingUpdates(prev => {
      const newMap = new Map(prev);
      const currentPending = newMap.get(itemId) || 0;
      const newTotal = currentPending + change;
      newMap.set(itemId, newTotal);
      console.log(`⏳ Queued update for ${itemId}: ${currentPending} + ${change} = ${newTotal}`);
      return newMap;
    });
  }, []);

  return debouncedUpdate;
};
