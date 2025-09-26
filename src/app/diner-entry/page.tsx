'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Users } from 'lucide-react';

export default function DinerEntryPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the proper QR code flow
    // The /diner-entry page is redundant - the proper flow is:
    // QR Code → /scan/[tableId] → NameEntryForm (which has proper duplicate prevention)
    router.replace('/');
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="w-16 h-16 bg-[#00d9ff] rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Redirecting...</h1>
          <p className="text-gray-600 mb-6">
            Please use the QR code on your table to join the session. This provides a better experience with proper duplicate prevention.
          </p>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00d9ff] mx-auto"></div>
        </div>
      </div>
    </div>
  );
}