'use client'

// React imports
import { useState, useMemo } from 'react'

// Component imports
import MenuCategory from './MenuCategory'

interface MenuItem {
  id: string
  name: string
  description?: string
  price: number
  image_url?: string
  category: string
  rating?: number
  preparation_time?: string
}

interface MenuDisplayProps {
  categories: Record<string, MenuItem[]>
  sessionId: string
}

export default function MenuDisplay({ categories, sessionId }: MenuDisplayProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('All')

  // Define the category order as requested
  const categoryOrder = [
    'All',
    'Starters', 
    'Mains',
    'Cold_drinks',
    'Hot Beverages ',
    'Desserts',
    'Snacks'
  ]

  // Filter and sort categories
  const _orderedCategories = useMemo(() => {
    const sortedCategories: Record<string, MenuItem[]> = {}
    
    // Add categories in the specified order
    categoryOrder.forEach(categoryName => {
      if (categoryName === 'All') {
        // For "All", we'll handle it separately in the display logic
        return
      }
      
      // Find matching category in the data (case-insensitive)
      const matchingKey = Object.keys(categories).find(key => {
        const normalizedKey = key.toLowerCase().replace(/\s+/g, '')
        const normalizedCategory = categoryName.toLowerCase().replace(/\s+/g, '')
        
        // Handle special cases
        if (normalizedCategory === 'desserts' && normalizedKey === 'dessert') {
          return true
        }
        
        return normalizedKey === normalizedCategory
      })
      
      if (matchingKey && categories[matchingKey]) {
        sortedCategories[matchingKey] = categories[matchingKey]
      }
    })
    
    return sortedCategories
  }, [categories])

  // Get the category names in the correct order for the filter buttons
  const orderedCategoryNames = useMemo(() => {
    const names = ['All']
    
    categoryOrder.slice(1).forEach(categoryName => {
      const matchingKey = Object.keys(categories).find(key => {
        const normalizedKey = key.toLowerCase().replace(/\s+/g, '')
        const normalizedCategory = categoryName.toLowerCase().replace(/\s+/g, '')
        
        // Handle special cases
        if (normalizedCategory === 'desserts' && normalizedKey === 'dessert') {
          return true
        }
        
        return normalizedKey === normalizedCategory
      })
      
      if (matchingKey) {
        names.push(matchingKey)
      }
    })
    
    return names
  }, [categories])

  // Get items to display based on selected category
  const itemsToDisplay = useMemo(() => {
    if (selectedCategory === 'All') {
      // Show all items from all categories in the same order as category sections
      const allItems: MenuItem[] = []
      
      // Add items in the same order as the category order
      categoryOrder.forEach(categoryName => {
        if (categoryName === 'All') return
        
        // Find matching category in the data (case-insensitive)
        const matchingKey = Object.keys(categories).find(key => {
          const normalizedKey = key.toLowerCase().replace(/\s+/g, '')
          const normalizedCategory = categoryName.toLowerCase().replace(/\s+/g, '')
          
          // Handle special cases
          if (normalizedCategory === 'desserts' && normalizedKey === 'dessert') {
            return true
          }
          
          return normalizedKey === normalizedCategory
        })
        
        if (matchingKey && categories[matchingKey]) {
          allItems.push(...categories[matchingKey])
        }
      })
      
      return [{ category: 'All', items: allItems }]
    } else {
      // Show only items from the selected category
      const categoryItems = categories[selectedCategory]
      if (categoryItems) {
        return [{ category: selectedCategory, items: categoryItems }]
      }
      return []
    }
  }, [selectedCategory, categories])

  return (
    <>
      {/* Grid Category Filter Buttons with Icons */}
      <div className="bg-white rounded-lg shadow-sm p-3 mb-4 md:p-4 md:mb-6">
        <div className="grid grid-cols-4 gap-3 md:gap-4">
          {orderedCategoryNames.map(categoryName => {
            const isActive = selectedCategory === categoryName;
            const displayName = categoryName === 'All' ? 'All' : 
                               categoryName === 'Cold_drinks' ? 'Cold Drinks' :
                               categoryName === 'Hot Beverages ' ? 'Hot Beverages' :
                               categoryName === 'Dessert' ? 'Desserts' :
                               categoryName;
            
            // Get appropriate icon for each category
            const getCategoryIcon = (category: string) => {
              switch (category) {
                case 'All':
                  return '🍽️';
                case 'Starters':
                  return '🥗';
                case 'Mains':
                  return '🍖';
                case 'Cold_drinks':
                  return '🧊';
                case 'Hot Beverages ':
                  return '☕';
                case 'Desserts':
                case 'Dessert':
                  return '🍰';
                case 'Snacks':
                  return '🥨';
                default:
                  return '🍽️';
              }
            };

            return (
              <button
                key={categoryName}
                onClick={() => setSelectedCategory(categoryName)}
                className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all duration-200 min-h-[64px] ${
                  isActive 
                    ? 'bg-[#00d9ff] text-white shadow-md' 
                    : 'bg-gray-50 text-gray-600 hover:bg-[#00d9ff] hover:text-white hover:shadow-sm'
                }`}
              >
                <div className="text-2xl mb-1">{getCategoryIcon(categoryName)}</div>
                <span className="text-xs font-medium text-center leading-tight">
                  {displayName}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Responsive Menu Items Display */}
      <div className="space-y-4 md:space-y-6">
        {itemsToDisplay.map(({ category, items }) => (
          <MenuCategory
            key={category}
            category={category}
            items={items}
            sessionId={sessionId}
            showCategoryHeader={selectedCategory !== 'All'}
          />
        ))}
      </div>
    </>
  )
}
