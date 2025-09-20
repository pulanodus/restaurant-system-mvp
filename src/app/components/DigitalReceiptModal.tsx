'use client';

import { useState } from 'react';
import { X, Mail, Download, CheckCircle, AlertCircle } from 'lucide-react';

interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  total: number;
  isSplit?: boolean;
  splitPrice?: number;
  splitCount?: number;
  originalPrice?: number;
}

interface DigitalReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSkip: () => void;
  onContinue?: () => void; // New callback for when email is sent and user clicks Continue
  orderItems: OrderItem[];
  subtotal: number;
  vat: number;
  tipAmount: number;
  finalTotal: number;
  sessionId: string;
  tableNumber?: string | undefined;
  paymentMethod?: string | undefined;
  paymentCompletedAt?: string | undefined;
}

export default function DigitalReceiptModal({
  isOpen,
  onClose,
  onSkip,
  onContinue,
  orderItems,
  subtotal,
  vat,
  tipAmount,
  finalTotal,
  sessionId,
  tableNumber,
  paymentMethod,
  paymentCompletedAt
}: DigitalReceiptModalProps) {
  const [email, setEmail] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Format currency
  const formatCurrency = (amount: number) => {
    return `P${amount.toFixed(2)}`;
  };

  // Format date
  const formatDate = (dateString?: string) => {
    if (!dateString) return new Date().toLocaleString();
    return new Date(dateString).toLocaleString();
  };

  // Handle email receipt sending
  const handleSendEmail = async () => {
    if (!email.trim()) {
      setError('Please enter an email address');
      return;
    }

    if (!email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    setIsSending(true);
    setError(null);

    try {
      const response = await fetch('/api/receipt/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          email: email.trim(),
          orderItems,
          subtotal,
          vat,
          tipAmount,
          finalTotal,
          tableNumber,
          paymentMethod,
          paymentCompletedAt
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send receipt');
      }

      setEmailSent(true);
    } catch (error) {
      console.error('Error sending receipt:', error);
      setError(error instanceof Error ? error.message : 'Failed to send receipt');
    } finally {
      setIsSending(false);
    }
  };

  // Handle skip
  const handleSkip = () => {
    onSkip();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                <CheckCircle className="w-4 h-4 text-white" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Digital Receipt</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-6 space-y-6">
          {/* Receipt Header */}
          <div className="text-center">
            <h3 className="text-lg font-bold text-gray-900">PulaNodus Restaurant</h3>
            <p className="text-sm text-gray-600">Thank you for dining with us!</p>
            {tableNumber && (
              <p className="text-sm text-gray-600">Table {tableNumber}</p>
            )}
            <p className="text-xs text-gray-500 mt-2">
              Receipt Date: {formatDate(paymentCompletedAt)}
            </p>
            <p className="text-xs text-gray-500">
              Session: {sessionId.slice(-8)}
            </p>
          </div>

          {/* Order Items */}
          <div className="border-t border-b border-gray-200 py-4">
            <h4 className="font-semibold text-gray-900 mb-3">Order Details</h4>
            <div className="space-y-2">
              {orderItems.map((item) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{item.name}</div>
                    <div className="text-gray-600">
                      {item.isSplit ? (
                        <>
                          {formatCurrency(item.originalPrice || 0)} total
                          <br />
                          <span className="text-purple-600">Split {item.splitCount} ways</span>
                        </>
                      ) : (
                        `Qty: ${item.quantity} × ${formatCurrency(item.price)}`
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium text-gray-900">
                      {formatCurrency(item.total)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Payment Summary */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Subtotal:</span>
              <span className="font-medium text-gray-900">{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">VAT (14%):</span>
              <span className="font-medium text-gray-900">{formatCurrency(vat)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Tip:</span>
              <span className="font-medium text-gray-900">{formatCurrency(tipAmount)}</span>
            </div>
            <div className="border-t border-gray-300 pt-2">
              <div className="flex justify-between text-lg font-bold">
                <span className="text-gray-900">Total:</span>
                <span className="text-[#00d9ff]">{formatCurrency(finalTotal)}</span>
              </div>
            </div>
          </div>

          {/* Payment Method */}
          {paymentMethod && (
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-sm">
                <span className="text-gray-600">Payment Method: </span>
                <span className="font-medium text-gray-900 capitalize">{paymentMethod}</span>
              </div>
            </div>
          )}

          {/* Email Receipt Section */}
          {!emailSent ? (
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-900">Email Receipt</h4>
              <div className="space-y-3">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email address"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00d9ff] focus:border-transparent text-gray-900 placeholder-gray-400"
                  />
                </div>
                
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <div className="flex items-start space-x-2">
                      <AlertCircle className="w-4 h-4 text-red-600 mt-0.5" />
                      <p className="text-sm text-red-700">{error}</p>
                    </div>
                  </div>
                )}
                
                <button
                  onClick={handleSendEmail}
                  disabled={isSending || !email.trim()}
                  className={`w-full py-2 px-4 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2 ${
                    isSending || !email.trim()
                      ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                      : 'bg-[#00d9ff] text-white hover:bg-[#00c4e6]'
                  }`}
                >
                  {isSending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Sending...</span>
                    </>
                  ) : (
                    <>
                      <Mail className="w-4 h-4" />
                      <span>Send Receipt</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <div>
                  <h4 className="font-medium text-green-900">Receipt Sent!</h4>
                  <p className="text-sm text-green-700">
                    Your receipt has been sent to {email}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 rounded-b-2xl">
          <div className="space-y-3">
            {!emailSent && (
              <button
                onClick={handleSkip}
                className="w-full border-2 border-gray-300 text-gray-700 py-3 px-4 rounded-xl font-medium hover:bg-gray-50 transition-colors"
              >
                Skip Email
              </button>
            )}
            
            <button
              onClick={emailSent ? (onContinue || onSkip) : onClose}
              className="w-full bg-[#00d9ff] text-white py-3 px-4 rounded-xl font-semibold hover:bg-[#00c4e6] transition-colors"
            >
              {emailSent ? 'Continue' : 'Close'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
