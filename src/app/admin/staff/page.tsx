'use client';

import { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  Plus, 
  Edit, 
  Trash2, 
  RefreshCw,
  Users,
  UserPlus,
  Shield,
  Clock,
  CheckCircle,
  XCircle
} from 'lucide-react';

interface StaffMember {
  id: string;
  email: string;
  name?: string;
  role: 'admin' | 'staff' | 'manager';
  status: 'active' | 'inactive';
  last_login?: string;
  created_at: string;
  permissions: string[];
}

export default function AdminStaffPage() {
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [filteredStaff, setFilteredStaff] = useState<StaffMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    fetchStaffMembers();
  }, []);

  useEffect(() => {
    filterStaff();
  }, [staffMembers, searchQuery, selectedRole, selectedStatus]);

  const fetchStaffMembers = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // For now, we'll use mock data since we don't have a staff table yet
      // In a real app, this would fetch from a staff/profiles table
      const mockStaff: StaffMember[] = [
        {
          id: '1',
          email: 'admin@pulanodas.com',
          name: 'Admin User',
          role: 'admin',
          status: 'active',
          last_login: new Date().toISOString(),
          created_at: new Date().toISOString(),
          permissions: ['all']
        },
        {
          id: '2',
          email: 'manager@pulanodas.com',
          name: 'Restaurant Manager',
          role: 'manager',
          status: 'active',
          last_login: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
          created_at: new Date(Date.now() - 2592000000).toISOString(), // 30 days ago
          permissions: ['orders', 'payments', 'menu']
        },
        {
          id: '3',
          email: 'staff1@pulanodas.com',
          name: 'Wait Staff 1',
          role: 'staff',
          status: 'active',
          last_login: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
          created_at: new Date(Date.now() - 1209600000).toISOString(), // 14 days ago
          permissions: ['orders', 'payments']
        },
        {
          id: '4',
          email: 'staff2@pulanodas.com',
          name: 'Wait Staff 2',
          role: 'staff',
          status: 'inactive',
          last_login: new Date(Date.now() - 604800000).toISOString(), // 7 days ago
          created_at: new Date(Date.now() - 7776000000).toISOString(), // 90 days ago
          permissions: ['orders']
        }
      ];

      setStaffMembers(mockStaff);
    } catch (error) {
      console.error('Error fetching staff members:', error);
      setError('Failed to load staff members');
    } finally {
      setIsLoading(false);
    }
  };

  const filterStaff = () => {
    let filtered = [...staffMembers];

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(staff => 
        staff.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        staff.name?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by role
    if (selectedRole !== 'all') {
      filtered = filtered.filter(staff => staff.role === selectedRole);
    }

    // Filter by status
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(staff => staff.status === selectedStatus);
    }

    setFilteredStaff(filtered);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800';
      case 'manager':
        return 'bg-blue-100 text-blue-800';
      case 'staff':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    return status === 'active' ? 
      <CheckCircle className="w-4 h-4 text-green-600" /> : 
      <XCircle className="w-4 h-4 text-red-600" />;
  };

  const getUniqueRoles = () => {
    return [...new Set(staffMembers.map(staff => staff.role))];
  };

  const getUniqueStatuses = () => {
    return [...new Set(staffMembers.map(staff => staff.status))];
  };

  const toggleStaffStatus = async (staffId: string) => {
    try {
      // In a real app, this would update the database
      setStaffMembers(prev => prev.map(staff => 
        staff.id === staffId 
          ? { ...staff, status: staff.status === 'active' ? 'inactive' : 'active' }
          : staff
      ));
    } catch (error) {
      console.error('Error updating staff status:', error);
      setError('Failed to update staff status');
    }
  };

  const deleteStaffMember = async (staffId: string) => {
    if (!confirm('Are you sure you want to delete this staff member?')) return;
    
    try {
      // In a real app, this would delete from the database
      setStaffMembers(prev => prev.filter(staff => staff.id !== staffId));
    } catch (error) {
      console.error('Error deleting staff member:', error);
      setError('Failed to delete staff member');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Staff Management</h1>
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#00d9ff]"></div>
        </div>
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 space-y-4">
            {[...Array(4)].map((_, i) => (
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
          <h1 className="text-2xl font-bold text-gray-900">Staff Management</h1>
          <p className="text-gray-600">Manage restaurant staff members and their permissions</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center px-4 py-2 text-sm font-medium text-white bg-[#00d9ff] rounded-lg hover:bg-[#00c4e6] transition-colors"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Add Staff
          </button>
          <button
            onClick={fetchStaffMembers}
            className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Staff</p>
              <p className="text-2xl font-bold text-gray-900">{staffMembers.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Staff</p>
              <p className="text-2xl font-bold text-gray-900">
                {staffMembers.filter(s => s.status === 'active').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Shield className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Admins</p>
              <p className="text-2xl font-bold text-gray-900">
                {staffMembers.filter(s => s.role === 'admin').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Clock className="h-6 w-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Online Today</p>
              <p className="text-2xl font-bold text-gray-900">
                {staffMembers.filter(s => {
                  if (!s.last_login) return false;
                  const today = new Date();
                  const lastLogin = new Date(s.last_login);
                  return lastLogin.toDateString() === today.toDateString();
                }).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-center mb-4">
          <Filter className="h-5 w-5 text-gray-400 mr-2" />
          <h3 className="text-lg font-medium text-gray-900">Filters</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search */}
          <div className="lg:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search staff members..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00d9ff]"
              />
            </div>
          </div>

          {/* Role Filter */}
          <div>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00d9ff]"
            >
              <option value="all">All Roles</option>
              {getUniqueRoles().map(role => (
                <option key={role} value={role}>
                  {role.charAt(0).toUpperCase() + role.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00d9ff]"
            >
              <option value="all">All Status</option>
              {getUniqueStatuses().map(status => (
                <option key={status} value={status}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Results Summary */}
      <div className="bg-[#f0fdff] border border-[#ccf2ff] rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Users className="h-5 w-5 text-[#00d9ff] mr-2" />
            <span className="text-[#00d9ff] font-medium">
              Showing {filteredStaff.length} of {staffMembers.length} staff members
            </span>
          </div>
          <span className="text-[#00d9ff] text-sm">
            Last updated: {new Date().toLocaleTimeString()}
          </span>
        </div>
      </div>

      {/* Staff Members List */}
      <div className="bg-white rounded-lg shadow">
        <div className="divide-y divide-gray-200">
          {filteredStaff.length > 0 ? (
            filteredStaff.map((staff) => (
              <div key={staff.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-3">
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(staff.status)}
                        <span className="font-medium text-gray-900">
                          {staff.name || 'No Name'}
                        </span>
                      </div>
                      <div className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(staff.role)}`}>
                        {staff.role.charAt(0).toUpperCase() + staff.role.slice(1)}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <h4 className="font-medium text-gray-900">Email</h4>
                        <p className="text-sm text-gray-600">{staff.email}</p>
                      </div>
                      
                      <div>
                        <h4 className="font-medium text-gray-900">Last Login</h4>
                        <p className="text-sm text-gray-600">
                          {staff.last_login ? formatDate(staff.last_login) : 'Never'}
                        </p>
                      </div>
                      
                      <div>
                        <h4 className="font-medium text-gray-900">Permissions</h4>
                        <div className="flex flex-wrap gap-1">
                          {staff.permissions.map((permission) => (
                            <span
                              key={permission}
                              className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                            >
                              {permission}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => toggleStaffStatus(staff.id)}
                      className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                        staff.status === 'active'
                          ? 'bg-red-100 text-red-800 hover:bg-red-200'
                          : 'bg-green-100 text-green-800 hover:bg-green-200'
                      }`}
                    >
                      {staff.status === 'active' ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      onClick={() => {/* Edit functionality */}}
                      className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </button>
                    <button
                      onClick={() => deleteStaffMember(staff.id)}
                      className="flex items-center px-3 py-2 text-sm font-medium text-red-700 bg-white border border-red-300 rounded-lg hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="p-12 text-center">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No staff members found</h3>
              <p className="text-gray-600">
                {staffMembers.length === 0 
                  ? 'No staff members have been added yet.'
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
