import { Injectable } from '@angular/core';
import { INDEXED_DB_DATABASE_NAME, INDEXED_DB_VERSION } from 'app/shared/constants/indexedDB.constants';
import { VmanIndexedDB, ObjectStoreConfig } from 'app/shared/interface/indexedDB.interface';
import { openDB, IDBPDatabase, StoreNames } from 'idb';

@Injectable({
  providedIn: 'root',
})
export class GenericIndexedDbService {
  private dbPromise: Promise<IDBPDatabase<VmanIndexedDB>>;
  private cache = new Map<string, Map<string, any>>();
  private maxRetries = 3;
  private currentRetry = 0;
  private objectStores: ObjectStoreConfig[] = [];

  constructor() {
    this.dbPromise = this.initDB();
    this.setupErrorHandling();
  }

  registerObjectStore(config: ObjectStoreConfig) {
    this.objectStores.push(config);
    this.cache.set(config.name, new Map());
  }

  private setupErrorHandling() {
    window.addEventListener('unhandledrejection', async (event) => {
      if (event.reason && this.isIndexedDBError(event.reason)) {
        console.error('IndexedDB error detected:', event.reason);
        await this.handleDatabaseError();
      }
    });
  }

  private isIndexedDBError(error: any): boolean {
    return error.name?.includes('IndexedDB') ||
      error.message?.includes('IndexedDB') ||
      error.name === 'QuotaExceededError' ||
      error.name === 'InvalidStateError';
  }

  private async handleDatabaseError() {
    console.log(`Attempting database recovery (Attempt ${this.currentRetry + 1}/${this.maxRetries})`);

    if (this.currentRetry < this.maxRetries) {
      this.currentRetry++;

      try {
        await this.closeDatabase();
        this.clearAllCaches();
        this.dbPromise = this.initDB(true);
        await this.dbPromise;

        console.log('Database successfully recovered');
        this.currentRetry = 0;
      } catch (error) {
        console.error('Recovery attempt failed:', error);

        if (this.currentRetry >= this.maxRetries) {
          console.error('Max recovery attempts reached. Reloading page...');
          this.reloadPage();
        } else {
          await this.handleDatabaseError();
        }
      }
    } else {
      this.reloadPage();
    }
  }

  private clearAllCaches() {
    this.cache.forEach(storeCache => storeCache.clear());
  }

  private reloadPage() {
    localStorage.setItem('indexeddb_recovery', 'true');
    window.location.reload();
  }

  private async initDB(is_another_version?: boolean) {
    const version_number = is_another_version
      ? Number(localStorage.getItem(INDEXED_DB_VERSION) || "1") + 1
      : Number(localStorage.getItem(INDEXED_DB_VERSION) || "1");

    const objectStores = this.objectStores;

    try {
      return await openDB<VmanIndexedDB>(INDEXED_DB_DATABASE_NAME, version_number, {
        upgrade(db) {
          objectStores.forEach(store => {
            const storeName = store.name as StoreNames<VmanIndexedDB>
            if (!db.objectStoreNames.contains(storeName)) {
              const objectStore = db.createObjectStore(storeName, { keyPath: store.keyPath });

              // store.indexes?.forEach(index => {
              //   const indexName = index.name as never;
              //   if (!objectStore.indexNames.contains(indexName)) {
              //     objectStore.createIndex(indexName, index.keyPath as string, index.options);
              //   }
              // });
            }
          });
          localStorage.setItem(INDEXED_DB_VERSION, String(version_number + 1));
        },
        blocked() {
          console.warn('Database blocked. Closing other tabs...');
        },
        blocking: () => {
          console.warn('Database blocking. Reloading page...');
          this.reloadPage();
        },
        terminated: () => {
          console.error('Database terminated unexpectedly');
          this.handleDatabaseError();
        }
      });
    } catch (error) {
      console.error('Failed to initialize database:', error);
      throw error;
    }
  }

  private async getDb(): Promise<IDBPDatabase<VmanIndexedDB>> {
    try {
      if (!this.dbPromise) {
        this.dbPromise = this.initDB();
      }
      return this.dbPromise;
    } catch (error) {
      await this.handleDatabaseError();
      throw error;
    }
  }

