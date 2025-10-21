'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { triggerCleanupOnUserAction } from '@/lib/auto-cleanup';

interface PinEntryFormProps {
  tableId: string;
  currentPin: string;
}

export default function PinEntryForm({ tableId, currentPin }: PinEntryFormProps) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  // Debug logging for props and Supabase client
  // Debug logging removed for production security
  
  // Debug logging removed for production security

  const handlePinChange = async (value: string) => {
    setPin(value);
    
    // Auto-submit when 4 digits are entered
    if (value.length === 4) {
      // Trigger auto-cleanup when user enters PIN
      // This helps clean up stale users before they try to log in
      triggerCleanupOnUserAction('pin_entry');
      
      setIsLoading(true);
      setError(null);

      // 1. Verify the PIN
      if (value !== currentPin) {
        setError('Invalid PIN. Please check with your server.');
        setIsLoading(false);
        return;
      }

      // 2. PIN is correct. Now, either join or create a session.
      try {
        // CRITICAL FIX: Always check for existing active session first
        // Debug logging removed for production security
        // Debug logging removed for production security
        
        if (!tableId || typeof tableId !== 'string' || tableId.trim().length === 0) {
          throw new Error('Invalid table ID provided');
        }

        // Check if tableId is a UUID format or table number
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(tableId.trim());
        // Debug logging removed for production security

        // Test Supabase connection first
        // Debug logging removed for production security
        try {
          const testQuery = await supabase.from('tables').select('count').limit(1);
          // Debug logging removed for production security
        } catch (testError) {
          console.error('🔍 PinEntryForm - Supabase test query failed:', testError);
        }

        let existingActiveSession = null;

        try {
          if (isUUID) {
            // Direct table_id lookup (UUID)
            // Debug logging removed for production security
            // First try to get a single session
            let result = await supabase
              .from('sessions')
              .select('id, started_by_name, diners')
              .eq('table_id', tableId.trim())
              .eq('status', 'active')
              .maybeSingle();
            
            // If maybeSingle fails with multiple rows, get the most recent one
            if (result.error && result.error.message?.includes('multiple')) {
              // Debug logging removed for production security
              result = await supabase
                .from('sessions')
                .select('id, started_by_name, diners')
                .eq('table_id', tableId.trim())
                .eq('status', 'active')
                .order('created_at', { ascending: false })
                .limit(1)
                .single();
            }
            
            // Debug logging removed for production security
            
            existingActiveSession = result.data;
            
            if (result.error) {
              console.error('❌ Error in session lookup:', result.error);
              throw new Error(`Database error: ${result.error.message || 'Unknown error'}`);
            }
          } else {
            // Table number lookup - need to find the table first
            // Debug logging removed for production security
            
            const { data: table, error: tableError } = await supabase
              .from('tables')
              .select('id')
              .eq('table_number', tableId.trim())
              .single();
            
            // Debug logging removed for production security
            
            if (tableError || !table) {
              throw new Error(`Table not found: ${tableId.trim()}`);
            }
            
            // First try to get a single session
            let result = await supabase
              .from('sessions')
              .select('id, started_by_name, diners')
              .eq('table_id', table.id)
              .eq('status', 'active')
              .maybeSingle();
            
            // If maybeSingle fails with multiple rows, get the most recent one
            if (result.error && result.error.message?.includes('multiple')) {
              // Debug logging removed for production security
              result = await supabase
                .from('sessions')
                .select('id, started_by_name, diners')
                .eq('table_id', table.id)
                .eq('status', 'active')
                .order('created_at', { ascending: false })
                .limit(1)
                .single();
            }
            
            // Debug logging removed for production security
            
            existingActiveSession = result.data;
            
            if (result.error) {
              console.error('❌ Error in session lookup by table ID:', result.error);
              throw new Error(`Database error: ${result.error.message || 'Unknown error'}`);
            }
          }
        } catch (sessionLookupError) {
          console.error('❌ Session lookup failed:', sessionLookupError);
          throw new Error(`Failed to check for existing session: ${sessionLookupError instanceof Error ? sessionLookupError.message : 'Unknown error'}`);
        }

        let targetSessionId;
        let isNewSession = false;

        if (existingActiveSession) {
          // Join existing active session
          targetSessionId = existingActiveSession.id;
          isNewSession = false;
          // Debug logging removed for production security
          // Debug logging removed for production security
        } else {
          // Create new session
          // Debug logging removed for production security
          
          let actualTableId = tableId.trim();
          
          // If tableId is not a UUID, we need to get the actual table ID
          if (!isUUID) {
            const { data: table, error: tableError } = await supabase
              .from('tables')
              .select('id')
              .eq('table_number', tableId.trim())
              .single();
            
            if (tableError || !table) {
              throw new Error(`Table not found for session creation: ${tableId.trim()}`);
            }
            
            actualTableId = table.id;
            // Debug logging removed for production security
          }
          
          // Debug logging removed for production security
          
          // Verify table exists before creating session
          const { data: tableCheck, error: tableCheckError } = await supabase
            .from('tables')
            .select('id, table_number')
            .eq('id', actualTableId)
            .single();
          
          if (tableCheckError || !tableCheck) {
            throw new Error(`Table validation failed: ${tableCheckError?.message || 'Table not found'}`);
          }
          
          // Debug logging removed for production security
          
          const { data: newSession, error: sessionError } = await supabase
            .from('sessions')
            .insert([{ 
              table_id: actualTableId,
              status: 'active'
            }])
            .select()
            .single();

          // Debug logging removed for production security

          if (sessionError) {
            console.error('❌ Error creating new session:', sessionError);
            throw new Error(`Failed to create new session: ${sessionError.message || 'Unknown error'}`);
          }
          
          if (!newSession || !newSession.id) {
            throw new Error('Session creation failed: No session data returned');
          }
          
          targetSessionId = newSession.id;
          isNewSession = true;
          
          // Update table status to occupied
          const { error: tableUpdateError } = await supabase
            .from('tables')
            .update({ occupied: true })
            .eq('id', actualTableId);
          
          if (tableUpdateError) {
            console.warn('⚠️ Failed to update table status:', tableUpdateError);
            // Don't fail the whole operation for this
          }
          
          // Debug logging removed for production security
        }

        // 3. Redirect to name entry page instead of directly to menu
        router.push(`/scan/${tableId}?step=name&sessionId=${targetSessionId}&isNew=${isNewSession}`);
      } catch (error) {
        console.error('❌ PinEntryForm - Error in handlePinChange:', error);
        
        // Handle different types of errors
        let errorMessage = 'An unexpected error occurred';
        
        if (error instanceof Error) {
          errorMessage = error.message;
        } else if (typeof error === 'string') {
          errorMessage = error;
        } else if (error && typeof error === 'object') {
          // Try to extract message from various error formats
          errorMessage = (error as any).message || (error as any).error || JSON.stringify(error);
        }
        
        console.error('❌ PinEntryForm - Processed error message:', errorMessage);
        setError(errorMessage);
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="pin" className="block text-sm font-medium text-gray-700 mb-2">
          Enter Table PIN
        </label>
        <input
          type="text"
          id="pin"
          value={pin}
          onChange={(e) => handlePinChange(e.target.value)}
          placeholder="0000"
          maxLength={4}
          className="w-full px-4 py-3 text-center text-2xl font-mono border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00d9ff] focus:border-transparent bg-white text-gray-900"
          disabled={isLoading}
        />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 text-sm font-medium">{error}</p>
        </div>
      )}

      {isLoading && (
        <div className="text-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#00d9ff] mx-auto"></div>
          <p className="text-sm text-gray-700 mt-2 font-medium">Processing...</p>
        </div>
      )}
    </div>
  );
}