'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { triggerCleanupOnUserAction, forceImmediateCleanup } from '@/lib/auto-cleanup';
import { handleError } from '@/lib/error-handling';

interface NameEntryFormProps {
  sessionId: string;
  isNewSession: boolean;
  tableNumber: string;
  hostName?: string;
  hasOrders?: boolean;
}

export default function NameEntryForm({ sessionId, isNewSession, tableNumber, hostName, hasOrders = false }: NameEntryFormProps) {
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRecognized, setIsRecognized] = useState(false);
  const [isReturningUser, setIsReturningUser] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    // Trigger auto-cleanup when user tries to log in
    // This helps resolve "name already taken" issues automatically
    triggerCleanupOnUserAction('login_attempt');

    setIsLoading(true);
    setError(null);

    try {
      if (isNewSession) {
        // Update the session with the starter's name
        const { error } = await supabase
          .from('sessions')
          .update({ 
            started_by_name: name.trim(),
            diners: [{ 
              id: 'diner_1', 
              name: name.trim(),
              isActive: true,
              lastActive: new Date().toISOString()
            }] 
          })
          .eq('id', sessionId);

        if (error) throw error;
        
        // Show welcome message for new session creator
        setIsRecognized(true);
        setTimeout(() => {
          router.push(`/session/${sessionId}?dinerName=${encodeURIComponent(name.trim())}`);
        }, 2000);
      } else {
        // Add the user to the existing session's diners array
        
        const { data: session, error: fetchError } = await supabase
          .from('sessions')
          .select('diners, started_by_name')
          .eq('id', sessionId)
          .single();

        if (fetchError) throw fetchError;

        const currentDiners = Array.isArray(session.diners) ? session.diners : [];
        
        // Check if there's an active user with this name
        const existingActiveDiner = currentDiners.find(diner => 
          diner.name.toLowerCase() === name.trim().toLowerCase() && 
          diner.isActive === true
        );
        
        // Check if this is a returning user (inactive) - reactivate them
        const existingInactiveDiner = currentDiners.find(diner => 
          diner.name.toLowerCase() === name.trim().toLowerCase() && 
          diner.isActive === false
        );
        
        // If there's an active user with this name, block them (someone else is using it)
        if (existingActiveDiner) {
          setError(`The name "${name.trim()}" is already taken by an active user. Please choose a different name.`);
          setIsLoading(false);
          return;
        }
        
        // If there's an inactive user, check how long they've been away
        if (existingInactiveDiner) {
          // Use lastActive time if logoutTime doesn't exist (backward compatibility)
          const logoutTime = existingInactiveDiner.logoutTime || existingInactiveDiner.lastActive;
          const now = new Date();
          const timeAway = logoutTime ? now.getTime() - new Date(logoutTime).getTime() : 0;
          const minutesAway = timeAway / (1000 * 60); // Convert to minutes
          
          // For now, let's simplify: if user is inactive, always allow them to return
          // We can add time-based logic later if needed
          
          // Show welcome back message
          setIsRecognized(true);
          setIsReturningUser(true);
          
          // Reactivate the user
          const updatedDiners = currentDiners.map(diner => 
            diner.id === existingInactiveDiner.id 
              ? { ...diner, isActive: true, lastActive: new Date().toISOString() }
              : diner
          );
          
          const { error: updateError } = await supabase
            .from('sessions')
            .update({ diners: updatedDiners })
            .eq('id', sessionId);
          
          if (updateError) {
            setError('Failed to reactivate user. Please try again.');
            setIsLoading(false);
            return;
          }
          
          setIsReturningUser(true);
          setIsRecognized(true);
          setTimeout(() => {
            router.push(`/session/${sessionId}?dinerName=${encodeURIComponent(name.trim())}`);
          }, 2000);
          return;
        }
        
        
        // If we get here, it's a new user (no existing diner found)
        const updatedDiners = [
          ...currentDiners,
          { 
            id: `diner_${currentDiners.length + 1}`, 
            name: name.trim(),
            isActive: true,
            lastActive: new Date().toISOString()
          }
        ];
        setIsReturningUser(false); // Explicitly mark as new user

        const { error: updateError } = await supabase
          .from('sessions')
          .update({ diners: updatedDiners })
          .eq('id', sessionId);

        if (updateError) throw updateError;
        
        // Show welcome back message for returning users, then navigate
        if (isReturningUser) {
          setIsRecognized(true);
          setTimeout(() => {
            router.push(`/session/${sessionId}?dinerName=${encodeURIComponent(name.trim())}`);
          }, 2000);
        } else {
          // Navigate immediately for new users
          router.push(`/session/${sessionId}?dinerName=${encodeURIComponent(name.trim())}`);
        }
      }
    } catch (error) {
      setError('Failed to process name entry. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-200">
      <div className="text-center mb-6">
        <div className="mb-6">
          <div className="w-16 h-16 bg-[#00d9ff] rounded-full mx-auto mb-3 flex items-center justify-center">
            <span className="text-white text-2xl font-bold">P</span>
          </div>
          <h2 className="text-2xl font-semibold text-gray-800">PulaNod Restaurant</h2>
        </div>
        
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Table {tableNumber}</h1>
          {isNewSession ? (
            <p className="text-lg text-gray-600">Start your dining experience</p>
          ) : (
            <div className="text-lg text-gray-600">
              <p>Join {hostName}'s table</p>
              {hasOrders && (
                <p className="text-sm text-amber-600 mt-1">
                  ⚠️ This table already has orders
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
            What's your name?
          </label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your name"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00d9ff] focus:border-transparent text-lg bg-white text-gray-900"
            required
            disabled={isLoading}
          />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800 text-sm font-medium">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading || !name.trim()}
          className="w-full bg-[#00d9ff] text-white py-3 px-4 rounded-lg font-semibold text-lg hover:bg-[#00c7e6] focus:ring-2 focus:ring-[#00d9ff] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              {isNewSession ? 'Starting session...' : 'Joining table...'}
            </div>
          ) : (
            isNewSession ? 'Start Session' : 'Join Table'
          )}
        </button>
      </form>

      {/* Welcome back message for returning users */}
      {isRecognized && isReturningUser && (
        <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-green-600 mr-3"></div>
            <p className="text-green-800 text-lg font-medium">
              Welcome back, {name}! Continuing with your session...
            </p>
          </div>
        </div>
      )}

      {/* Recognition message for new users */}
      {isRecognized && !isReturningUser && (
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-3"></div>
            <p className="text-blue-800 text-lg font-medium">
              Welcome, {name}! Setting up your session...
            </p>
          </div>
        </div>
      )}

      <div className="mt-6 text-center">
        <p className="text-xs text-gray-500">
          {isNewSession 
            ? 'You\'ll be the host of this table. Other diners can join using the table PIN.'
            : 'You\'ll be added to the existing table session.'
          }
        </p>
      </div>

    </div>
  );
}