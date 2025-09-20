'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Hash, ArrowLeft, Users, User } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { handleError } from '@/lib/error-handling';

export default function DinerEntryPage() {
  const [tableId, setTableId] = useState('');
  const [pin, setPin] = useState('');
  const [guestName, setGuestName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'table' | 'pin' | 'name'>('table');
  const [tableData, setTableData] = useState<any>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const router = useRouter();

  const handleTableSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tableId.trim()) {
      setError('Please enter a table number');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Try to find table by table_number first, then by ID
      let { data: table, error: tableError } = await supabase
        .from('tables')
        .select('*')
        .eq('table_number', tableId.trim())
        .single();

      if (tableError || !table) {
        // Try by ID if table_number didn't work
        const { data: tableById, error: idError } = await supabase
          .from('tables')
          .select('*')
          .eq('id', tableId.trim())
          .single();

        if (idError || !tableById) {
          setError('Table not found. Please check the table number.');
          setIsLoading(false);
          return;
        }
        table = tableById;
      }

      setTableData(table);
      setStep('pin');
    } catch (error) {
      const appError = handleError(error, {
        operation: 'Table Lookup',
        tableId: tableId.trim()
      });
      setError(appError.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin.trim()) {
      setError('Please enter the PIN');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Verify PIN using API
      const response = await fetch('/api/tables/verify-pin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tableId: tableData.id,
          pin: pin.trim()
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        console.log('✅ PIN verified successfully:', data.message);
        
        if (data.session) {
          // Join existing session
          setSessionId(data.session.id);
          setStep('name');
        } else {
          // Create new session
          const { data: newSession, error: sessionError } = await supabase
            .from('sessions')
            .insert([{ table_id: tableData.id }])
            .select()
            .single();

          if (sessionError) {
            throw sessionError;
          }

          setSessionId(newSession.id);
          setStep('name');
        }
      } else {
        setError(data.error || 'PIN verification failed');
      }
    } catch (error) {
      const appError = handleError(error, {
        operation: 'PIN Verification and Session Creation',
        tableId: tableData.id,
        pin: pin.trim()
      });
      setError(appError.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestName.trim()) {
      setError('Please enter your name');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Update session with guest name
      const { error: updateError } = await supabase
        .from('sessions')
        .update({ started_by_name: guestName.trim() })
        .eq('id', sessionId);

      if (updateError) {
        throw updateError;
      }

      // Redirect to menu
      router.push(`/session/${sessionId}`);
    } catch (error) {
      const appError = handleError(error, {
        operation: 'Session Name Update',
        sessionId,
        guestName: guestName.trim()
      });
      setError(appError.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    if (step === 'pin') {
      setStep('table');
      setTableData(null);
    } else if (step === 'name') {
      setStep('pin');
    }
  };

  const handleStartOver = () => {
    setStep('table');
    setTableId('');
    setPin('');
    setGuestName('');
    setTableData(null);
    setSessionId(null);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-[#00d9ff] rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Diner Entry</h1>
          <p className="text-gray-600">Join a table to start ordering</p>
        </div>

        {/* Progress Indicator */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center space-x-4">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              step === 'table' ? 'bg-[#00d9ff] text-white' : 
              step === 'pin' || step === 'name' ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-600'
            }`}>
              1
            </div>
            <div className={`w-16 h-1 ${step === 'pin' || step === 'name' ? 'bg-green-500' : 'bg-gray-300'}`}></div>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              step === 'pin' ? 'bg-[#00d9ff] text-white' : 
              step === 'name' ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-600'
            }`}>
              2
            </div>
            <div className={`w-16 h-1 ${step === 'name' ? 'bg-green-500' : 'bg-gray-300'}`}></div>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              step === 'name' ? 'bg-[#00d9ff] text-white' : 'bg-gray-300 text-gray-600'
            }`}>
              3
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {step === 'table' && (
            <form onSubmit={handleTableSubmit} className="space-y-6">
              <div className="text-center mb-6">
                <Hash className="w-12 h-12 text-[#00d9ff] mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Enter Table Number</h2>
                <p className="text-gray-600">Enter your table number to get started</p>
              </div>

              <div>
                <label htmlFor="tableId" className="block text-sm font-medium text-gray-700 mb-2">
                  Table Number
                </label>
                <input
                  type="text"
                  id="tableId"
                  value={tableId}
                  onChange={(e) => setTableId(e.target.value)}
                  placeholder="e.g., A1, B5, 12, C3"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00d9ff] focus:border-transparent transition-colors text-gray-900"
                  required
                  disabled={isLoading}
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading || !tableId.trim()}
                className="w-full bg-[#00d9ff] hover:bg-[#00c7e6] disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Finding Table...</span>
                  </>
                ) : (
                  <>
                    <Hash className="w-5 h-5" />
                    <span>Continue</span>
                  </>
                )}
              </button>
            </form>
          )}

          {step === 'pin' && (
            <form onSubmit={handlePinSubmit} className="space-y-6">
              <div className="text-center mb-6">
                <div className="w-12 h-12 bg-[#00d9ff] rounded-full flex items-center justify-center mx-auto mb-4">
                  <Hash className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Table {tableData?.table_number}</h2>
                <p className="text-gray-600">Enter the PIN to join this table</p>
              </div>

              <div>
                <label htmlFor="pin" className="block text-sm font-medium text-gray-700 mb-2">
                  Table PIN
                </label>
                <input
                  type="password"
                  id="pin"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="Enter 4-digit PIN"
                  maxLength={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00d9ff] focus:border-transparent transition-colors text-gray-900"
                  required
                  disabled={isLoading}
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={handleBack}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
                >
                  <ArrowLeft className="w-5 h-5" />
                  <span>Back</span>
                </button>
                <button
                  type="submit"
                  disabled={isLoading || pin.length !== 4}
                  className="flex-1 bg-[#00d9ff] hover:bg-[#00c7e6] disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <>
                      <Hash className="w-5 h-5" />
                      <span>Continue</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {step === 'name' && (
            <form onSubmit={handleNameSubmit} className="space-y-6">
              <div className="text-center mb-6">
                <User className="w-12 h-12 text-[#00d9ff] mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-800 mb-2">What's your name?</h2>
                <p className="text-gray-600">Enter your name to join the table</p>
              </div>

              <div>
                <label htmlFor="guestName" className="block text-sm font-medium text-gray-700 mb-2">
                  Your Name
                </label>
                <input
                  type="text"
                  id="guestName"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder="Enter your name"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00d9ff] focus:border-transparent transition-colors text-gray-900"
                  required
                  disabled={isLoading}
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={handleBack}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
                >
                  <ArrowLeft className="w-5 h-5" />
                  <span>Back</span>
                </button>
                <button
                  type="submit"
                  disabled={isLoading || !guestName.trim()}
                  className="flex-1 bg-[#00d9ff] hover:bg-[#00c7e6] disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      <span>Joining...</span>
                    </>
                  ) : (
                    <>
                      <User className="w-5 h-5" />
                      <span>Join Table</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* Start Over Button */}
          <div className="mt-6 text-center">
            <button
              onClick={handleStartOver}
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              Start Over
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-sm text-gray-500">
            Restaurant Ordering System • Diner Portal
          </p>
        </div>
      </div>
    </div>
  );
}
