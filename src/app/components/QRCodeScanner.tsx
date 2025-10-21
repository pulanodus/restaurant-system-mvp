'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { QrCode, Camera, AlertCircle, CheckCircle } from 'lucide-react';
import { BrowserMultiFormatReader } from '@zxing/library';

interface QRCodeScannerProps {
  onQRCodeDetected?: (data: string) => void;
  onError?: (error: string) => void;
}

export default function QRCodeScanner({ onQRCodeDetected, onError }: QRCodeScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [scannedData, setScannedData] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);
  const router = useRouter();

  useEffect(() => {
    // Initialize QR code reader
    codeReaderRef.current = new BrowserMultiFormatReader();
    
    return () => {
      if (codeReaderRef.current) {
        codeReaderRef.current.reset();
      }
    };
  }, []);

  const startScanning = useCallback(async () => {
    try {
      setError(null);
      setIsScanning(true);

      if (!codeReaderRef.current) {
        throw new Error('QR code reader not initialized');
      }

      // Start continuous scanning - the QR reader will handle permission requests
      await codeReaderRef.current.decodeFromVideoDevice(
        null, // Use default camera
        videoRef.current!,
        (result, err) => {
          if (detectedText) {
            onScanSuccess(detectedText);
          }
          if (err && err.name !== 'NotFoundException') {
            console.error('QR Code detection error:', err);
          }
        }
      );

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to access camera';
      setError(errorMessage);
      onError?.(errorMessage);
      setIsScanning(false);
    }
  }, [onError]);

  const stopScanning = useCallback(() => {
    if (codeReaderRef.current) {
      codeReaderRef.current.reset();
    }
    setIsScanning(false);
  }, []);

  const handleQRCodeDetected = useCallback((data: string) => {
    setScannedData(data);
    stopScanning();
    onQRCodeDetected?.(data);
  }, [onQRCodeDetected, stopScanning]);

  const requestCameraPermission = useCallback(async () => {
    try {
      setIsRequestingPermission(true);
      setError(null);

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera not supported on this device');
      }

      // Request camera permission with more specific constraints
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: { ideal: 'environment' }, // Prefer back camera for QR scanning
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
      });
      
      // Stop the stream as we'll let the QR reader handle it
      stream.getTracks().forEach(track => track.stop());
      
      setPermissionGranted(true);
      setError(null);
    } catch (err) {
      let errorMessage = 'Failed to access camera';
      
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          errorMessage = 'Camera permission denied. Please allow camera access in your browser settings and try again.';
        } else if (err.name === 'NotFoundError') {
          errorMessage = 'No camera found on this device.';
        } else if (err.name === 'NotReadableError') {
          errorMessage = 'Camera is already in use by another application.';
        } else if (err.name === 'OverconstrainedError') {
          errorMessage = 'Camera constraints cannot be satisfied.';
        } else {
          errorMessage = err.message;
        }
      }
      
      setError(errorMessage);
      setPermissionGranted(false);
      onError?.(errorMessage);
    } finally {
      setIsRequestingPermission(false);
    }
  }, [onError]);

  const handleManualEntry = () => {
    const tableId = prompt('Enter Table ID:');
    if (tableId) {
      router.push(`/scan/${tableId}`);
    }
  };

  const canRequestPermission = useCallback(() => {
    return !!(navigator.mediaDevices && 
              typeof navigator.mediaDevices.getUserMedia === 'function' && 
              permissionGranted !== true);
  }, [permissionGranted]);

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
        <div className="text-center mb-6">
          <QrCode className="w-12 h-12 text-[#00d9ff] mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Scan Another Table's QR Code</h2>
          <p className="text-gray-600">Point your camera at another table's QR code to join their session</p>
        </div>

        {/* Camera Preview */}
        <div className="relative mb-6">
          <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden relative">
            {isScanning ? (
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                playsInline
                muted
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <Camera className="w-16 h-16 text-gray-400" />
              </div>
            )}
            
            {/* Scanning Overlay */}
            {isScanning && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-48 h-48 border-2 border-[#00d9ff] border-dashed rounded-lg animate-pulse" />
              </div>
            )}
          </div>
        </div>

        {/* Status Messages */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <div className="flex-1">
              <span className="text-red-700 text-sm block">{error}</span>
              {error.includes('permission') && (
                <button
                  onClick={requestCameraPermission}
                  disabled={isRequestingPermission}
                  className="text-red-600 text-xs underline hover:text-red-800 mt-1"
                >
                  {isRequestingPermission ? 'Requesting...' : 'Try Again'}
                </button>
              )}
            </div>
          </div>
        )}

        {scannedData && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center space-x-2">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <span className="text-green-700 text-sm">QR Code detected!</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          {permissionGranted === null && (
            <button
              onClick={requestCameraPermission}
              disabled={isRequestingPermission}
              className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              <Camera className="w-5 h-5" />
              <span>{isRequestingPermission ? 'Requesting Permission...' : 'Allow Camera Access'}</span>
            </button>
          )}

          {permissionGranted === false && canRequestPermission() && (
            <button
              onClick={requestCameraPermission}
              disabled={isRequestingPermission}
              className="w-full bg-orange-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-orange-700 transition-colors flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              <Camera className="w-5 h-5" />
              <span>{isRequestingPermission ? 'Requesting Permission...' : 'Try Again - Allow Camera Access'}</span>
            </button>
          )}

          {permissionGranted === true && !isScanning && (
            <button
              onClick={startScanning}
              className="w-full bg-[#00d9ff] text-white py-3 px-6 rounded-lg font-medium hover:bg-[#00c4e6] transition-colors flex items-center justify-center space-x-2"
            >
              <Camera className="w-5 h-5" />
              <span>Start Scanning</span>
            </button>
          )}

          {isScanning && (
            <button
              onClick={stopScanning}
              className="w-full bg-gray-500 text-white py-3 px-6 rounded-lg font-medium hover:bg-gray-600 transition-colors"
            >
              Stop Scanning
            </button>
          )}

          <button
            onClick={handleManualEntry}
            className="w-full bg-gray-100 text-gray-700 py-3 px-6 rounded-lg font-medium hover:bg-gray-200 transition-colors"
          >
            Enter Table ID Manually
          </button>
        </div>

        {/* Instructions */}
        <div className="mt-6 text-center space-y-2">
          {permissionGranted === null && (
            <div className="space-y-2">
              <p className="text-sm text-gray-600">
                First, allow camera access to scan QR codes
              </p>
              <p className="text-xs text-gray-500">
                Your browser will ask for camera permission. Click "Allow" to continue.
              </p>
            </div>
          )}
          {permissionGranted === false && (
            <div className="space-y-2">
              <p className="text-sm text-red-600">
                Camera access was denied. Please try again or check your browser settings.
              </p>
              <p className="text-xs text-gray-500">
                You can also enter the table ID manually below.
              </p>
            </div>
          )}
          {permissionGranted === true && !isScanning && (
            <p className="text-sm text-gray-600">
              Camera ready! Click "Start Scanning" to begin
            </p>
          )}
          {isScanning && (
            <p className="text-sm text-gray-600">
              Point your camera at the table&apos;s QR code
            </p>
          )}
          <p className="text-sm text-gray-500">
            Can&apos;t scan? Ask your server for the table number
          </p>
        </div>
      </div>
    </div>
  );
}
