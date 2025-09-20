'use client'

// React imports
import MenuItem from './MenuItem'

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

interface MenuCategoryProps {
  category: string
  items: MenuItem[]
  sessionId: string
  showCategoryHeader?: boolean
}

export default function MenuCategory({ category, items, sessionId, showCategoryHeader = true }: MenuCategoryProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      {showCategoryHeader && (
        <div className="p-4 bg-gray-50 border-b border-gray-200 md:p-6">
          <h2 className="text-lg font-bold text-gray-800 md:text-xl">{category}</h2>
        </div>
      )}
      
      <div className="p-3 md:p-6">
        <div className="space-y-3 md:space-y-4 md:grid md:grid-cols-2 md:gap-4">
          {items.map((item) => (
            <MenuItem
              key={item.id}
              item={item}
              sessionId={sessionId}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
