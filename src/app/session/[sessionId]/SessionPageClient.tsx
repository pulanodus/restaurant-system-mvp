'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import MenuDisplay from '@/app/components/MenuDisplay';
import PinCopyButton from '@/app/components/PinCopyButton';
import GlobalNavigation from '@/app/components/GlobalNavigation';
import { heroBannerPlaceholder } from '@/lib/placeholder-images';
import { generateFoodImage } from '@/lib/ai-images';
import { CartProvider, useCart } from '@/contexts/CartContext';
import { supabase } from '@/lib/supabase';
import { triggerCleanupOnUserAction } from '@/lib/auto-cleanup';
import PaymentNotificationListener from '@/app/components/PaymentNotificationListener';

interface SessionData {
  id: string;
  started_by_name: string;
  diners?: Array<{ 
    id: string; 
    name: string; 
    isActive?: boolean; 
    lastActive?: string; 
  }>;
  tables: {
    table_number: string;
    current_pin: string;
  };
}

interface MenuCategories {
  [key: string]: Array<{
    id: string;
    name: string;
    price: number;
    category: string;
    description: string;
    rating?: number;
    preparation_time?: string;
  }>;
}

interface SessionPageClientProps {
  session: SessionData;
  categories: MenuCategories;
  restaurantName?: string;
}

