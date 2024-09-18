// Helper functions to handle localStorage with TTL
export class LocalStorageWithTTL {
  static setItemWithTTL(key: string, value: any, ttl: number) {
    const now = new Date().getTime(); // Current time in milliseconds
    const item = {
      value: value,
      expiry: now + ttl, // Expiry time in milliseconds
    };
    localStorage.setItem(key, JSON.stringify(item)); // Store as JSON string
  }

  static getItemWithTTL(key: string): any | null {
    const itemStr = localStorage.getItem(key); // Retrieve the item
    if (!itemStr) {
      return null; // If item doesn't exist
    }

    const item = JSON.parse(itemStr); // Parse the JSON string
    const now = new Date().getTime(); // Current time

    // Check if the item has expired
    if (now > item.expiry) {
      localStorage.removeItem(key); // Remove the item if it has expired
      return null;
    }

    return item.value; // Return the actual value if it's still valid
  }
}
