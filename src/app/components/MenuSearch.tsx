'use client';

// React imports
import { useState, useEffect, useMemo } from 'react';

// Supabase imports
import { supabase } from '@/lib/supabase';

// Component imports
import MenuItem from './MenuItem';

interface MenuItemData {
  id: string;
  name: string;
  description?: string;
  price: number;
  image_url?: string;
  category: string;
  rating?: number;
  preparation_time?: string;
}

interface MenuSearchProps {
  sessionId: string;
  restaurantId?: string;
}

export default function MenuSearch({ sessionId, restaurantId }: MenuSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [menuItems, setMenuItems] = useState<MenuItemData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [categories, setCategories] = useState<string[]>([]);

  // Fetch menu items
  const fetchMenuItems = async () => {
    try {
      setIsLoading(true);
      
      let query = supabase
        .from('menu_items')
        .select('*')
        .order('name');

      if (restaurantId) {
        query = query.eq('restaurant_id', restaurantId);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      setMenuItems(data || []);
      
      // Extract unique categories
      const uniqueCategories = [...new Set(data?.map(item => item.category) || [])];
      setCategories(uniqueCategories);
    } catch (error) {
      console.error('Error fetching menu items:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter and search menu items
  const filteredItems = useMemo(() => {
    return menuItems.filter(item => {
      const matchesSearch = searchQuery === '' || 
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
      
      return matchesSearch && matchesCategory;
    });
  }, [menuItems, searchQuery, selectedCategory]);

  // Group items by category for display
  const groupedItems = useMemo(() => {
    const groups: Record<string, MenuItemData[]> = {};
    
    filteredItems.forEach(item => {
      if (!groups[item.category]) {
        groups[item.category] = [];
      }
      groups[item.category]!.push(item);
    });
    
    return groups;
  }, [filteredItems]);

  useEffect(() => {
    fetchMenuItems();
  }, [restaurantId, fetchMenuItems]);

  if (isLoading) {
    return (
      <div className="container mx-auto p-4">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-gray-600">Loading menu...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      {/* Search Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Menu Search</h1>
        <p className="text-gray-600">Search through our menu items by name, description, or category.</p>
      </div>

      {/* Search and Filter Controls */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search by name, description, or category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div className="sm:w-48">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Categories</option>
            {categories.map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Search Results */}
      {searchQuery && (
        <div className="mb-4">
          <p className="text-gray-600">
            Found {filteredItems.length} item{filteredItems.length !== 1 ? 's' : ''} 
            {searchQuery && ` for "${searchQuery}"`}
          </p>
        </div>
      )}

      {/* Menu Items by Category */}
      {Object.keys(groupedItems).length > 0 ? (
        <div className="space-y-8">
          {Object.entries(groupedItems).map(([category, items]) => (
            <div key={category}>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4 border-b border-gray-200 pb-2">
                {category}
                <span className="text-sm font-normal text-gray-500 ml-2">
                  ({items.length} item{items.length !== 1 ? 's' : ''})
                </span>
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {items.map((item) => (
                  <MenuItem
                    key={item.id}
                    item={item}
                    sessionId={sessionId}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="text-gray-500 text-lg">
            {searchQuery 
              ? `No menu items found for "${searchQuery}". Try a different search term.`
              : 'No menu items available.'}
          </div>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="mt-4 text-blue-600 hover:text-blue-800 font-medium"
            >
              Clear search
            </button>
          )}
        </div>
      )}

      {/* Search Tips */}
      {searchQuery && (
        <div className="mt-8 p-4 bg-blue-50 rounded-lg">
          <h3 className="text-sm font-medium text-blue-900 mb-2">Search Tips:</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Search by dish name (e.g., &quot;salmon&quot;, &quot;pasta&quot;)</li>
            <li>• Search by ingredients (e.g., &quot;chicken&quot;, &quot;vegetarian&quot;)</li>
            <li>• Search by cooking method (e.g., &quot;grilled&quot;, &quot;fried&quot;)</li>
            <li>• Search by category (e.g., &quot;appetizers&quot;, &quot;desserts&quot;)</li>
          </ul>
        </div>
      )}
    </div>
  );
}
