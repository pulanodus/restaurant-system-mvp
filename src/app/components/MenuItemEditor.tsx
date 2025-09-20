'use client';

// React imports
import { useState, useEffect } from 'react';

// Supabase imports
import { supabase } from '@/lib/supabase';

// Error handling imports
import { handleError } from '@/lib/error-handling';

interface MenuItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  image_url?: string;
  category: string;
  rating?: number;
  preparation_time?: string;
  restaurant_id: string;
}

interface MenuItemEditorProps {
  item?: MenuItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

export default function MenuItemEditor({ item, isOpen, onClose, onSave }: MenuItemEditorProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: 0,
    image_url: '',
    category: '',
    rating: '',
    preparation_time: '',
    restaurant_id: ''
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [descriptionLength, setDescriptionLength] = useState(0);
  
  const [error, setError] = useState<string | null>(null);

  // Common categories
  const categories = [
    'Appetizers',
    'Main Courses',
    'Desserts',
    'Beverages',
    'Salads',
    'Soups',
    'Pasta',
    'Pizza',
    'Sandwiches',
    'Seafood',
    'Vegetarian',
    'Specials'
  ];

  // Initialize form data
  useEffect(() => {
    if (item) {
      setFormData({
        name: item.name || '',
        description: item.description || '',
        price: item.price || 0,
        image_url: item.image_url || '',
        category: item.category || '',
        rating: item.rating?.toString() || '',
        preparation_time: item.preparation_time || '',
        restaurant_id: item.restaurant_id || ''
      });
    } else {
      setFormData({
        name: '',
        description: '',
        price: 0,
        image_url: '',
        category: '',
        rating: '',
        preparation_time: '',
        restaurant_id: ''
      });
    }
  }, [item]);

  // Update description length
  useEffect(() => {
    setDescriptionLength(formData.description.length);
  }, [formData.description]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.category.trim() || formData.price <= 0) {
      setError('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const menuItemData = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        price: parseFloat(formData.price.toString()),
        image_url: formData.image_url.trim() || null,
        category: formData.category.trim(),
        rating: formData.rating ? parseFloat(formData.rating) : null,
        preparation_time: formData.preparation_time.trim() || null,
        restaurant_id: formData.restaurant_id.trim() || 'default-restaurant'
      };

      if (item) {
        // Update existing item
        const { error } = await supabase
          .from('menu_items')
          .update(menuItemData)
          .eq('id', item.id);

        if (error) throw error;
      } else {
        // Create new item
        const { error } = await supabase
          .from('menu_items')
          .insert([menuItemData]);

        if (error) throw error;
      }

      onSave();
    } catch (error) {
      console.error('Error saving menu item:', error);
      setError(`Failed to ${item ? 'update' : 'create'} menu item`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="mb-4">
          <h2 className="text-2xl font-bold text-gray-900">
            {item ? 'Edit Menu Item' : 'Add New Menu Item'}
          </h2>
          <p className="text-gray-600 mt-1">
            {item ? 'Update the menu item details below.' : 'Fill in the details for your new menu item.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-900 mb-1">
              Item Name *
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., Grilled Salmon"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-900 mb-1">
              Description
              <span className="text-gray-500 ml-2">
                ({descriptionLength}/200 characters)
              </span>
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              maxLength={200}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Describe the dish, ingredients, and any special notes..."
            />
            <p className="text-xs text-gray-500 mt-1">
              Keep descriptions concise and appetizing. Include key ingredients and cooking methods.
            </p>
          </div>

          {/* Price and Category */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="price" className="block text-sm font-medium text-gray-900 mb-1">
                Price (PHP) *
              </label>
              <input
                type="number"
                id="price"
                name="price"
                value={formData.price}
                onChange={handleInputChange}
                min="0"
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="0.00"
                required
              />
            </div>
            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-900 mb-1">
                Category *
              </label>
              <select
                id="category"
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="">Select a category</option>
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Rating and Preparation Time */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="rating" className="block text-sm font-medium text-gray-900 mb-1">
                Rating (1-5)
              </label>
              <input
                type="number"
                id="rating"
                name="rating"
                value={formData.rating}
                onChange={handleInputChange}
                min="1"
                max="5"
                step="0.1"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="4.5"
              />
            </div>
            <div>
              <label htmlFor="preparation_time" className="block text-sm font-medium text-gray-900 mb-1">
                Preparation Time
              </label>
              <input
                type="text"
                id="preparation_time"
                name="preparation_time"
                value={formData.preparation_time}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., 15-20 mins"
              />
            </div>
          </div>

          {/* Image URL */}
          <div>
            <label htmlFor="image_url" className="block text-sm font-medium text-gray-900 mb-1">
              Image URL
            </label>
            <input
              type="url"
              id="image_url"
              name="image_url"
              value={formData.image_url}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="https://example.com/image.jpg"
            />
          </div>

          {/* Restaurant ID */}
          <div>
            <label htmlFor="restaurant_id" className="block text-sm font-medium text-gray-900 mb-1">
              Restaurant ID
            </label>
            <input
              type="text"
              id="restaurant_id"
              name="restaurant_id"
              value={formData.restaurant_id}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="default-restaurant"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:bg-gray-400"
            >
              {isSubmitting ? 'Saving...' : (item ? 'Update Item' : 'Create Item')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
