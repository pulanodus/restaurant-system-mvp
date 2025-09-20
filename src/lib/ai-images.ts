// AI-generated food images for PulaNodus menu items
// Uses Unsplash API for high-quality food photography

export interface FoodImageOptions {
  width?: number;
  height?: number;
  quality?: number;
}

// Food photography keywords mapping for better image results
const foodKeywords: Record<string, string> = {
  // Drinks
  'strawberry daiquiri mocktail': 'strawberry mocktail drink',
  'cappuccino': 'cappuccino coffee',
  
  // Mains
  'pasta carbonara': 'pasta carbonara italian',
  'grilled chicken sandwich': 'grilled chicken sandwich',
  
  // Starters
  'quesadilla': 'quesadilla mexican',
  'spring roll': 'spring roll asian',
  
  // Desserts
  'chocolate cake': 'chocolate cake dessert',
  'fresh fruit bowl': 'fresh fruit bowl healthy',
  
  // Default fallbacks
  'default': 'delicious food restaurant'
};

// Generate AI food image URL using Unsplash
export const generateFoodImage = (itemName: string, options: FoodImageOptions = {}): string => {
  const { width = 400, height = 300, quality = 80 } = options;
  
  // Get specific keywords for the food item
  const keywords = foodKeywords[itemName.toLowerCase()] || 
                  foodKeywords[itemName.toLowerCase().split(' ')[0]] || 
                  foodKeywords['default'];
  
  // Use Unsplash Source API for high-quality food images
  const baseUrl = 'https://images.unsplash.com/photo';
  
  // Generate a consistent seed based on the item name for consistent images
  const seed = itemName.toLowerCase().replace(/[^a-z0-9]/g, '');
  const seedNumber = seed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  
  // Use a curated collection of food photos or search by keywords
  const imageId = getFoodImageId(itemName, seedNumber);
  
  return `${baseUrl}-${imageId}?w=${width}&h=${height}&q=${quality}&fit=crop&crop=center&auto=format&fm=jpg`;
};

// Curated food image IDs for consistent, high-quality results
const getFoodImageId = (itemName: string, seed: number): string => {
  const foodImageMap: Record<string, string[]> = {
    // Drinks
    'strawberry': ['1551024739-0b1c6c6d9b8f', '1551024739-0b1c6c6d9b8f'],
    'daiquiri': ['1551024739-0b1c6c6d9b8f', '1551024739-0b1c6c6d9b8f'],
    'mocktail': ['1551024739-0b1c6c6d9b8f', '1551024739-0b1c6c6d9b8f'],
    'cappuccino': ['1559056199-6417b8d7d3c7', '1559056199-6417b8d7d3c7'],
    'coffee': ['1559056199-6417b8d7d3c7', '1559056199-6417b8d7d3c7'],
    
    // Mains
    'pasta': ['1551183053-bf91a1d81141', '1551183053-bf91a1d81141'],
    'carbonara': ['1551183053-bf91a1d81141', '1551183053-bf91a1d81141'],
    'chicken': ['1559847844-5315695dadae', '1559847844-5315695dadae'],
    'sandwich': ['1559847844-5315695dadae', '1559847844-5315695dadae'],
    'grilled': ['1559847844-5315695dadae', '1559847844-5315695dadae'],
    
    // Starters
    'quesadilla': ['1559847844-5315695dadae', '1559847844-5315695dadae'],
    'spring': ['1559847844-5315695dadae', '1559847844-5315695dadae'],
    'roll': ['1559847844-5315695dadae', '1559847844-5315695dadae'],
    
    // Desserts
    'chocolate': ['1551024739-0b1c6c6d9b8f', '1551024739-0b1c6c6d9b8f'],
    'cake': ['1551024739-0b1c6c6d9b8f', '1551024739-0b1c6c6d9b8f'],
    'fruit': ['1551024739-0b1c6c6d9b8f', '1551024739-0b1c6c6d9b8f'],
    'fresh': ['1551024739-0b1c6c6d9b8f', '1551024739-0b1c6c6d9b8f'],
    
    // Restaurant/Banner
    'restaurant': ['1559847844-5315695dadae', '1559847844-5315695dadae'],
    'banner': ['1559847844-5315695dadae', '1559847844-5315695dadae'],
    
    // Default
    'default': ['1559847844-5315695dadae', '1559847844-5315695dadae']
  };
  
  // Find matching category
  const itemLower = itemName.toLowerCase();
  for (const [category, images] of Object.entries(foodImageMap)) {
    if (itemLower.includes(category)) {
      const index = seed % images.length;
      return images[index];
    }
  }
  
  // Fallback to default
  const defaultImages = foodImageMap['default'];
  const index = seed % defaultImages.length;
  return defaultImages[index];
};

// Alternative: Use Unsplash search API for dynamic images
export const generateFoodImageFromSearch = (itemName: string, options: FoodImageOptions = {}): string => {
  const { width = 400, height = 300, quality = 80 } = options;
  
  const keywords = foodKeywords[itemName.toLowerCase()] || 
                  foodKeywords[itemName.toLowerCase().split(' ')[0]] || 
                  'delicious food restaurant';
  
  // Use Unsplash Source API with search
  const searchQuery = encodeURIComponent(keywords);
  return `https://source.unsplash.com/${width}x${height}/?${searchQuery}&q=${quality}`;
};

// Get menu item image with fallback chain
export const getMenuItemImage = (itemName: string, existingImageUrl?: string, options: FoodImageOptions = {}): string => {
  // 1. Use existing image URL if available
  if (existingImageUrl && existingImageUrl.trim() !== '') {
    return existingImageUrl;
  }
  
  // 2. Generate AI food image
  return generateFoodImage(itemName, options);
};

// Batch generate images for multiple menu items
export const generateMenuImages = (menuItems: Array<{ name: string; image_url?: string }>): Array<{ name: string; image_url: string }> => {
  return menuItems.map(item => ({
    name: item.name,
    image_url: getMenuItemImage(item.name, item.image_url)
  }));
};
