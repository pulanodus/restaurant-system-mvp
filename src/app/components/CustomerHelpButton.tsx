'use client';

import { useState } from 'react';
import { HelpCircle, X } from 'lucide-react';

interface CustomerHelpButtonProps {
  sessionId: string;
  tableNumber?: string;
}

export default function CustomerHelpButton({ sessionId, tableNumber }: CustomerHelpButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [helpType, setHelpType] = useState<'general' | 'urgent'>('general');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/customer/help', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          helpType,
          message: message || 'Customer needs assistance'
        }),
      });

      if (response.ok) {
        const data = await response.json();
        alert(`Help request submitted successfully! Staff will be notified for Table ${data.table_number}.`);
        setIsModalOpen(false);
        setMessage('');
        setHelpType('general');
      } else {
        const error = await response.json();
        alert(`Failed to submit help request: ${error.error}`);
      }
    } catch (error) {
      console.error('Error submitting help request:', error);
      alert('Failed to submit help request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* Help Button */}
      <button
        onClick={() => setIsModalOpen(true)}
        className="fixed bottom-4 right-4 bg-red-500 hover:bg-red-600 text-white p-4 rounded-full shadow-lg transition-colors z-50"
        title="Need help? Click here"
      >
        <HelpCircle className="w-6 h-6" />
      </button>

      {/* Help Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Request Help</h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Type of Help Needed
                </label>
                <select
                  value={helpType}
                  onChange={(e) => setHelpType(e.target.value as 'general' | 'urgent')}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00d9ff] focus:border-transparent"
                >
                  <option value="general">General Assistance</option>
                  <option value="urgent">Urgent Help</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Message (Optional)
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Describe what you need help with..."
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00d9ff] focus:border-transparent h-24 resize-none"
                />
              </div>

              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2 bg-[#00d9ff] text-white rounded-lg hover:bg-[#00c4e6] transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'Submitting...' : 'Request Help'}
                </button>
              </div>
            </form>

            <p className="text-xs text-gray-500 mt-3 text-center">
              Staff will be notified immediately and will assist you shortly.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
