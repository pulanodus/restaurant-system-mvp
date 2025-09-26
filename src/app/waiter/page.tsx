import BottomNavBar from '@/app/components/BottomNavBar';

interface WaiterPageProps {
  searchParams: {
    sessionId?: string;
  };
}

export default function WaiterPage({ searchParams }: WaiterPageProps) {
  const sessionId = searchParams.sessionId || 'default-session';

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <div className="container mx-auto p-4 max-w-4xl">
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h1 className="text-3xl font-bold mb-2 text-gray-800">Call Waiter</h1>
          <p className="text-gray-600">Request assistance from restaurant staff</p>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-5 5v-5zM4 19h6v-1a3 3 0 00-3-3H7a3 3 0 00-3 3v1zM4 7a3 3 0 013-3h4a3 3 0 013 3v1H4V7zM10 11a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1a3 3 0 01-3 3H10z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">Waiter Service Coming Soon</h3>
            <p className="text-gray-500 mb-6">
              We&apos;re developing a smart waiter calling system that will notify restaurant staff when you need assistance.
            </p>
            <div className="style={{ backgroundColor: '#f0fdff' }} border style={{ borderColor: '#ccf2ff' }} rounded-lg p-4">
              <h4 className="font-medium style={{ color: '#00d9ff' }} mb-2">Planned Features:</h4>
              <ul className="text-sm style={{ color: '#00d9ff' }} space-y-1">
                <li>• Quick waiter call button</li>
                <li>• Custom assistance requests</li>
                <li>• Table status updates</li>
                <li>• Estimated response time</li>
                <li>• Notification system for staff</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
      
      {/* Bottom Navigation Bar */}
      <BottomNavBar sessionId={sessionId} />
    </div>
  );
}
