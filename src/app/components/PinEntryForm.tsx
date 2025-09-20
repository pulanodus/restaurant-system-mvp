'use client';

// React imports
import { useState } from 'react';

// Next.js imports
import { useRouter } from 'next/navigation';

// Supabase imports
import { supabase } from '@/lib/supabase';

// Error handling imports
import { handleError } from '@/lib/error-handling';

interface PinEntryFormProps {
  tableId: string;
  currentPin: string;
  existingSessionId?: string;
}

export default function PinEntryForm({ tableId, currentPin, existingSessionId }: PinEntryFormProps) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    // 1. Verify the PIN
    if (pin !== currentPin) {
      setError('Invalid PIN. Please check with your server.');
      setIsLoading(false);
      return;
    }

    // 2. PIN is correct. Now, either join or create a session.
    try {
      let targetSessionId = existingSessionId;
      let isNewSession = false;

      // If no existing session, create one
      if (!targetSessionId) {
        const { data: newSession, error: sessionError } = await supabase
          .from('sessions')
          .insert([{ table_id: tableId }])
          .select()
          .single();

        if (sessionError) {
          throw sessionError;
        }
        targetSessionId = newSession.id;
        isNewSession = true;
      }

      // 3. Redirect to name entry page instead of directly to menu
      router.push(`/scan/${tableId}?step=name&sessionId=${targetSessionId}&isNew=${isNewSession}`);
    } catch (error) {
      const appError = handleError(error, {
        operation: 'PIN Entry Session Creation',
        tableId,
        existingSessionId
      });
      setError(appError.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <input
          id="pin"
          type="password"
          inputMode="numeric"
          pattern="[0-9]{4}"
          maxLength={4}
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900"
          placeholder="Enter 4-digit PIN"
          required
          disabled={isLoading}
        />
      </div>
      {error && <p className="text-red-600 text-sm text-center">{error}</p>}
      <button
        type="submit"
        disabled={isLoading || pin.length !== 4}
        className="w-full flex justify-center items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-400 disabled:cursor-not-allowed"
      >
        {isLoading ? 'Verifying...' : 'Enter'}
      </button>
    </form>
  );
}