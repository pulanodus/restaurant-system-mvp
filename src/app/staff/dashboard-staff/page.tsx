'use client';

import { useState } from 'react';
import StaffLogin from '@/app/components/StaffLogin';
import FilteredStaffDashboard from '@/app/components/FilteredStaffDashboard';

interface StaffMember {
  id: string;
  staffId: string;
  name: string;
  email?: string;
  role: string;
}

export default function StaffDashboardPage() {
  const [staff, setStaff] = useState<StaffMember | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const handleLogin = (staffData: StaffMember, staffSessionId: string) => {
    setStaff(staffData);
    setSessionId(staffSessionId);
  };

  const handleLogout = () => {
    setStaff(null);
    setSessionId(null);
  };

  if (!staff || !sessionId) {
    return <StaffLogin onLogin={handleLogin} />;
  }

  return (
    <FilteredStaffDashboard
      staff={staff}
      sessionId={sessionId}
      onLogout={handleLogout}
    />
  );
}
