// Simple placeholder image utilities for PulaNodus MVP
// Replaces the complex placeholder-images system from archived features

export const getPlaceholderImage = (width: number = 300, height: number = 200, text?: string) => {
  const placeholderText = text || `${width}x${height}`;
  return `https://via.placeholder.com/${width}x${height}/f3f4f6/6b7280?text=${encodeURIComponent(placeholderText)}`;
};

export const getMenuImagePlaceholder = (itemName?: string) => {
  return getPlaceholderImage(400, 300, itemName || 'Menu Item');
};

export const getMenuItemPlaceholder = (itemName?: string) => {
  return getPlaceholderImage(400, 300, itemName || 'Menu Item');
};

export const getTableImagePlaceholder = (tableNumber?: string) => {
  return getPlaceholderImage(300, 200, `Table ${tableNumber || 'X'}`);
};

export const getProfileImagePlaceholder = (name?: string) => {
  return getPlaceholderImage(150, 150, name ? name.charAt(0).toUpperCase() : 'U');
};

export const heroBannerPlaceholder = getPlaceholderImage(1200, 400, 'Restaurant Banner');
