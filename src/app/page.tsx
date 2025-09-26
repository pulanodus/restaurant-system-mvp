'use client';

import { useState } from 'react';
import { QrCode, Smartphone, Utensils, ArrowRight } from 'lucide-react';

export default function Home() {
  const [isScanning, setIsScanning] = useState(false);

  const handleScanQR = () => {
    setIsScanning(true);
    // In a real implementation, this would open the device camera
    // For now, we'll simulate the QR scanning experience
    setTimeout(() => {
      alert('QR Code scanner would open here. In a real app, this would use the device camera to scan table QR codes.');
      setIsScanning(false);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#00d9ff] to-[#0099cc] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8 text-center">
        {/* Restaurant Logo/Brand */}
        <div className="mb-8">
          <div className="w-20 h-20 bg-[#00d9ff] rounded-full flex items-center justify-center mx-auto mb-4">
            <Utensils className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">PulaNodus Restaurant</h1>
          <p className="text-gray-600">Digital Dining Experience</p>
        </div>

        {/* Main Message */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Ready to order again?
          </h2>
          <p className="text-gray-600 text-lg leading-relaxed">
            Scan the QR code at your table to browse our menu, place orders, and enjoy a seamless dining experience.
          </p>
        </div>

        {/* QR Scanner Button */}
        <div className="mb-8">
          <button
            onClick={handleScanQR}
            disabled={isScanning}
            className="w-full bg-[#00d9ff] hover:bg-[#00c4e6] disabled:bg-gray-400 text-white font-semibold py-4 px-6 rounded-xl transition-colors duration-200 flex items-center justify-center gap-3 text-lg"
          >
            {isScanning ? (
              <>
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                <span>Scanning...</span>
              </>
            ) : (
              <>
                <QrCode className="w-6 h-6" />
                <span>Scan QR Code</span>
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </div>

        {/* Instructions */}
        <div className="bg-gray-50 rounded-xl p-6 mb-6">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center justify-center gap-2">
            <Smartphone className="w-5 h-5" />
            How it works
          </h3>
          <div className="space-y-2 text-sm text-gray-600">
            <p>1. 📱 Point your camera at the table QR code</p>
            <p>2. 🍽️ Browse our digital menu</p>
            <p>3. 📝 Place your order directly</p>
            <p>4. 💳 Pay when you're ready</p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-xs text-gray-500">
          <p>Powered by PulaNodus</p>
          <p className="mt-1">Smart Seamless Dining</p>
        </div>
      </div>
    </div>
  );
}
