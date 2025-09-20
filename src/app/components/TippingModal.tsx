'use client';

import { useState, useEffect } from 'react';
import { X, Percent, Calculator, CreditCard } from 'lucide-react';

interface TippingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onContinue: (tipAmount: number, finalTotal: number) => void;
  subtotal: number;
  vat: number;
  sessionId: string;
}

export default function TippingModal({
  isOpen,
  onClose,
  onContinue,
  subtotal,
  vat,
  sessionId
}: TippingModalProps) {
  const [tipAmount, setTipAmount] = useState<number>(0);
  const [customTip, setCustomTip] = useState<string>('');
  const [selectedTipType, setSelectedTipType] = useState<'percentage' | 'custom'>('percentage');
  const [selectedPercentage, setSelectedPercentage] = useState<number>(0);

  // Calculate totals
  const preTaxTotal = subtotal;
  const vatAmount = vat;
  const tipAmountValue = tipAmount;
  const finalTotal = preTaxTotal + vatAmount + tipAmountValue;

  // Quick tip percentage options
  const tipPercentages = [
    { label: '10%', value: 10, amount: preTaxTotal * 0.10 },
    { label: '15%', value: 15, amount: preTaxTotal * 0.15 },
    { label: '20%', value: 20, amount: preTaxTotal * 0.20 }
  ];

  // Update tip amount when percentage selection changes
  useEffect(() => {
    if (selectedTipType === 'percentage' && selectedPercentage > 0) {
      setTipAmount(preTaxTotal * (selectedPercentage / 100));
      setCustomTip('');
    }
  }, [selectedPercentage, preTaxTotal, selectedTipType]);

  // Update tip amount when custom tip changes
  useEffect(() => {
    if (selectedTipType === 'custom') {
      const customAmount = parseFloat(customTip) || 0;
      setTipAmount(customAmount);
    }
  }, [customTip, selectedTipType]);

  // Handle percentage tip selection
  const handlePercentageSelect = (percentage: number) => {
    setSelectedTipType('percentage');
    setSelectedPercentage(percentage);
    setCustomTip('');
  };

  // Handle custom tip input
  const handleCustomTipChange = (value: string) => {
    setSelectedTipType('custom');
    setCustomTip(value);
    setSelectedPercentage(0);
  };

  // Handle continue with tip
  const handleContinueWithTip = () => {
    onContinue(tipAmount, finalTotal);
  };

  // Handle continue without tip
  const handleContinueWithoutTip = () => {
    onContinue(0, preTaxTotal + vatAmount);
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return `P${amount.toFixed(2)}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto transform transition-all duration-300 ease-out scale-100">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-[#00d9ff] rounded-full flex items-center justify-center">
                <Percent className="w-4 h-4 text-white" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Add Tip (optional)</h2>
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
          {/* Bill Summary */}
          <div className="bg-gray-50 rounded-xl p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Bill Summary</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal:</span>
                <span className="font-medium text-gray-900">{formatCurrency(preTaxTotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">VAT (14%):</span>
                <span className="font-medium text-gray-900">{formatCurrency(vatAmount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Tip:</span>
                <span className="font-medium text-gray-900">{formatCurrency(tipAmountValue)}</span>
              </div>
              <div className="border-t border-gray-300 pt-2 mt-2">
                <div className="flex justify-between text-lg font-bold">
                  <span className="text-gray-900">Total:</span>
                  <span className="text-[#00d9ff]">{formatCurrency(finalTotal)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Tip Options */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Quick Tip Options</h3>
            <div className="grid grid-cols-3 gap-3">
              {tipPercentages.map((tip) => (
                <button
                  key={tip.value}
                  onClick={() => handlePercentageSelect(tip.value)}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    selectedTipType === 'percentage' && selectedPercentage === tip.value
                      ? 'border-[#00d9ff] bg-blue-50'
                      : 'border-gray-200 hover:border-[#00d9ff] hover:bg-gray-50'
                  }`}
                >
                  <div className="text-center">
                    <div className={`text-lg font-bold ${
                      selectedTipType === 'percentage' && selectedPercentage === tip.value
                        ? 'text-[#00d9ff]'
                        : 'text-gray-900'
                    }`}>
                      {tip.label}
                    </div>
                    <div className={`text-sm ${
                      selectedTipType === 'percentage' && selectedPercentage === tip.value
                        ? 'text-[#00d9ff]'
                        : 'text-gray-600'
                    }`}>
                      {formatCurrency(tip.amount)}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Custom Tip Input */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Custom Amount</h3>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-500 text-lg font-medium">P</span>
              </div>
              <input
                type="number"
                value={customTip}
                onChange={(e) => handleCustomTipChange(e.target.value)}
                placeholder="0.00"
                min="0"
                step="0.01"
                className={`w-full pl-8 pr-4 py-3 border-2 rounded-xl text-lg font-medium transition-colors text-gray-900 placeholder-gray-400 ${
                  selectedTipType === 'custom'
                    ? 'border-[#00d9ff] focus:border-[#00d9ff] focus:ring-2 focus:ring-[#00d9ff] focus:ring-opacity-20'
                    : 'border-gray-200 focus:border-[#00d9ff] focus:ring-2 focus:ring-[#00d9ff] focus:ring-opacity-20'
                }`}
              />
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 rounded-b-2xl">
          <div className="space-y-2">
            {/* Continue with Tip Button */}
            <button
              onClick={handleContinueWithTip}
              className="w-full bg-[#00d9ff] text-white py-3 px-4 rounded-xl font-semibold hover:bg-[#00c4e6] transition-colors flex items-center justify-center space-x-2 shadow-sm"
            >
              <CreditCard className="w-4 h-4" />
              <span>Continue with {formatCurrency(finalTotal)}</span>
            </button>

            {/* Continue without Tip Button */}
            <button
              onClick={handleContinueWithoutTip}
              className="w-full border-2 border-gray-300 text-gray-700 py-3 px-4 rounded-xl font-medium hover:bg-gray-50 transition-colors"
            >
              Continue without Tip
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
