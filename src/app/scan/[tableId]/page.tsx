// Supabase imports
import { supabase } from '@/lib/supabase';

// Next.js imports
import { redirect } from 'next/navigation';

// Component imports
import TableOptions from '@/app/components/TableOptions';
import QRCodeScanner from '@/app/components/QRCodeScanner';
import ScanPageClient from '@/app/components/ScanPageClient';

interface PageProps {
  params: Promise<{ tableId: string }>;
}

export default async function ScanTablePage({ params }: PageProps) {
  // Await params in Next.js 15
  const { tableId } = await params;
  
  // 1. Fetch the table data based on the ID in the URL
  // First try to find by ID (UUID), then by table_number
  let { data: table, error } = await supabase
    .from('tables')
    .select('*')
    .eq('id', tableId)
    .single();

  // If not found by ID, try by table_number
  if (error || !table) {
    const { data: tableByNumber, error: errorByNumber } = await supabase
      .from('tables')
      .select('*')
      .eq('table_number', tableId)
      .single();
    
    if (errorByNumber || !tableByNumber) {
      redirect('/error?message=Table not found');
    }
    
    table = tableByNumber;
  }

  // 2. Check if this table already has an active session
  const { data: activeSession } = await supabase
    .from('sessions')
    .select('id, started_by_name')
    .eq('table_id', table.id) // Use the actual table UUID, not the tableId parameter
    .eq('status', 'active')
    .maybeSingle();

  return (
    <ScanPageClient
      tableId={tableId}
      table={table}
      activeSession={activeSession}
    />
  );
}