'use client';

import { useState } from 'react';
import { Trash2, RefreshCw, AlertTriangle, CheckCircle, Clock } from 'lucide-react';

interface StaleUser {
  sessionId: string;
  tableNumber: string;
  userName: string;
  lastActive: string;
  sessionCreated: string;
  hoursInactive: number;
  hasLogoutTime: boolean;
}

interface CleanupSummary {
  totalSessions: number;
  totalActiveUsers: number;
  totalStaleUsers: number;
  stalePercentage: number;
}

export default function CleanupPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);
  const [staleUsers, setStaleUsers] = useState<StaleUser[]>([]);
  const [summary, setSummary] = useState<CleanupSummary | null>(null);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [cleanupResult, setCleanupResult] = useState<string | null>(null);

  const checkStaleUsers = async () => {
    setIsLoading(true);
    setCleanupResult(null);

    try {
      const response = await fetch('/api/cleanup/stale-users');
      const data = await response.json();

      if (response.ok) {
        setResults(data);
      } else {
        console.error('❌ Check failed:', data.error);
        setCleanupResult(`❌ Check failed: ${data.error}`);
      }
    } catch (error) {
      console.error('❌ Check error:', error);
      setCleanupResult(`❌ Check error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const cleanStaleUsers = async () => {
    if (!confirm(`Are you sure you want to clean up ${staleUsers.length} stale users? This will mark them as inactive.`)) {
      return;
    }

    setIsCleaning(true);
    setCleanupResult(null);

    try {
      const cleanupApiKey = process.env.NEXT_PUBLIC_CLEANUP_API_KEY;
      if (!cleanupApiKey) {
        throw new Error('Cleanup API key not configured');
      }

      const response = await fetch('/api/cleanup/stale-users', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${cleanupApiKey}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (response.ok) {
        setCleanupResult(`✅ Cleanup completed: ${data.summary.totalCleanedUsers} users cleaned`);
        // Refresh the stale users list
        await checkStaleUsers();
      } else {
        console.error('❌ Cleanup failed:', data.error);
        setCleanupResult(`❌ Cleanup failed: ${data.error}`);
      }
    } catch (error) {
      console.error('❌ Cleanup error:', error);
      setCleanupResult(`❌ Cleanup error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsCleaning(false);
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const getHoursColor = (hours: number) => {
    if (hours > 24) return 'text-red-600 bg-red-50';
    if (hours > 12) return 'text-orange-600 bg-orange-50';
    if (hours > 6) return 'text-yellow-600 bg-yellow-50';
    return 'text-green-600 bg-green-50';
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Stale User Cleanup</h1>
          <p className="text-gray-600">
            Manage users who are stuck as permanently active due to logout failures.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Cleanup Actions</h2>
              <p className="text-gray-600 text-sm">
                Check for stale users (active for more than 2 hours) and clean them up.
              </p>
            </div>
            <div className="flex space-x-4">
              <button
                onClick={checkStaleUsers}
                disabled={isLoading}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                <span>{isLoading ? 'Checking...' : 'Check Stale Users'}</span>
              </button>
              
              <button
                onClick={cleanStaleUsers}
                disabled={isCleaning || staleUsers.length === 0}
                className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Trash2 className={`w-4 h-4 ${isCleaning ? 'animate-spin' : ''}`} />
                <span>{isCleaning ? 'Cleaning...' : `Clean ${staleUsers.length} Users`}</span>
              </button>
            </div>
          </div>

          {lastChecked && (
            <div className="mt-4 flex items-center text-sm text-gray-500">
              <Clock className="w-4 h-4 mr-2" />
              Last checked: {lastChecked.toLocaleString()}
            </div>
          )}

          {cleanupResult && (
            <div className={`mt-4 p-3 rounded-lg ${
              cleanupResult.includes('✅') 
                ? 'bg-green-50 text-green-800 border border-green-200' 
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}>
              {cleanupResult}
            </div>
          )}
        </div>

        {/* Summary */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <RefreshCw className="w-6 h-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Active Sessions</p>
                  <p className="text-2xl font-bold text-gray-900">{summary.totalSessions}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Active Users</p>
                  <p className="text-2xl font-bold text-gray-900">{summary.totalActiveUsers}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center">
                <div className="p-2 bg-red-100 rounded-lg">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Stale Users</p>
                  <p className="text-2xl font-bold text-gray-900">{summary.totalStaleUsers}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center">
                <div className={`p-2 rounded-lg ${
                  summary.stalePercentage > 50 ? 'bg-red-100' : 
                  summary.stalePercentage > 25 ? 'bg-yellow-100' : 'bg-green-100'
                }`}>
                  <AlertTriangle className={`w-6 h-6 ${
                    summary.stalePercentage > 50 ? 'text-red-600' : 
                    summary.stalePercentage > 25 ? 'text-yellow-600' : 'text-green-600'
                  }`} />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Stale %</p>
                  <p className="text-2xl font-bold text-gray-900">{summary.stalePercentage}%</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Stale Users List */}
        {staleUsers.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Stale Users ({staleUsers.length})
              </h3>
              <p className="text-sm text-gray-600">
                Users marked as active for more than 2 hours with no logout timestamp.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Table
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Last Active
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Hours Inactive
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {staleUsers.map((user, index) => (
                    <tr key={`${user.sessionId}-${user.userName}`}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{user.userName}</div>
                        <div className="text-sm text-gray-500">{user.sessionId.slice(0, 8)}...</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        Table {user.tableNumber}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatTime(user.lastActive)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getHoursColor(user.hoursInactive)}`}>
                          {user.hoursInactive}h
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {user.hasLogoutTime ? (
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                            Has Logout Time
                          </span>
                        ) : (
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                            No Logout Time
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">How to Use</h3>
          <div className="space-y-2 text-sm text-blue-800">
            <p><strong>1. Check Stale Users:</strong> Scans all active sessions for users who have been active for more than 2 hours.</p>
            <p><strong>2. Clean Stale Users:</strong> Marks stale users as inactive with a logout timestamp, allowing them to log back in.</p>
            <p><strong>3. Automatic Cleanup:</strong> Set up a cron job to run <code>/api/cron/cleanup-stale-users</code> every hour.</p>
            <p><strong>4. Environment Variables:</strong> Add <code>CLEANUP_API_KEY</code> and <code>CRON_SECRET</code> to your environment.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
