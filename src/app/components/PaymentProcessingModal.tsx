'use client';

import { useState } from 'react';
import { X, Smartphone, CreditCard, DollarSign, MoreHorizontal, ArrowLeft, Check } from 'lucide-react';

interface PaymentProcessingModalProps {
  isOpen: boolean;
  onClose: () => void;
  paymentAmount: number;
  paymentType: 'individual' | 'table';
  onPaymentConfirmed: (method: string) => void;
}

type PaymentMethod = 'mobile-money' | 'card' | 'cash' | 'other';

export default function PaymentProcessingModal({
  isOpen,
  onClose,
  paymentAmount,
  paymentType,
  onPaymentConfirmed
}: PaymentProcessingModalProps) {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [step, setStep] = useState<'select' | 'process'>('select');

  if (!isOpen) return null;

  const handleMethodSelect = (method: PaymentMethod) => {
    setSelectedMethod(method);
    setStep('process');
  };

  const handleBack = () => {
    setStep('select');
    setSelectedMethod(null);
  };

  const handleConfirmPayment = () => {
    if (selectedMethod) {
      onPaymentConfirmed(selectedMethod);
      onClose();
      // Reset state
      setStep('select');
      setSelectedMethod(null);
    }
  };

  const formatAmount = (amount: number) => {
    return `P${amount.toFixed(2)}`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">
            {step === 'select' ? 'Select Payment Method' : 'Process Payment'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {step === 'select' ? (
            /* Payment Method Selection */
            <div className="space-y-4">
              <div className="text-center mb-6">
                <p className="text-lg font-semibold text-gray-900">
                  {paymentType === 'individual' ? 'Individual Payment' : 'Table Payment'}
                </p>
                <p className="text-2xl font-bold text-[#00d9ff] mt-2">
                  {formatAmount(paymentAmount)}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Mobile Money */}
                <button
                  onClick={() => handleMethodSelect('mobile-money')}
                  className="flex flex-col items-center p-6 border-2 border-gray-200 rounded-xl hover:border-[#00d9ff] hover:bg-blue-50 transition-all duration-200 group"
                >
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-3 group-hover:bg-blue-200 transition-colors">
                    <Smartphone className="w-6 h-6 text-blue-600" />
                  </div>
                  <span className="font-medium text-gray-900">Mobile Money</span>
                </button>

                {/* Card */}
                <button
                  onClick={() => handleMethodSelect('card')}
                  className="flex flex-col items-center p-6 border-2 border-gray-200 rounded-xl hover:border-[#00d9ff] hover:bg-green-50 transition-all duration-200 group"
                >
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-3 group-hover:bg-green-200 transition-colors">
                    <CreditCard className="w-6 h-6 text-green-600" />
                  </div>
                  <span className="font-medium text-gray-900">Card</span>
                </button>

                {/* Cash */}
                <button
                  onClick={() => handleMethodSelect('cash')}
                  className="flex flex-col items-center p-6 border-2 border-gray-200 rounded-xl hover:border-[#00d9ff] hover:bg-yellow-50 transition-all duration-200 group"
                >
                  <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mb-3 group-hover:bg-yellow-200 transition-colors">
                    <DollarSign className="w-6 h-6 text-yellow-600" />
                  </div>
                  <span className="font-medium text-gray-900">Cash</span>
                </button>

                {/* Other */}
                <button
                  onClick={() => handleMethodSelect('other')}
                  className="flex flex-col items-center p-6 border-2 border-gray-200 rounded-xl hover:border-[#00d9ff] hover:bg-gray-50 transition-all duration-200 group"
                >
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3 group-hover:bg-gray-200 transition-colors">
                    <MoreHorizontal className="w-6 h-6 text-gray-600" />
                  </div>
                  <span className="font-medium text-gray-900">Other</span>
                </button>
              </div>
            </div>
          ) : (
            /* Payment Processing */
            <div className="space-y-6">
              {/* Back Button */}
              <button
                onClick={handleBack}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>

              {/* Payment Method Header */}
              <div className="text-center">
                <div className="w-16 h-16 bg-[#00d9ff] rounded-full flex items-center justify-center mx-auto mb-4">
                  {selectedMethod === 'mobile-money' && <Smartphone className="w-8 h-8 text-white" />}
                  {selectedMethod === 'card' && <CreditCard className="w-8 h-8 text-white" />}
                  {selectedMethod === 'cash' && <DollarSign className="w-8 h-8 text-white" />}
                  {selectedMethod === 'other' && <MoreHorizontal className="w-8 h-8 text-white" />}
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  {selectedMethod === 'mobile-money' && 'Mobile Money Payment'}
                  {selectedMethod === 'card' && 'Card Payment'}
                  {selectedMethod === 'cash' && 'Cash Payment'}
                  {selectedMethod === 'other' && 'Other Payment'}
                </h3>
                <p className="text-2xl font-bold text-[#00d9ff]">
                  {formatAmount(paymentAmount)}
                </p>
              </div>

              {/* Payment Method Specific Content */}
              {selectedMethod === 'mobile-money' && (
                <div className="space-y-4">
                  {/* QR Code Placeholder */}
                  <div className="bg-gray-100 rounded-lg p-8 text-center">
                    <div className="w-32 h-32 bg-white rounded-lg mx-auto mb-4 flex items-center justify-center border-2 border-dashed border-gray-300">
                      <span className="text-gray-500 text-sm">QR Code</span>
                    </div>
                    <p className="text-sm text-gray-600">
                      Customer should scan this QR code with their mobile money app
                    </p>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-sm text-blue-800 font-medium">
                      Payment will be processed automatically once scanned
                    </p>
                  </div>
                </div>
              )}

              {selectedMethod === 'card' && (
                <div className="space-y-4">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
                    <CreditCard className="w-12 h-12 text-green-600 mx-auto mb-3" />
                    <p className="text-green-800 font-medium">
                      Process card payment at the terminal
                    </p>
                  </div>
                </div>
              )}

              {selectedMethod === 'cash' && (
                <div className="space-y-4">
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
                    <DollarSign className="w-12 h-12 text-yellow-600 mx-auto mb-3" />
                    <p className="text-yellow-800 font-medium">
                      Collect cash payment from customer
                    </p>
                  </div>
                </div>
              )}

              {selectedMethod === 'other' && (
                <div className="space-y-4">
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
                    <MoreHorizontal className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-800 font-medium">
                      Process payment using other method
                    </p>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex space-x-3">
                <button
                  onClick={handleBack}
                  className="flex-1 py-3 px-4 border-2 border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleConfirmPayment}
                  className="flex-1 py-3 px-4 bg-[#00d9ff] text-white rounded-lg font-medium hover:bg-[#00c4e6] transition-colors flex items-center justify-center space-x-2"
                >
                  <Check className="w-4 h-4" />
                  <span>Confirm Payment</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
