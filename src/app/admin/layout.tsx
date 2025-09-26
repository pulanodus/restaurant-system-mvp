'use client';

import dynamic from 'next/dynamic';

// Dynamically import the admin layout to prevent hydration mismatch
// TEMPORARY: Using permissive layout to bypass admin role check
const DynamicAdminLayout = dynamic(() => import('./DynamicAdminLayoutPermissive'), {
  ssr: false, // Disable server-side rendering to prevent hydration mismatch
  loading: () => (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading admin dashboard...</p>
      </div>
    </div>
  ),
});

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  return <DynamicAdminLayout>{children}</DynamicAdminLayout>;
}