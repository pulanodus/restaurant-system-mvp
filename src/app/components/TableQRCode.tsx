'use client';

import { useEffect, useRef } from 'react';
import QRCode from 'qrcode';

interface TableQRCodeProps {
  tableId: string;
  size?: number;
}

export default function TableQRCode({ tableId, size = 128 }: TableQRCodeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const generateQRCode = async () => {
      if (!canvasRef.current) return;

      try {
        // Generate QR code with table URL
        const tableUrl = `${window.location.origin}/scan/${tableId}`;
        await QRCode.toCanvas(canvasRef.current, tableUrl, {
          width: size,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        });
      } catch (error) {
        console.error('Error generating QR code:', error);
      }
    };

    generateQRCode();
  }, [tableId, size]);

  return (
    <div className="flex items-center justify-center">
      <canvas
        ref={canvasRef}
        className="border border-gray-200 rounded-lg"
        style={{ width: size, height: size }}
      />
    </div>
  );
}
