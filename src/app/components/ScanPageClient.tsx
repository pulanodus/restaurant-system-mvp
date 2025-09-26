'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Hash } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import TableOptions from './TableOptions';
import TableQRCode from './TableQRCode';
import PinEntryForm from './PinEntryForm';
import NameEntryForm from './NameEntryForm';

interface ScanPageClientProps {
  tableId: string;
  table: any;
  restaurant: any;
  activeSession: any;
}

export default function ScanPageClient({ tableId, table, restaurant, activeSession }: ScanPageClientProps) {
  const [scanMode, setScanMode] = useState<'qr' | 'manual'>('manual'); // Default to manual (PIN entry)
  const [hasOrders, setHasOrders] = useState(false);
  const [isCheckingOrders, setIsCheckingOrders] = useState(false);
  const searchParams = useSearchParams();
  
  // Get URL parameters
  const step = searchParams.get('step');
  const action = searchParams.get('action');
  const sessionId = searchParams.get('sessionId');
  const isNew = searchParams.get('isNew') === 'true';

  // Determine action based on table state
  const tableAction = activeSession ? 'join' : 'start';
  const tableSessionId = activeSession?.id;

  // Check if session has orders when joining existing session
  useEffect(() => {
    const checkForOrders = async () => {
      if (activeSession && step === 'name' && !isNew) {
        setIsCheckingOrders(true);
        try {
          // CRITICAL FIX: Only check for confirmed orders, not cart items
          const { data: orders, error } = await supabase
            .from('orders')
            .select('id')
            .eq('session_id', activeSession.id)
            .in('status', ['waiting', 'preparing', 'ready', 'served', 'completed'])
            .limit(1);

          if (!error && orders && orders.length > 0) {
            setHasOrders(true);
          }
        } catch (error) {
          console.error('Error checking for orders:', error);
        } finally {
          setIsCheckingOrders(false);
        }
      }
    };

    checkForOrders();
  }, [activeSession, step, isNew]);

  const handleManualEntry = () => {
    setScanMode('manual');
  };

  const handleBackToQR = () => {
    setScanMode('qr');
  };

  return (
    <div className="h-screen bg-gradient-to-br from-blue-50 to-indigo-100 overflow-hidden">
      <div className="h-full w-full flex flex-col">
        {/* Content */}
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-sm mx-auto">
            {step === 'name' ? (
              // Name Entry Flow
              <NameEntryForm
                sessionId={sessionId || ''}
                isNewSession={isNew}
                tableNumber={table.table_number}
                hostName={!isNew ? activeSession?.started_by_name : undefined}
                hasOrders={hasOrders}
              />
            ) : scanMode === 'manual' ? (
          // PIN Entry Flow - Default flow for QR code scans
          <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-200">
            <div className="text-center mb-6">
              {/* Restaurant Logo Placeholder */}
              <div className="mb-6">
                <div className="w-16 h-16 bg-[#00d9ff] rounded-full mx-auto mb-3 flex items-center justify-center">
                  <span className="text-white text-2xl font-bold">
                    {restaurant?.name?.charAt(0) || 'P'}
                  </span>
                </div>
                <h2 className="text-2xl font-semibold text-gray-800">
                  {restaurant?.name || 'PulaNod Restaurant'}
                </h2>
              </div>
              
              <Hash className="w-20 h-20 text-[#00d9ff] mx-auto mb-6" />
              <h1 className="text-5xl font-bold text-gray-800 mb-4">Table {table.table_number}</h1>
              <p className="text-xl text-gray-600 mb-6">
                {tableAction === 'start' ? 'Start a new session' : 'Join existing session'}
              </p>
              <p className="text-lg text-gray-500">
                Please enter PIN to proceed
              </p>
            </div>
            
             <PinEntryForm
               tableId={table.id}
               currentPin={table.current_pin}
             />
          </div>
        ) : scanMode === 'qr' ? (
          <div className="space-y-6">
            {/* Current Table QR Code Display */}
            <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Table {table.table_number} QR Code</h3>
                <p className="text-sm text-gray-600 mb-4">
                  This is your table's QR code. Other diners can scan this to join your table.
                </p>
                
                {/* QR Code Display */}
                <div className="mx-auto mb-4">
                  <TableQRCode tableId={tableId} size={128} />
                </div>
                
                <p className="text-xs text-gray-500">
                  Table ID: {tableId}
                </p>
              </div>
            </div>

            {/* Instructions for sharing QR code */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">How to share this table:</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Show this QR code to other diners who want to join your table</li>
                <li>• They can scan it with their phone camera</li>
                <li>• They'll be automatically added to your table session</li>
                <li>• You can also share the table number: <strong>Table {table.table_number}</strong></li>
              </ul>
            </div>
          </div>
        ) : (
          <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-200">
            <div className="text-center mb-6">
              <Hash className="w-12 h-12 text-[#00d9ff] mx-auto mb-4" />
              <h1 className="text-3xl font-bold text-gray-800 mb-2">Table {table.table_number}</h1>
              <p className="text-gray-600">Join this table to start ordering</p>
            </div>
            
            <TableOptions 
              tableId={tableId}
              sessionId={activeSession?.id}
              isNew={!activeSession}
              tableNumber={table.table_number}
              startedByName={activeSession?.started_by_name}
            />
          </div>
        )}
          </div>
        </div>

      </div>
    </div>
  );
}