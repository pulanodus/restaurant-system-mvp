// Supabase imports
import { supabase } from '@/lib/supabase';

// Next.js imports
import { redirect } from 'next/navigation';
import Link from 'next/link';

// Component imports
import MenuDisplay from '@/app/components/MenuDisplay';
import PinCopyButton from '@/app/components/PinCopyButton';
import { heroBannerPlaceholder } from '@/lib/placeholder-images';

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
    <div className="w-full max-w-[480px] mx-auto px-4 py-4" style={{ minHeight: '100vh' }}>
      {/* Restaurant Name - At the very top - More Prominent */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-3">
        <h1 className="text-2xl font-bold text-center text-gray-800 mb-3">
          {restaurant?.name || 'Restaurant'}
        </h1>
        
      </div>

      {/* Customer Info - Above Banner - Reduced Size */}
      <div className="bg-white rounded-xl shadow-sm p-3 mb-3">
        <div className="flex items-center justify-between">
          <div className="text-xs text-gray-500">
            Table {session.tables?.table_number} • {session.started_by_name}
          </div>
          {session.tables?.current_pin && (
            <div className="flex items-center space-x-2">
              <span className="text-xs text-gray-500">PIN:</span>
              <div className="flex items-center space-x-1">
                <span className="text-sm font-bold text-blue-600 font-mono bg-blue-50 px-2 py-1 rounded">
                  {session.tables.current_pin}
                </span>
                <PinCopyButton pin={session.tables.current_pin} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Hero Banner with Promotional Overlay */}
      <div className="relative mb-4 rounded-xl overflow-hidden shadow-sm">
        {/* Background Image */}
        <div className="h-32 relative">
          <img 
            src={heroBannerPlaceholder} 
            alt="Restaurant Special" 
            className="w-full h-full object-cover"
          />
          {/* Promotional Text Overlay */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4 bg-black bg-opacity-30">
            <h2 className="text-white text-lg font-bold mb-1">Special Offer!</h2>
            <p className="text-white text-sm opacity-90">20% off all desserts today</p>
          </div>
        </div>
      </div>
      
      <MenuDisplay 
        categories={categories || {}} 
        sessionId={session.id} 
      />
    </div>
  );
}