  async add(storeName: string, items: any) {
    // try {
    //   const db = await this.getDb();
    //   const storeCache = this.cache.get(storeName);

    //   if (Array.isArray(items)) {
    //     for (const item of items) {
    //       await db.put(storeName, item);
    //       if (storeCache) {
    //         storeCache.set(item[this.getKeyPath(storeName)], item);
    //       }
    //     }
    //   } else {
    //     await db.put(storeName, items);
    //     if (storeCache) {
    //       storeCache.set(items[this.getKeyPath(storeName)], items);
    //     }
    //   }

    //   return `Items added successfully to ${storeName}`;
    // } catch (error) {
    //   IndexedDBService
    //   await this.handleDatabaseError();
    //   throw error;
    // }
  }

  private getKeyPath(storeName: string): string {
    const store = this.objectStores.find(s => s.name === storeName);
    return store?.keyPath || 'key';
  }

  async get(storeName: string, key?: string) {
    // try {
    //   const db = await this.getDb();
    //   const storeCache = this.cache.get(storeName);

    //   if (key) {
    //     if (storeCache?.has(key)) {
    //       return storeCache.get(key);
    //     }
    //     const item = await db.get(storeName, key);
    //     if (item && storeCache) {
    //       storeCache.set(key, item);
    //     }
    //     return item;
    //   } else {
    //     const items = await db.getAll(storeName);
    //     if (storeCache) {
    //       items.forEach(item => {
    //         storeCache.set(item[this.getKeyPath(storeName)], item);
    //       });
    //     }
    //     return items;
    //   }
    // } catch (error) {
    //   await this.handleDatabaseError();
    //   return key ? null : [];
    // }
  }

  async getByKeys(storeName: string, keys: string[]) {
    try {
      const results: any[] = [];
      const storeCache = this.cache.get(storeName);

      for (const key of keys) {
        if (storeCache?.has(key)) {
          results.push(storeCache.get(key));
        } else {
          const item = await this.get(storeName, key);
          if (item) {
            results.push(item);
          }
        }
      }

      return results;
    } catch (error) {
      await this.handleDatabaseError();
      throw error;
    }
  }

  async deleteObjectStore(storeName: string) {
    try {
      const version_number = Number(localStorage.getItem(INDEXED_DB_VERSION));

      this.dbPromise = openDB<VmanIndexedDB>(INDEXED_DB_DATABASE_NAME, version_number + 1, {
        upgrade(db) {
          // if (db.objectStoreNames.contains(storeName)) {
          //   db.deleteObjectStore(storeName);
          //   localStorage.setItem(INDEXED_DB_VERSION, String(version_number + 1));
          //   console.log(`Object store ${storeName} deleted successfully`);
          // } else {
          //   console.log(`Object store ${storeName} does not exist`);
          // }
        }
      });

      await this.dbPromise;
      this.cache.delete(storeName);
      this.objectStores = this.objectStores.filter(store => store.name !== storeName);

      console.log('Database opened and upgrade completed');
    } catch (error) {
      await this.handleDatabaseError();
      throw error;
    }
  }

  async deleteDatabase(dbName: string) {
    try {
      await this.closeDatabase();
      const deleteRequest = indexedDB.deleteDatabase(dbName);

      return new Promise((resolve, reject) => {
        deleteRequest.onsuccess = () => {
          console.log(`Database '${dbName}' deleted successfully`);
          this.clearAllCaches();
          this.objectStores = [];
          resolve(true);
        };

        deleteRequest.onerror = () => {
          console.error(`Failed to delete database '${dbName}':`, deleteRequest.error);
          reject(deleteRequest.error);
        };

        deleteRequest.onblocked = () => {
          console.warn(`Database deletion blocked: Make sure all connections are closed.`);
          reject(new Error('Database deletion blocked'));
        };
      });
    } catch (error) {
      await this.handleDatabaseError();
      throw error;
    }
  }

  private async closeDatabase(): Promise<void> {
    try {
      const db = await this.dbPromise;
      db.close();
    } catch (error) {
      console.error('Error closing database:', error);
    }
  }
}