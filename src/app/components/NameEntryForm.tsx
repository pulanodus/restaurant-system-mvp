'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

// Error handling imports
import { useComponentErrorHandling, withComponentErrorHandling } from '@/lib/error-handling';

interface NameEntryFormProps {
  sessionId: string;
  isNewSession: boolean;
  tableNumber: string;
}

export default function NameEntryForm({ sessionId, isNewSession, tableNumber }: NameEntryFormProps) {
  const [name, setName] = useState('');
  const { isLoading, setError, setIsLoading, clearError } = useComponentErrorHandling();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsLoading(true);
    setError(null);

    await withComponentErrorHandling(async () => {
      if (isNewSession) {
        // Update the session with the starter's name
        const { error } = await supabase
          .from('sessions')
          .update({ 
            started_by_name: name.trim(),
            diners: [{ id: 'diner_1', name: name.trim() }] 
          })
          .eq('id', sessionId);

        if (error) throw error;
      } else {
        // Add the user to the existing session's diners array
        const { data: session, error: fetchError } = await supabase
          .from('sessions')
          .select('diners')
          .eq('id', sessionId)
          .single();

        if (fetchError) throw fetchError;

        // Ensure diners is always an array
        const currentDiners = Array.isArray(session.diners) ? session.diners : [];
        const updatedDiners = [
          ...currentDiners,
          { id: `diner_${currentDiners.length + 1}`, name: name.trim() }
        ];

        const { error: updateError } = await supabase
          .from('sessions')
          .update({ diners: updatedDiners })
          .eq('id', sessionId);

        if (updateError) throw updateError;
      }

      // Navigate to the menu
      router.push(`/session/${sessionId}`);
    }, 'Name Entry Session Update', { setError, setIsLoading, clearError }, {
      showAlert: true,
      logError: true
    });
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold text-center mb-2 text-gray-900">
          {isNewSession ? 'Start New Table' : 'Join Table'}
        </h1>
        
        <p className="text-center text-gray-700 mb-6">
          {isNewSession 
            ? `You're starting a new session at Table ${tableNumber}.`
            : `You're joining the table session at Table ${tableNumber}.`
          }
          <br /> Please enter your name to continue.
        </p>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900"
              placeholder="Enter your name"
              required
              disabled={isLoading}
            />
          </div>
          
          <button
            type="submit"
            disabled={isLoading || !name.trim()}
            className="w-full flex justify-center items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-400 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Continuing...' : 'Continue to Menu'}
          </button>
        </form>
      </div>
    </div>
  );
}