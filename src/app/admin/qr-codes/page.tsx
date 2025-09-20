'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { generateQRCodeURL, generateQRCodeSVG } from '@/lib/qr-code-generator';
import { QrCode, Download, RefreshCw, Plus, Eye } from 'lucide-react';

interface Table {
  id: string;
  table_number: string;
  restaurant_id: string;
  qr_code_url?: string;
  occupied: boolean;
}

export default function QRCodeManagementPage() {
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<string | null>(null);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);

  useEffect(() => {
    loadTables();
  }, []);

  const loadTables = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('tables')
        .select('*')
        .order('table_number');

      if (error) throw error;
      setTables(data || []);
    } catch (error) {
      console.error('Error loading tables:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateQRCode = async (table: Table) => {
    try {
      setGenerating(table.id);
      
      const qrCodeURL = await generateQRCodeURL(
        table.id,
        table.restaurant_id,
        table.table_number
      );

      // Update table with QR code URL
      const { error } = await supabase
        .from('tables')
        .update({ qr_code_url: qrCodeURL })
        .eq('id', table.id);

      if (error) throw error;

      // Update local state
      setTables(prev => prev.map(t => 
        t.id === table.id ? { ...t, qr_code_url: qrCodeURL } : t
      ));
    } catch (error) {
      console.error('Error generating QR code:', error);
    } finally {
      setGenerating(null);
    }
  };

  const downloadQRCode = async (table: Table) => {
    try {
      const qrCodeSVG = await generateQRCodeSVG(
        table.id,
        table.restaurant_id,
        table.table_number
      );

      const blob = new Blob([qrCodeSVG], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `table-${table.table_number}-qr-code.svg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading QR code:', error);
    }
  };

  const generateAllQRCodes = async () => {
    for (const table of tables) {
      if (!table.qr_code_url) {
        await generateQRCode(table);
        // Small delay to prevent overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-[#00d9ff] mx-auto mb-4" />
          <p className="text-gray-600">Loading tables...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">QR Code Management</h1>
              <p className="text-gray-600 mt-1">Generate and manage QR codes for all tables</p>
            </div>
            <button
              onClick={generateAllQRCodes}
              className="bg-[#00d9ff] text-white px-4 py-2 rounded-lg hover:bg-[#00c4e6] transition-colors flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Generate All</span>
            </button>
          </div>
        </div>

        {/* Tables Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tables.map((table) => (
            <div key={table.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Table {table.table_number}
                </h3>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  table.occupied 
                    ? 'bg-red-100 text-red-800' 
                    : 'bg-green-100 text-green-800'
                }`}>
                  {table.occupied ? 'Occupied' : 'Available'}
                </span>
              </div>

              {/* QR Code Display */}
              <div className="mb-4">
                {table.qr_code_url ? (
                  <div className="text-center">
                    <img
                      src={table.qr_code_url}
                      alt={`QR Code for Table ${table.table_number}`}
                      className="w-32 h-32 mx-auto mb-2 border border-gray-200 rounded"
                    />
                    <p className="text-xs text-gray-500">QR Code Generated</p>
                  </div>
                ) : (
                  <div className="w-32 h-32 bg-gray-100 rounded mx-auto mb-2 flex items-center justify-center">
                    <QrCode className="w-16 h-16 text-gray-400" />
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="space-y-2">
                {!table.qr_code_url ? (
                  <button
                    onClick={() => generateQRCode(table)}
                    disabled={generating === table.id}
                    className="w-full bg-[#00d9ff] text-white py-2 px-4 rounded-lg hover:bg-[#00c4e6] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                  >
                    {generating === table.id ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <QrCode className="w-4 h-4" />
                    )}
                    <span>Generate QR Code</span>
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => downloadQRCode(table)}
                      className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center space-x-2"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download</span>
                    </button>
                    <button
                      onClick={() => setSelectedTable(table)}
                      className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center space-x-2"
                    >
                      <Eye className="w-4 h-4" />
                      <span>View Details</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* QR Code Details Modal */}
        {selectedTable && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Table {selectedTable.table_number} QR Code</h3>
                <button
                  onClick={() => setSelectedTable(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
              
              {selectedTable.qr_code_url && (
                <div className="text-center">
                  <img
                    src={selectedTable.qr_code_url}
                    alt={`QR Code for Table ${selectedTable.table_number}`}
                    className="w-64 h-64 mx-auto mb-4 border border-gray-200 rounded"
                  />
                  <p className="text-sm text-gray-600 mb-4">
                    Scan this QR code to join Table {selectedTable.table_number}
                  </p>
                  <button
                    onClick={() => downloadQRCode(selectedTable!)}
                    className="bg-[#00d9ff] text-white py-2 px-4 rounded-lg hover:bg-[#00c4e6] transition-colors"
                  >
                    Download QR Code
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
