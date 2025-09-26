'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LogIn, User, Key, ArrowRight, AlertCircle } from 'lucide-react';

export default function StaffPinEntryPage() {
  const [staffId, setStaffId] = useState('');
  const [staffName, setStaffName] = useState('');
  const [deviceId, setDeviceId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  // Check if staff is already logged in
  useEffect(() => {
    const checkExistingLogin = () => {
      const existingStaff = localStorage.getItem('staff');
      if (existingStaff) {
        try {
          const staff = JSON.parse(existingStaff);
          if (staff && staff.staffId) {
            // Redirect to dashboard if already logged in
            router.push('/staff/dashboard');
          }
        } catch (error) {
          console.error('Error parsing existing staff data:', error);
          localStorage.removeItem('staff');
        }
      }
    };

    checkExistingLogin();
  }, [router]);

  const handleStaffLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffId.trim()) {
      setError('Please enter your Staff ID');
      return;
    }
    
    if (!staffName.trim()) {
      setError('Please enter your name');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/staff/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          staffId: staffId.trim(),
          deviceId: deviceId.trim() || null,
          staffName: staffName.trim(),
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Store staff data in localStorage
        localStorage.setItem('staff', JSON.stringify(data.staff));
        console.log('✅ Staff logged in successfully:', data.staff.name);
        
        // Redirect to dashboard
        router.push('/staff/dashboard');
      } else {
        console.error('❌ Staff login failed:', data.error);
        setError(data.error || 'Login failed');
      }
    } catch (error) {
      console.error('❌ Staff login error:', error);
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-[#00d9ff] rounded-full flex items-center justify-center mx-auto mb-4">
            <User className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Staff Portal</h1>
          <p className="text-gray-600">Enter your credentials and name to access the dashboard</p>
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <form onSubmit={handleStaffLogin} className="space-y-6">
            {/* Staff ID Input */}
            <div>
              <label htmlFor="staffId" className="block text-sm font-medium text-gray-700 mb-2">
                Staff ID
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Key className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  id="staffId"
                  name="staffId"
                  value={staffId}
                  onChange={(e) => setStaffId(e.target.value)}
                  placeholder="e.g., STAFF001, W001, EMP-2024-003, 12345, THABO.M"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00d9ff] focus:border-transparent transition-colors text-gray-900"
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Staff Name Input */}
            <div>
              <label htmlFor="staffName" className="block text-sm font-medium text-gray-700 mb-2">
                Your Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  id="staffName"
                  name="staffName"
                  value={staffName}
                  onChange={(e) => setStaffName(e.target.value)}
                  placeholder="e.g., John Smith, Sarah, Thabo"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00d9ff] focus:border-transparent transition-colors text-gray-900"
                  required
                  disabled={isLoading}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">This is how customers will see you</p>
            </div>

            {/* Device ID Input (Optional) */}
            <div>
              <label htmlFor="deviceId" className="block text-sm font-medium text-gray-700 mb-2">
                Device ID (Optional)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  id="deviceId"
                  name="deviceId"
                  value={deviceId}
                  onChange={(e) => setDeviceId(e.target.value)}
                  placeholder="e.g., TABLET-01, PHONE-123, DESKTOP-001"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00d9ff] focus:border-transparent transition-colors text-gray-900"
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Error Display */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="font-medium text-red-900">Login Failed</h3>
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || !staffId.trim() || !staffName.trim()}
              className="w-full bg-[#00d9ff] hover:bg-[#00c7e6] disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  <span>Access Dashboard</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          {/* Help Text */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              Need help? Contact your manager for your Staff ID
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-sm text-gray-500">
            Restaurant Ordering System • Staff Portal
          </p>
        </div>
      </div>
    </div>
  );
}
