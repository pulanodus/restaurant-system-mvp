'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { handleError } from '@/lib/error-handling';
import { 
  Search, 
  Filter, 
  Download, 
  RefreshCw,
  Shield,
  Clock,
  User,
  AlertTriangle,
  CheckCircle,
  Settings,
  XCircle,
  Info
} from 'lucide-react';

interface AuditLogEntry {
  id: string;
  session_id?: string;
  action: string;
  details: any;
  performed_by: string;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

const actionIcons: Record<string, any> = {
  'manager_bill_adjustment': AlertTriangle,
  'table_transfer': User,
  'staff_login': CheckCircle,
  'staff_logout': XCircle,
  'pin_generation': Shield,
  'order_status_change': Info,
  'payment_processing': CheckCircle,
  'session_creation': Clock,
  'session_completion': CheckCircle,
  'system_configuration_change': Settings
};

const actionColors: Record<string, string> = {
  'manager_bill_adjustment': 'text-orange-600',
  'table_transfer': 'text-blue-600',
  'staff_login': 'text-green-600',
  'staff_logout': 'text-red-600',
  'pin_generation': 'text-purple-600',
  'order_status_change': 'text-yellow-600',
  'payment_processing': 'text-green-600',
  'session_creation': 'text-blue-600',
  'session_completion': 'text-green-600',
  'system_configuration_change': 'text-gray-600'
};

export default function AuditLogPage() {
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<AuditLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAction, setSelectedAction] = useState('all');
  const [selectedUser, setSelectedUser] = useState('all');
  const [dateRange, setDateRange] = useState('today');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAuditLogs();
  }, []);

  useEffect(() => {
    filterLogs();
  }, [auditLogs, searchQuery, selectedAction, selectedUser, dateRange]);

  const fetchAuditLogs = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch audit logs using service role
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1000);

      if (error) throw error;

      setAuditLogs(data || []);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      setError('Failed to load audit logs');
    } finally {
      setIsLoading(false);
    }
  };

  const filterLogs = () => {
    let filtered = [...auditLogs];

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(log => 
        log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.performed_by.toLowerCase().includes(searchQuery.toLowerCase()) ||
        JSON.stringify(log.details).toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by action
    if (selectedAction !== 'all') {
      filtered = filtered.filter(log => log.action === selectedAction);
    }

    // Filter by user
    if (selectedUser !== 'all') {
      filtered = filtered.filter(log => log.performed_by === selectedUser);
    }

    // Filter by date range
    const now = new Date();
    let startDate: Date;

    switch (dateRange) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      default:
        startDate = new Date(0);
    }

    filtered = filtered.filter(log => new Date(log.created_at) >= startDate);

    setFilteredLogs(filtered);
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString()
    };
  };

  const formatActionName = (action: string) => {
    return action.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const getUniqueActions = () => {
    return [...new Set(auditLogs.map(log => log.action))];
  };

  const getUniqueUsers = () => {
    return [...new Set(auditLogs.map(log => log.performed_by))];
  };

  const exportAuditLogs = () => {
    const csvContent = [
      ['Timestamp', 'Action', 'Performed By', 'Details', 'IP Address'],
      ...filteredLogs.map(log => [
        log.created_at,
        log.action,
        log.performed_by,
        JSON.stringify(log.details),
        log.ip_address || ''
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-log-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Audit Log</h1>
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#00d9ff]"></div>
        </div>
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded animate-pulse"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Audit Log</h1>
          <p className="text-gray-600">System activity and security audit trail</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={exportAuditLogs}
            className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </button>
          <button
            onClick={fetchAuditLogs}
            className="flex items-center px-4 py-2 text-sm font-medium text-white bg-[#00d9ff] rounded-lg hover:bg-[#00c4e6] transition-colors"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-center mb-4">
          <Filter className="h-5 w-5 text-gray-400 mr-2" />
          <h3 className="text-lg font-medium text-gray-900">Filters</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Search */}
          <div className="lg:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search logs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00d9ff]"
              />
            </div>
          </div>

          {/* Action Filter */}
          <div>
            <select
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00d9ff]"
            >
              <option value="all">All Actions</option>
              {getUniqueActions().map(action => (
                <option key={action} value={action}>
                  {formatActionName(action)}
                </option>
              ))}
            </select>
          </div>

          {/* User Filter */}
          <div>
            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00d9ff]"
            >
              <option value="all">All Users</option>
              {getUniqueUsers().map(user => (
                <option key={user} value={user}>
                  {user}
                </option>
              ))}
            </select>
          </div>

          {/* Date Range Filter */}
          <div>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00d9ff]"
            >
              <option value="today">Today</option>
              <option value="week">Last 7 Days</option>
              <option value="month">This Month</option>
              <option value="all">All Time</option>
            </select>
          </div>
        </div>
      </div>

      {/* Results Summary */}
      <div className="bg-[#f0fdff] border border-[#ccf2ff] rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Shield className="h-5 w-5 text-[#00d9ff] mr-2" />
            <span className="text-[#00d9ff] font-medium">
              Showing {filteredLogs.length} of {auditLogs.length} audit entries
            </span>
          </div>
          <span className="text-[#00d9ff] text-sm">
            Last updated: {new Date().toLocaleTimeString()}
          </span>
        </div>
      </div>

      {/* Audit Log Entries */}
      <div className="bg-white rounded-lg shadow">
        <div className="divide-y divide-gray-200">
          {filteredLogs.length > 0 ? (
            filteredLogs.map((log) => {
              const Icon = actionIcons[log.action] || Info;
              const color = actionColors[log.action] || 'text-gray-600';
              const timestamp = formatTimestamp(log.created_at);

              return (
                <div key={log.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start space-x-4">
                    <div className={`flex-shrink-0 ${color}`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium text-gray-900">
                          {formatActionName(log.action)}
                        </h4>
                        <div className="text-sm text-gray-500">
                          <div>{timestamp.date}</div>
                          <div>{timestamp.time}</div>
                        </div>
                      </div>
                      
                      <div className="mt-2 space-y-1">
                        <div className="flex items-center text-sm text-gray-600">
                          <User className="h-4 w-4 mr-2" />
                          <span>Performed by: <span className="font-medium">{log.performed_by}</span></span>
                        </div>
                        
                        {log.session_id && (
                          <div className="text-sm text-gray-600">
                            Session ID: <span className="font-mono text-xs">{log.session_id}</span>
                          </div>
                        )}
                        
                        {log.ip_address && (
                          <div className="text-sm text-gray-600">
                            IP: <span className="font-mono text-xs">{log.ip_address}</span>
                          </div>
                        )}
                      </div>

                      {/* Details */}
                      {log.details && Object.keys(log.details).length > 0 && (
                        <div className="mt-3">
                          <details className="group">
                            <summary className="text-sm text-[#00d9ff] hover:text-[#00c4e6] cursor-pointer">
                              View Details
                            </summary>
                            <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                              <pre className="text-xs text-gray-700 whitespace-pre-wrap">
                                {JSON.stringify(log.details, null, 2)}
                              </pre>
                            </div>
                          </details>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-12 text-center">
              <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No audit entries found</h3>
              <p className="text-gray-600">
                {auditLogs.length === 0 
                  ? 'No audit logs have been recorded yet.'
                  : 'Try adjusting your filters to see more results.'
                }
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
