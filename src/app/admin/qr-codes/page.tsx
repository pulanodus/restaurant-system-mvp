'use client';

import { useState, useEffect } from 'react';
import { Download, QrCode, Printer, RefreshCw, Table, Eye } from 'lucide-react';

interface QRCodeData {
  tableId: string;
  tableNumber: string;
  restaurantId: string;
  qrCodeDataURL: string;
  qrCodeSVG?: string;
  scanURL: string;
  error?: string;
}

export default function AdminQRCodesPage() {
  const [qrCodes, setQrCodes] = useState<QRCodeData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);

  const fetchQRCodes = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch('/api/admin/qr-codes');
      const data = await response.json();
      
      if (response.ok && data.success) {
        setQrCodes(data.data);
      } else {
        setError(data.error || 'Failed to fetch QR codes');
      }
    } catch (err) {
      setError('Failed to fetch QR codes');
      console.error('Error fetching QR codes:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchQRCodes();
  }, []);

  const downloadQRCode = (qrCode: QRCodeData) => {
    if (!qrCode.qrCodeDataURL) return;
    
    const link = document.createElement('a');
    link.download = `table-${qrCode.tableNumber}-qr-code.png`;
    link.href = qrCode.qrCodeDataURL;
    link.click();
  };

  const downloadAllQRCodes = () => {
    qrCodes.forEach(qrCode => {
      if (qrCode.qrCodeDataURL && !qrCode.error) {
        setTimeout(() => downloadQRCode(qrCode), 100);
      }
    });
  };

  const printQRCode = (qrCode: QRCodeData) => {
    if (!qrCode.qrCodeDataURL) return;
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Table ${qrCode.tableNumber} QR Code</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              text-align: center;
              padding: 20px;
              margin: 0;
            }
            .qr-container {
              display: inline-block;
              border: 2px solid #333;
              padding: 20px;
              margin: 20px;
            }
            .qr-code {
              max-width: 300px;
              height: auto;
            }
            .table-info {
              margin-top: 15px;
              font-size: 18px;
              font-weight: bold;
            }
            .scan-url {
              margin-top: 10px;
              font-size: 12px;
              color: #666;
              word-break: break-all;
            }
            @media print {
              body { margin: 0; padding: 10px; }
              .qr-container { border: 1px solid #000; }
            }
          </style>
        </head>
        <body>
          <div class="qr-container">
            <img src="${qrCode.qrCodeDataURL}" alt="Table ${qrCode.tableNumber} QR Code" class="qr-code" />
            <div class="table-info">Table ${qrCode.tableNumber}</div>
            <div class="scan-url">${qrCode.scanURL}</div>
          </div>
        </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const printAllQRCodes = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      const validQRCodes = qrCodes.filter(qr => qr.qrCodeDataURL && !qr.error);
      
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>All Table QR Codes</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 20px;
              margin: 0;
            }
            .qr-grid {
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
              gap: 20px;
              max-width: 1200px;
              margin: 0 auto;
            }
            .qr-container {
              border: 2px solid #333;
              padding: 15px;
              text-align: center;
              page-break-inside: avoid;
            }
            .qr-code {
              max-width: 250px;
              height: auto;
            }
            .table-info {
              margin-top: 10px;
              font-size: 16px;
              font-weight: bold;
            }
            .scan-url {
              margin-top: 8px;
              font-size: 10px;
              color: #666;
              word-break: break-all;
            }
            @media print {
              body { margin: 0; padding: 10px; }
              .qr-grid { grid-template-columns: repeat(2, 1fr); gap: 10px; }
              .qr-container { border: 1px solid #000; }
            }
          </style>
        </head>
        <body>
          <h1 style="text-align: center; margin-bottom: 30px;">Restaurant Table QR Codes</h1>
          <div class="qr-grid">
            ${validQRCodes.map(qr => `
              <div class="qr-container">
                <img src="${qr.qrCodeDataURL}" alt="Table ${qr.tableNumber} QR Code" class="qr-code" />
                <div class="table-info">Table ${qr.tableNumber}</div>
                <div class="scan-url">${qr.scanURL}</div>
              </div>
            `).join('')}
          </div>
        </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-[#00d9ff] mx-auto mb-4" />
          <p className="text-gray-600">Generating QR codes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <QrCode className="w-8 h-8 text-[#00d9ff] mr-3" />
                Table QR Codes
              </h1>
              <p className="text-gray-600 mt-2">
                Generate and manage QR codes for all restaurant tables
              </p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={fetchQRCodes}
                disabled={isLoading}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
              <button
                onClick={downloadAllQRCodes}
                disabled={qrCodes.length === 0}
                className="bg-[#00d9ff] hover:bg-[#00c7e6] text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Download All</span>
              </button>
            <button
                onClick={printAllQRCodes}
                disabled={qrCodes.length === 0}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
            >
                <Printer className="w-4 h-4" />
                <span>Print All</span>
            </button>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-700">{error}</p>
              </div>
        )}

        {/* QR Codes Grid */}
        {qrCodes.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {qrCodes.map((qrCode) => (
              <div key={qrCode.tableId} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="text-center">
                  {/* QR Code */}
              <div className="mb-4">
                    {qrCode.error ? (
                      <div className="w-32 h-32 mx-auto bg-gray-100 rounded-lg flex items-center justify-center">
                        <span className="text-gray-500 text-sm">Error</span>
                  </div>
                ) : (
                      <img
                        src={qrCode.qrCodeDataURL}
                        alt={`Table ${qrCode.tableNumber} QR Code`}
                        className="w-32 h-32 mx-auto border border-gray-200 rounded-lg"
                      />
                    )}
                  </div>

                  {/* Table Info */}
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center justify-center">
                      <Table className="w-5 h-5 mr-2" />
                      Table {qrCode.tableNumber}
                    </h3>
                    {qrCode.error ? (
                      <p className="text-red-600 text-sm mt-1">{qrCode.error}</p>
                    ) : (
                      <p className="text-gray-600 text-sm mt-1">Ready for scanning</p>
                )}
              </div>

              {/* Actions */}
              <div className="space-y-2">
                    <button
                      onClick={() => downloadQRCode(qrCode)}
                      disabled={!!qrCode.error}
                      className="w-full bg-[#00d9ff] hover:bg-[#00c7e6] disabled:bg-gray-300 text-white py-2 px-3 rounded-lg text-sm flex items-center justify-center space-x-2 transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download</span>
                    </button>
                    
                    <button
                      onClick={() => printQRCode(qrCode)}
                      disabled={!!qrCode.error}
                      className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white py-2 px-3 rounded-lg text-sm flex items-center justify-center space-x-2 transition-colors"
                    >
                      <Printer className="w-4 h-4" />
                      <span>Print</span>
                    </button>

                    <button
                      onClick={() => window.open(qrCode.scanURL, '_blank')}
                      disabled={!!qrCode.error}
                      className="w-full bg-gray-100 hover:bg-gray-200 disabled:bg-gray-300 text-gray-700 py-2 px-3 rounded-lg text-sm flex items-center justify-center space-x-2 transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                      <span>Preview</span>
                    </button>
                  </div>

                  {/* Scan URL */}
                  {!qrCode.error && (
                    <div className="mt-4 p-2 bg-gray-50 rounded text-xs text-gray-600 break-all">
                      {qrCode.scanURL}
                    </div>
                )}
              </div>
            </div>
          ))}
        </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <QrCode className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No QR Codes Found</h3>
            <p className="text-gray-600 mb-6">
              No active tables found. Create some tables first to generate QR codes.
                  </p>
                  <button
              onClick={fetchQRCodes}
              className="bg-[#00d9ff] hover:bg-[#00c7e6] text-white px-6 py-3 rounded-lg transition-colors"
                  >
              Refresh
                  </button>
                </div>
              )}

        {/* Instructions */}
        {qrCodes.length > 0 && (
          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-3">Instructions</h3>
            <div className="text-blue-800 space-y-2">
              <p>• <strong>Download:</strong> Save individual QR codes as PNG files</p>
              <p>• <strong>Print:</strong> Print QR codes for physical placement on tables</p>
              <p>• <strong>Preview:</strong> Test QR codes by scanning them with your phone</p>
              <p>• <strong>Placement:</strong> Print and laminate QR codes, then place them on each table</p>
              <p>• <strong>Scanning:</strong> Diners can scan these codes to join table sessions</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}