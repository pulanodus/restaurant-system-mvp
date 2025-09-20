'use client';

import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';
import { FileText, ArrowLeft, CheckCircle } from 'lucide-react';

export default function WaiterBillPage() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('sessionId');
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleRequestBill = () => {
    // In a real app, this would send a request to the backend
    setIsSubmitted(true);
    setTimeout(() => {
      setIsSubmitted(false);
    }, 3000);
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full mx-4 text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Bill Request Sent!</h1>
          <p className="text-gray-600 mb-6">A waiter will bring your bill shortly.</p>
          <Link
            href={sessionId ? `/session/${sessionId}` : '/'}
            className="inline-flex items-center px-4 py-2 bg-[#00d9ff] text-white rounded-lg hover:bg-[#00c4e6] transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Menu
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm p-4">
        <div className="flex items-center justify-between">
          <Link
            href={sessionId ? `/session/${sessionId}` : '/'}
            className="flex items-center text-[#00d9ff] hover:underline"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Menu
          </Link>
          <h1 className="text-xl font-bold text-gray-800">Request Bill</h1>
          <div className="w-20"></div> {/* Spacer for centering */}
        </div>
      </header>

      <main className="p-4">
        <div className="bg-white rounded-lg shadow-sm p-6 max-w-md mx-auto">
          <div className="text-center mb-6">
            <FileText className="w-16 h-16 text-[#00d9ff] mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Ready for your bill?</h2>
            <p className="text-gray-600">We'll prepare your bill and bring it to your table.</p>
          </div>

          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold text-gray-800 mb-2">What happens next:</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Your bill will be prepared</li>
                <li>• A waiter will bring it to your table</li>
                <li>• You can pay when ready</li>
                <li>• Multiple payment options available</li>
              </ul>
            </div>

            <button
              onClick={handleRequestBill}
              className="w-full py-3 bg-[#00d9ff] text-white rounded-lg hover:bg-[#00c4e6] transition-colors font-medium"
            >
              Request Bill
            </button>

            <p className="text-xs text-gray-500 text-center">
              A waiter will be notified and will bring your bill shortly.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
