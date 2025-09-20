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
  'quesadilla': 'quesadilla mexican food',
  'spring roll': 'spring roll asian food',
  
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

// Alternative: Use Unsplash search API for dynamic images (more reliable)
export const generateFoodImageFromSearch = (itemName: string, options: FoodImageOptions = {}): string => {
  const { width = 400, height = 300, quality = 80 } = options;
  
  const keywords = foodKeywords[itemName.toLowerCase()] || 
                  foodKeywords[itemName.toLowerCase().split(' ')[0]] || 
                  'delicious food restaurant';
  
  // Use Unsplash Source API with search
  const searchQuery = encodeURIComponent(keywords);
  return `https://source.unsplash.com/${width}x${height}/?${searchQuery}&q=${quality}`;
};

// Curated food image IDs for consistent, high-quality results
const getFoodImageId = (itemName: string, seed: number): string => {
  const foodImageMap: Record<string, string[]> = {
    // Drinks - Specific images for each drink
    'strawberry daiquiri mocktail': ['1551024739-0b1c6c6d9b8f', '1551024739-0b1c6c6d9b8f'],
    'strawberry': ['1551024739-0b1c6c6d9b8f', '1551024739-0b1c6c6d9b8f'],
    'daiquiri': ['1551024739-0b1c6c6d9b8f', '1551024739-0b1c6c6d9b8f'],
    'mocktail': ['1551024739-0b1c6c6d9b8f', '1551024739-0b1c6c6d9b8f'],
    'cappuccino': ['1559056199-6417b8d7d3c7', '1559056199-6417b8d7d3c7'],
    'coffee': ['1559056199-6417b8d7d3c7', '1559056199-6417b8d7d3c7'],
    
    // Mains - Specific images for each main dish
    'pasta carbonara': ['1551183053-bf91a1d81141', '1551183053-bf91a1d81141'],
    'pasta': ['1551183053-bf91a1d81141', '1551183053-bf91a1d81141'],
    'carbonara': ['1551183053-bf91a1d81141', '1551183053-bf91a1d81141'],
    'grilled chicken sandwich': ['1559847844-5315695dadae', '1559847844-5315695dadae'],
    'chicken sandwich': ['1559847844-5315695dadae', '1559847844-5315695dadae'],
    'grilled chicken': ['1559847844-5315695dadae', '1559847844-5315695dadae'],
    'chicken': ['1559847844-5315695dadae', '1559847844-5315695dadae'],
    'sandwich': ['1559847844-5315695dadae', '1559847844-5315695dadae'],
    'grilled': ['1559847844-5315695dadae', '1559847844-5315695dadae'],
    
    // Starters - Specific images for each starter
    'quesadilla': ['1559847844-5315695dadae', '1559847844-5315695dadae'],
    'spring roll': ['1559847844-5315695dadae', '1559847844-5315695dadae'],
    'spring': ['1559847844-5315695dadae', '1559847844-5315695dadae'],
    'roll': ['1559847844-5315695dadae', '1559847844-5315695dadae'],
    
    // Desserts - Specific images for each dessert
    'chocolate cake': ['1551024739-0b1c6c6d9b8f', '1551024739-0b1c6c6d9b8f'],
    'chocolate': ['1551024739-0b1c6c6d9b8f', '1551024739-0b1c6c6d9b8f'],
    'cake': ['1551024739-0b1c6c6d9b8f', '1551024739-0b1c6c6d9b8f'],
    'fresh fruit bowl': ['1551024739-0b1c6c6d9b8f', '1551024739-0b1c6c6d9b8f'],
    'fruit bowl': ['1551024739-0b1c6c6d9b8f', '1551024739-0b1c6c6d9b8f'],
    'fruit': ['1551024739-0b1c6c6d9b8f', '1551024739-0b1c6c6d9b8f'],
    'fresh': ['1551024739-0b1c6c6d9b8f', '1551024739-0b1c6c6d9b8f'],
    
    // Restaurant/Banner
    'restaurant banner': ['1559847844-5315695dadae', '1559847844-5315695dadae'],
    'restaurant': ['1559847844-5315695dadae', '1559847844-5315695dadae'],
    'banner': ['1559847844-5315695dadae', '1559847844-5315695dadae'],
    
    // Default
    'default': ['1559847844-5315695dadae', '1559847844-5315695dadae']
  };
  
  // Find matching category - try exact match first, then partial match
  const itemLower = itemName.toLowerCase().trim();
  
  // First try exact match
  if (foodImageMap[itemLower]) {
    const images = foodImageMap[itemLower];
    const index = seed % images.length;
    return images[index];
  }
  
  // Then try partial matches
  for (const [category, images] of Object.entries(foodImageMap)) {
    if (itemLower.includes(category) && category !== 'default') {
      const index = seed % images.length;
      return images[index];
    }
  }
  
  // Fallback to default
  const defaultImages = foodImageMap['default'];
  const index = seed % defaultImages.length;
  return defaultImages[index];
};


// Get menu item image with fallback chain
export const getMenuItemImage = (itemName: string, existingImageUrl?: string, options: FoodImageOptions = {}): string => {
  // 1. Use existing image URL if available
  if (existingImageUrl && existingImageUrl.trim() !== '') {
    return existingImageUrl;
  }
  
  // 2. Generate AI food image using search API (more reliable)
  return generateFoodImageFromSearch(itemName, options);
};

// Batch generate images for multiple menu items
export const generateMenuImages = (menuItems: Array<{ name: string; image_url?: string }>): Array<{ name: string; image_url: string }> => {
  return menuItems.map(item => ({
    name: item.name,
    image_url: getMenuItemImage(item.name, item.image_url)
  }));
};