function SessionContent({ session, categories, restaurantName }: SessionPageClientProps) {
  const { state, setDinerName, clearCart } = useCart();
  const searchParams = useSearchParams();
  const router = useRouter();
  const dinerNameFromUrl = searchParams.get('dinerName');
  
  // CRITICAL FIX: Use ref to maintain stable user reference
  const currentDinerRef = useRef<string | null>(dinerNameFromUrl);

  // CRITICAL FIX: Update ref whenever diner name changes and add debugging
  useEffect(() => {
    if (state.dinerName) {
      currentDinerRef.current = state.dinerName;
      console.log('🔍 USER STATE DEBUG - Updated currentDinerRef to:', state.dinerName);
    }
    if (dinerNameFromUrl) {
      currentDinerRef.current = dinerNameFromUrl;
      console.log('🔍 USER STATE DEBUG - Updated currentDinerRef from URL to:', dinerNameFromUrl);
    }
    
    console.log('🔍 USER STATE DEBUG - Current state:', {
      stateDinerName: state.dinerName,
      dinerNameFromUrl: dinerNameFromUrl,
      currentDinerRef: currentDinerRef.current,
      sessionId: session.id
    });
  }, [state.dinerName, dinerNameFromUrl, session.id]);

  // Set the diner name when the component mounts
  React.useEffect(() => {
    console.log('🔍 SessionPageClient - dinerNameFromUrl:', dinerNameFromUrl);
    console.log('🔍 SessionPageClient - current state.dinerName:', state.dinerName);
    console.log('🔍 SessionPageClient - session.started_by_name:', session.started_by_name);
    console.log('🔍 SessionPageClient - session.diners:', session.diners);
    
    // CRITICAL FIX: Only use dinerName from URL, never fallback to session starter
    // This ensures each diner has their own individual cart
    if (dinerNameFromUrl && !state.dinerName) {
      console.log('🔍 Setting diner name from URL:', dinerNameFromUrl);
      setDinerName(dinerNameFromUrl);
    } else if (dinerNameFromUrl && state.dinerName && state.dinerName !== dinerNameFromUrl) {
      // If URL has a different diner name than current state, update it
      console.log('🔍 Switching diner name from', state.dinerName, 'to', dinerNameFromUrl);
      setDinerName(dinerNameFromUrl);
    }
    
    // CRITICAL FIX: Never fallback to session starter (waitstaff) for user sessions
    // This was causing the system to show "Thando" instead of individual user names
    if (!dinerNameFromUrl && !state.dinerName) {
      console.log('⚠️ No diner name available - redirecting to name entry flow');
      // Redirect to name entry flow to establish user identity
      window.location.href = `/scan/${session.tables?.table_number || 'unknown'}?step=name&sessionId=${session.id}&isNew=false`;
      return;
    }
  }, [dinerNameFromUrl, session.started_by_name, session.diners, state.dinerName, setDinerName]);

  const handleLogout = async () => {
    if (confirm('Are you sure you want to logout? Everything will remain exactly as you left it when you return.')) {
      try {
        // CRITICAL FIX: Determine the correct user to logout using multiple fallbacks
        const userToLogout = state.dinerName || currentDinerRef.current || dinerNameFromUrl;
        
        console.log('🚪 LOGOUT DEBUG - All user references:');
        console.log('  - dinerName state:', state.dinerName);
        console.log('  - currentDinerRef:', currentDinerRef.current);
        console.log('  - dinerNameFromUrl:', dinerNameFromUrl);
        console.log('  - userToLogout (final):', userToLogout);
        
        if (!userToLogout) {
          console.error('❌ LOGOUT DEBUG - No user found for logout');
          console.log('🔍 LOGOUT DEBUG - Redirecting to name entry flow...');
          // Redirect to name entry flow to re-establish user identity
          window.location.href = `/scan/${session.tables?.table_number || 'unknown'}?step=name&sessionId=${session.id}&isNew=false`;
          return;
        }
        
        if (!session?.id) {
          console.error('❌ LOGOUT DEBUG - No session ID available');
          alert('Error: No session ID available for logout');
          return;
        }
        
        // Fetch current session data to ensure we have the latest diners array
        console.log('🔍 LOGOUT DEBUG - Fetching current session data...');
        const { data: currentSession, error: fetchError } = await supabase
          .from('sessions')
          .select('diners')
          .eq('id', session.id)
          .single();
        
        if (fetchError) {
          console.error('❌ LOGOUT DEBUG - Could not fetch session:', fetchError);
          alert(`Error: Could not fetch session data - ${fetchError.message}`);
          return;
        }
        
        if (!currentSession || !currentSession.diners) {
          console.error('❌ LOGOUT DEBUG - No diners data in current session');
          alert('Error: No diners data found in session');
          return;
        }
        
        console.log('🔍 LOGOUT DEBUG - Current session diners:', currentSession.diners);
        console.log('🔍 LOGOUT DEBUG - User to logout:', userToLogout);
        
        // CRITICAL FIX: Parse diners if it's a string (JSON)
        let dinersArray = currentSession.diners;
        if (typeof dinersArray === 'string') {
          try {
            dinersArray = JSON.parse(dinersArray);
            console.log('🔍 LOGOUT DEBUG - Parsed diners from JSON string:', dinersArray);
          } catch (parseError) {
            console.error('❌ LOGOUT DEBUG - Failed to parse diners JSON:', parseError);
            alert('Error: Invalid session data format');
            return;
          }
        }
        
        // Find the user to logout with robust comparison
        console.log('👥 All diners in session:', dinersArray.map((d: any) => d.name || d));
        const userToUpdate = dinersArray.find((diner: any) => {
          // Handle different data structures
          const dinerName = typeof diner === 'string' ? diner : (diner.name || diner);
          const normalizedDinerName = String(dinerName).trim().toLowerCase();
          const normalizedUserToLogout = String(userToLogout).trim().toLowerCase();
          
          console.log(`  Checking: "${dinerName}" vs "${userToLogout}"`);
          console.log(`  Normalized: "${normalizedDinerName}" vs "${normalizedUserToLogout}"`);
          console.log(`  Match: ${normalizedDinerName === normalizedUserToLogout}`);
          
          return normalizedDinerName === normalizedUserToLogout;
        });
        
        if (!userToUpdate) {
          console.error('❌ LOGOUT DEBUG - User not found in diners list:', userToLogout);
          console.log('Available users:', dinersArray.map((d: any) => d.name || d));
          alert(`Error: User "${userToLogout}" not found in session`);
          return;
        }
        
        console.log('✅ Found match! Marking', userToUpdate.name || userToUpdate, 'as inactive');
        
        // Update the diners array
        const updatedDiners = dinersArray.map((diner: any) => {
          const dinerName = typeof diner === 'string' ? diner : (diner.name || diner);
          const normalizedDinerName = String(dinerName).trim().toLowerCase();
          const normalizedUserToLogout = String(userToLogout).trim().toLowerCase();
          
          if (normalizedDinerName === normalizedUserToLogout) {
            console.log('🔍 LOGOUT DEBUG - Updating diner:', dinerName);
            // Preserve the original structure
            if (typeof diner === 'string') {
              // If it was a string, return an object with the name
              return {
                name: diner,
                isActive: false,
                lastActive: new Date().toISOString(),
                logoutTime: new Date().toISOString()
              };
            } else {
              // If it was already an object, update it
              return {
                ...diner,
                isActive: false,
                lastActive: new Date().toISOString(),
                logoutTime: new Date().toISOString()
              };
            }
          }
          return diner;
        });
        
        console.log('🔍 LOGOUT DEBUG - Updated diners array:', updatedDiners);
        
        // Update the database
        const { data: updateData, error: updateError } = await supabase
          .from('sessions')
          .update({ diners: updatedDiners })
          .eq('id', session.id)
          .select('diners');
        
        if (updateError) {
          console.error('❌ LOGOUT DEBUG - Error updating diners:', updateError);
          alert(`Error: Failed to update user status - ${updateError.message}`);
          return;
        }
        
        console.log('✅ LOGOUT DEBUG - User marked as inactive:', userToLogout);
        console.log('🔍 LOGOUT DEBUG - Database update result:', updateData);
        
        // Verify the update
        const { data: verifyData, error: verifyError } = await supabase
          .from('sessions')
          .select('diners')
          .eq('id', session.id)
          .single();
        
        if (verifyError) {
          console.error('❌ LOGOUT DEBUG - Error verifying logout:', verifyError);
        } else {
          console.log('🔍 LOGOUT DEBUG - Verification - diners after logout:', verifyData.diners);
          
          // Check if the user was actually marked as inactive
          let verifiedDiners = verifyData.diners;
          if (typeof verifiedDiners === 'string') {
            try {
              verifiedDiners = JSON.parse(verifiedDiners);
            } catch (e) {
              console.error('❌ LOGOUT DEBUG - Failed to parse verification data:', e);
            }
          }
          
          const loggedOutUser = verifiedDiners.find((d: any) => {
            const dinerName = typeof d === 'string' ? d : (d.name || d);
            return String(dinerName).trim().toLowerCase() === String(userToLogout).trim().toLowerCase();
          });
          
          if (loggedOutUser) {
            const isActive = typeof loggedOutUser === 'string' ? false : loggedOutUser.isActive;
            console.log('🔍 LOGOUT DEBUG - Logged out user status:', {
              name: typeof loggedOutUser === 'string' ? loggedOutUser : loggedOutUser.name,
              isActive: isActive,
              type: typeof loggedOutUser
            });
            
            if (isActive === false) {
              console.log('✅ LOGOUT DEBUG - SUCCESS: User successfully marked as inactive');
            } else {
              console.error('❌ LOGOUT DEBUG - FAILURE: User is still marked as active after logout');
            }
          }
        }
        
              // Trigger auto-cleanup after successful logout
              // This helps clean up any other stale users in the system
              triggerCleanupOnUserAction('logout_success');
              
              // Navigate back to table scan
              const tableNumber = session.tables?.table_number;
              if (tableNumber) {
                router.push(`/scan/${tableNumber}`);
              } else {
                router.push('/');
              }
              
              console.log('✅ Logout successful, everything preserved exactly as left');
      } catch (error) {
        console.error('❌ Error during logout:', error);
        router.push('/');
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-[480px] mx-auto bg-white min-h-screen">
        <div className="bg-white rounded-xl shadow-sm p-4 mb-3">
          <h1 className="text-2xl font-bold text-center text-gray-800 mb-3">
            {restaurantName || 'Restaurant'}
          </h1>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-4 mb-3">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              <div className="font-medium">
                Table {session.tables?.table_number} • {state.dinerName || 'Loading...'}
              </div>
              {session.diners && session.diners.length > 1 && (
                <div className="mt-2 text-xs text-gray-500">
                  <span className="font-medium">All diners:</span>{' '}
                  {session.diners.map(diner => (
                    <span key={diner.id} className="inline-flex items-center mr-2">
                      <span 
                        className={`w-2 h-2 rounded-full mr-1 ${
                          diner.isActive ? 'bg-green-500' : 'bg-gray-400'
                        }`}
                        title={diner.isActive ? 'Active' : 'Inactive'}
                      ></span>
                      {diner.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center space-x-2">
              {session.tables?.current_pin && (
                <div className="flex items-center space-x-2">
                  <span className="text-lg font-bold font-mono px-3 py-2 rounded-lg border-2" style={{ color: '#00d9ff', backgroundColor: '#f0fdff', borderColor: '#00d9ff' }}>
                    {session.tables.current_pin}
                  </span>
                  <PinCopyButton pin={session.tables.current_pin} />
                </div>
              )}
              <button
                onClick={handleLogout}
                className="flex items-center space-x-1 px-3 py-2 text-sm text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                title="Logout - everything will remain exactly as you left it"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>

        <div className="relative mb-4 rounded-xl overflow-hidden shadow-sm">
          <div className="h-32 relative">
            <img 
              src={generateFoodImage('restaurant banner', { width: 1200, height: 400 })} 
              alt="Restaurant Special" 
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4 bg-black bg-opacity-30">
              <h2 className="text-white text-lg font-bold mb-1">Special Offer!</h2>
              <p className="text-white text-sm opacity-90">20% off all desserts today</p>
            </div>
          </div>
        </div>
        
        <div className="px-4 pb-20">
          <MenuDisplay 
            categories={Object.fromEntries(
              Object.entries(categories).map(([category, items]) => [
                category,
                items.map(item => ({
                  ...item,
                  rating: item.rating ?? undefined,
                  preparation_time: item.preparation_time ?? undefined
                }))
              ])
            )} 
            sessionId={session.id} 
          />
        </div>

        <GlobalNavigation sessionId={session.id} />
        
        {/* Payment notification listener for table payments */}
        <PaymentNotificationListener sessionId={session.id} />
      </div>
    </div>
  );
}

export default function SessionPageClient({ session, categories, restaurantName }: SessionPageClientProps) {
  // Extract diner name from URL parameters
  const searchParams = useSearchParams();
  const dinerNameFromUrl = searchParams.get('dinerName');
  
  return (
    <CartProvider sessionId={session.id} dinerName={dinerNameFromUrl || undefined}>
      <SessionContent 
        session={session} 
        categories={categories} 
        restaurantName={restaurantName} 
      />
    </CartProvider>
  );
}
