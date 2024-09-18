import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class LocalStorageSettingsService {
  // Set an item with TTL (Time-to-Live)
  setItemWithTTL(key: string, value: any, ttlInMilliseconds: number): void {
    const now = new Date().getTime(); // Current time in milliseconds
    const item = {
      value: value,
      expiry: now + ttlInMilliseconds, // Expiry time
    };
    localStorage.setItem(key, JSON.stringify(item)); // Store as a JSON string
  }

  // Get an item and check if it has expired
  getItemWithTTL(key: string): any | null {
    const itemStr = localStorage.getItem(key);
    if (!itemStr) {
      return null; // If item doesn't exist
    }

    const item = JSON.parse(itemStr);
    const now = new Date().getTime();

    // Check if the item has expired
    if (now > item.expiry) {
      localStorage.removeItem(key); // Remove the item if expired
      return null;
    }

    return item.value; // Return the actual value if it's still valid
  }

  // Remove an item from localStorage
  removeItem(key: string): void {
    localStorage.removeItem(key);
  }
}
