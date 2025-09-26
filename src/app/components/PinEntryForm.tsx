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
  console.log('🔍 PinEntryForm - Props received:', {
    tableId,
    tableIdType: typeof tableId,
    tableIdLength: tableId?.length,
    currentPin,
    currentPinType: typeof currentPin
  });
  
  console.log('🔍 PinEntryForm - Supabase client check:', {
    supabaseExists: !!supabase,
    supabaseType: typeof supabase,
    supabaseFrom: typeof supabase?.from
  });

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
        console.log('🔍 PinEntryForm - Checking for existing active session for table:', tableId);
        console.log('🔍 PinEntryForm - Table ID type:', typeof tableId, 'Length:', tableId?.length);
        
        if (!tableId || typeof tableId !== 'string' || tableId.trim().length === 0) {
          throw new Error('Invalid table ID provided');
        }

        // Check if tableId is a UUID format or table number
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(tableId.trim());
        console.log('🔍 PinEntryForm - Table ID analysis:', {
          tableId: tableId.trim(),
          isUUID,
          length: tableId.trim().length
        });

        // Test Supabase connection first
        console.log('🔍 PinEntryForm - Testing Supabase connection...');
        try {
          const testQuery = await supabase.from('tables').select('count').limit(1);
          console.log('🔍 PinEntryForm - Supabase test query result:', {
            data: testQuery.data,
            error: testQuery.error,
            errorExists: !!testQuery.error,
            errorType: typeof testQuery.error
          });
        } catch (testError) {
          console.error('🔍 PinEntryForm - Supabase test query failed:', testError);
        }

        let existingActiveSession = null;

        try {
          if (isUUID) {
            // Direct table_id lookup (UUID)
            console.log('🔍 PinEntryForm - Looking up session by table_id (UUID):', tableId.trim());
            // First try to get a single session
            let result = await supabase
              .from('sessions')
              .select('id, started_by_name, diners')
              .eq('table_id', tableId.trim())
              .eq('status', 'active')
              .maybeSingle();
            
            // If maybeSingle fails with multiple rows, get the most recent one
            if (result.error && result.error.message?.includes('multiple')) {
              console.log('🔍 PinEntryForm - Multiple sessions found, getting most recent');
              result = await supabase
                .from('sessions')
                .select('id, started_by_name, diners')
                .eq('table_id', tableId.trim())
                .eq('status', 'active')
                .order('created_at', { ascending: false })
                .limit(1)
                .single();
            }
            
            console.log('🔍 PinEntryForm - Session lookup result:', {
              data: result.data,
              error: result.error,
              errorExists: !!result.error
            });
            
            existingActiveSession = result.data;
            
            if (result.error) {
              console.error('❌ Error in session lookup:', result.error);
              throw new Error(`Database error: ${result.error.message || 'Unknown error'}`);
            }
          } else {
            // Table number lookup - need to find the table first
            console.log('🔍 PinEntryForm - Table ID is not UUID, treating as table number');
            
            const { data: table, error: tableError } = await supabase
              .from('tables')
              .select('id')
              .eq('table_number', tableId.trim())
              .single();
            
            console.log('🔍 PinEntryForm - Table lookup result:', {
              data: table,
              error: tableError,
              errorExists: !!tableError
            });
            
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
              console.log('🔍 PinEntryForm - Multiple sessions found, getting most recent');
              result = await supabase
                .from('sessions')
                .select('id, started_by_name, diners')
                .eq('table_id', table.id)
                .eq('status', 'active')
                .order('created_at', { ascending: false })
                .limit(1)
                .single();
            }
            
            console.log('🔍 PinEntryForm - Session lookup by table ID result:', {
              data: result.data,
              error: result.error,
              errorExists: !!result.error
            });
            
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
          console.log('✅ PinEntryForm - Found existing active session:', existingActiveSession.id);
          console.log('📋 Existing session diners:', existingActiveSession.diners);
        } else {
          // Create new session
          console.log('🆕 PinEntryForm - No existing session found, creating new one');
          
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
            console.log('🔍 PinEntryForm - Resolved table number to UUID:', actualTableId);
          }
          
          console.log('🔍 PinEntryForm - Creating session with table_id:', actualTableId);
          
          // Verify table exists before creating session
          const { data: tableCheck, error: tableCheckError } = await supabase
            .from('tables')
            .select('id, table_number')
            .eq('id', actualTableId)
            .single();
          
          if (tableCheckError || !tableCheck) {
            throw new Error(`Table validation failed: ${tableCheckError?.message || 'Table not found'}`);
          }
          
          console.log('🔍 PinEntryForm - Table validation successful:', tableCheck);
          
          const { data: newSession, error: sessionError } = await supabase
            .from('sessions')
            .insert([{ 
              table_id: actualTableId,
              status: 'active'
            }])
            .select()
            .single();

          console.log('🔍 PinEntryForm - Session creation result:', {
            data: newSession,
            error: sessionError,
            errorExists: !!sessionError
          });

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
          
          console.log('✅ PinEntryForm - Created new session:', targetSessionId);
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