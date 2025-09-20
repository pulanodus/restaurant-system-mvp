// Supabase imports
import { supabase } from '@/lib/supabase';

// Next.js imports
import { redirect } from 'next/navigation';
import Link from 'next/link';

// Component imports
import SessionPageClient from './SessionPageClient';

interface PageProps {
  params: Promise<{ sessionId: string }>;
}

export default async function SessionPage({ params }: PageProps) {
  // Await params in Next.js 15
  const { sessionId } = await params;
  
  // Fetch session and table data
  const { data: session, error: sessionError } = await supabase
    .from('sessions')
    .select('*, tables!sessions_table_id_fkey(*)')
    .eq('id', sessionId)
    .single();

  if (sessionError || !session) {
    redirect('/error?message=Session not found');
  }

  // Only clean up very old orders (older than 24 hours) to avoid clearing recent items
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { error: cleanupError } = await supabase
    .from('orders')
    .delete()
    .eq('session_id', sessionId)
    .lt('created_at', twentyFourHoursAgo);

  if (cleanupError) {
    console.warn('Warning: Failed to cleanup old orders:', cleanupError.message);
    // Don't fail the page load for cleanup errors
  } else {
    console.log('✅ Cleaned up very old orders (24h+) for session:', sessionId);
  }

  // Get the restaurant ID from the table
  const restaurantId = session.tables?.restaurant_id;
  if (!restaurantId) {
    redirect('/error?message=Table not assigned to a restaurant');
  }

  // Fetch restaurant information
  const { data: restaurant, error: restaurantError } = await supabase
    .from('restaurants')
    .select('name')
    .eq('id', restaurantId)
    .single();

  // Fetch menu items for the restaurant
  const { data: menuItems, error: menuError } = await supabase
    .from('menu_items')
    .select('*')
    .eq('restaurant_id', restaurantId);

  if (menuError) {
    console.error(menuError);
  }

  // Group menu items by category
  const categories = menuItems?.reduce((acc, item) => {
    const category = item.category || 'Uncategorized';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(item);
    return acc;
  }, {} as Record<string, Array<{
    id: string;
    name: string;
    description?: string;
    price: number;
    image_url?: string;
    category: string;
    rating?: number;
    preparation_time?: string;
  }>>);

  return (
    <SessionPageClient 
      session={session} 
      categories={categories || {}} 
      restaurantName={restaurant?.name}
    />
  );
}