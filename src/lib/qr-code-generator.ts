// QR Code generation utilities for table scanning
import QRCode from 'qrcode';

export interface QRCodeData {
  tableId: string;
  restaurantId: string;
  tableNumber: string;
  timestamp: number;
}

export interface QRCodeConfig {
  size: number;
  margin: number;
  color: {
    dark: string;
    light: string;
  };
}

const defaultConfig: QRCodeConfig = {
  size: 256,
  margin: 2,
  color: {
    dark: '#000000',
    light: '#FFFFFF'
  }
};

/**
 * Generate QR code data for a table
 */
export function generateQRCodeData(tableId: string, restaurantId: string, tableNumber: string): QRCodeData {
  return {
    tableId,
    restaurantId,
    tableNumber,
    timestamp: Date.now()
  };
}

/**
 * Generate QR code URL for a table
 */
export async function generateQRCodeURL(
  tableId: string, 
  restaurantId: string, 
  tableNumber: string,
  config: Partial<QRCodeConfig> = {}
): Promise<string> {
  const qrData = generateQRCodeData(tableId, restaurantId, tableNumber);
  const qrConfig = { ...defaultConfig, ...config };
  
  // Create the URL that will be encoded in the QR code
  const qrURL = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/scan/${tableId}`;
  
  try {
    const qrCodeDataURL = await QRCode.toDataURL(qrURL, qrConfig);
    return qrCodeDataURL;
  } catch (error) {
    console.error('Error generating QR code:', error);
    throw new Error('Failed to generate QR code');
  }
}

/**
 * Generate QR code SVG for better scalability
 */
export async function generateQRCodeSVG(
  tableId: string,
  restaurantId: string,
  tableNumber: string,
  config: Partial<QRCodeConfig> = {}
): Promise<string> {
  const qrURL = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/scan/${tableId}`;
  const qrConfig = { ...defaultConfig, ...config };
  
  try {
    const qrCodeSVG = await QRCode.toString(qrURL, {
      type: 'svg',
      width: qrConfig.size,
      margin: qrConfig.margin,
      color: qrConfig.color
    });
    return qrCodeSVG;
  } catch (error) {
    console.error('Error generating QR code SVG:', error);
    throw new Error('Failed to generate QR code SVG');
  }
}

/**
 * Parse QR code data from URL
 */
export function parseQRCodeData(url: string): { tableId: string } | null {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/');
    const tableId = pathParts[pathParts.length - 1];
    
    if (tableId && tableId !== 'scan') {
      return { tableId };
    }
    return null;
  } catch (error) {
    console.error('Error parsing QR code data:', error);
    return null;
  }
}

/**
 * Validate QR code URL
 */
export function validateQRCodeURL(url: string): boolean {
  try {
    const urlObj = new URL(url);
    const expectedDomain = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    return urlObj.origin === expectedDomain && urlObj.pathname.startsWith('/scan/');
  } catch (error) {
    return false;
  }
}
