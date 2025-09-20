'use client';

import { useState, useEffect } from 'react';
import LiveBill from '@/app/components/LiveBill';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface PageProps {
  params: Promise<{ sessionId: string }>;
}

export default function SessionLiveBillPage({ params }: PageProps) {
  const [sessionId, setSessionId] = useState<string>('');

  useEffect(() => {
    params.then(({ sessionId }) => setSessionId(sessionId));
  }, [params]);

  if (!sessionId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00d9ff] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-[480px] mx-auto bg-white min-h-screen">
        {/* Header */}
        <div className="sticky top-0 bg-[#00d9ff] text-white px-4 py-4 z-10">
          <div className="flex items-center justify-between">
            <Link 
              href={`/session/${sessionId}`}
              className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-white hover:bg-opacity-20 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-lg font-semibold">Live Bill</h1>
            <div className="w-10"></div>
          </div>
        </div>

        {/* LiveBill Component */}
        <LiveBill sessionId={sessionId} />
      </div>
    </div>
  );
}
