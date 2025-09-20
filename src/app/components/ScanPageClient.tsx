'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { QrCode, Hash, ArrowLeft } from 'lucide-react';
import TableOptions from './TableOptions';
import QRCodeScanner from './QRCodeScanner';
import TableQRCode from './TableQRCode';

interface ScanPageClientProps {
  tableId: string;
  table: any;
  activeSession: any;
}

export default function ScanPageClient({ tableId, table, activeSession }: ScanPageClientProps) {
  const [scanMode, setScanMode] = useState<'qr' | 'manual'>('qr');
  const router = useRouter();

  const handleQRCodeDetected = (data: string) => {
    // Extract table ID from QR code data
    const urlParts = data.split('/');
    const detectedTableId = urlParts[urlParts.length - 1];
    
    if (detectedTableId && detectedTableId !== tableId) {
      // Navigate to the detected table
      router.push(`/scan/${detectedTableId}`);
    }
  };

  const handleManualEntry = () => {
    setScanMode('manual');
  };

  const handleBackToQR = () => {
    setScanMode('qr');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => router.push('/')}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back</span>
          </button>
          
          <div className="flex space-x-2">
            <button
              onClick={() => setScanMode('qr')}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                scanMode === 'qr'
                  ? 'bg-[#00d9ff] text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              <QrCode className="w-4 h-4 inline mr-1" />
              QR Scan
            </button>
            <button
              onClick={() => setScanMode('manual')}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                scanMode === 'manual'
                  ? 'bg-[#00d9ff] text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Hash className="w-4 h-4 inline mr-1" />
              Manual
            </button>
          </div>
        </div>

        {/* Content */}
        {scanMode === 'qr' ? (
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

            {/* QR Scanner */}
            <QRCodeScanner
              onQRCodeDetected={handleQRCodeDetected}
              onError={(error) => console.error('QR Scanner Error:', error)}
            />
          </div>
        ) : (
          <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-200">
            <div className="text-center mb-6">
              <Hash className="w-12 h-12 text-[#00d9ff] mx-auto mb-4" />
              <h1 className="text-3xl font-bold text-gray-800 mb-2">Table {table.table_number}</h1>
              <p className="text-gray-600">Welcome to {table.restaurant_id ? 'Restaurant' : 'Our Restaurant'}</p>
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

        {/* QR Code Display for Current Table */}
        {scanMode === 'manual' && (
          <div className="mt-6 bg-white p-6 rounded-xl shadow-lg border border-gray-200">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Table QR Code</h3>
              <p className="text-sm text-gray-600 mb-4">
                Share this QR code with other diners to join this table
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
        )}
      </div>
    </div>
  );
}
