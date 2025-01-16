import { Injectable } from '@angular/core';
import { INDEX_DB_OBJECTSTORES, INDEXED_DB_DATABASE_NAME2, INDEXED_DB_VERSION, OBJECTSTORE_VA_QUESTIONS } from 'app/shared/constants/indexedDB.constants';
import { IndexedDBObjectStore } from 'app/shared/interface/indexedDB.interface';
import { openDB, IDBPDatabase } from 'idb';

@Injectable({
  providedIn: 'root',
})
export class GenericIndexedDbService {
  private dbPromise: Promise<IDBPDatabase>;
  private cache = new Map<string, any>();
  private maxRetries = 3;
  private currentRetry = 0;
  private isReconnecting = false;
  private connectionTimeout = 5000; 

  constructor() {
    this.dbPromise = this.initDB();
    this.setupErrorHandling();
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

        this.cache.clear();

        this.dbPromise = this.initDB();
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

  private reloadPage() {
    localStorage.setItem('indexeddb_recovery', 'true');
    window.location.reload();
  }

  private async waitForConnection(): Promise<void> {
    let attempts = 0;
    const maxAttempts = 3;
    const delay = 1000; // 1 second between attempts

    while (this.isReconnecting && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, delay));
      attempts++;
    }

    if (this.isReconnecting) {
      throw new Error('Database connection timeout');
    }
  }

  private async executeWithRetry<T>(operation: () => Promise<T>): Promise<T> {
    let attempts = 0;
    while (attempts < this.maxRetries) {
      try {
        if (this.isReconnecting) {
          await this.waitForConnection();
        }

        return await Promise.race([
          operation(),
          new Promise<T>((_, reject) => {
            setTimeout(() => reject(new Error('Operation timeout')), this.connectionTimeout);
          })
        ]);
      } catch (error) {
        attempts++;
        if (this.isIndexedDBError(error)) {
          if (attempts === this.maxRetries) {
            throw error;
          }
          await this.handleDatabaseError();
          continue;
        }
        throw error;
      }
    }
    throw new Error('Max retry attempts reached');
  }

  private async initDB() {
    const version_number = Number(localStorage.getItem(INDEXED_DB_VERSION) || "1");

    const handleBlocking = () => {
      console.warn('Database blocking. Attempting to close existing connections...');
      this.closeDatabase().catch(console.error);
    };

    try {
      this.isReconnecting = true;
      const db = await openDB(INDEXED_DB_DATABASE_NAME2, version_number, {
        upgrade(db) {
          INDEX_DB_OBJECTSTORES.forEach((storeName: string) => {
            if (!db.objectStoreNames.contains(storeName)) {
              db.createObjectStore(storeName, { keyPath: 'key' });
            }
          });
          localStorage.setItem(INDEXED_DB_VERSION, String(version_number + 1));
        },
        blocked() {
          console.warn('Database blocked. Waiting for other connections to close...');
        },
        blocking: handleBlocking,
        terminated: async () => {
          console.error('Database terminated unexpectedly');
          await this.handleDatabaseError();
        }
      });
      this.isReconnecting = false;
      return db;
    } catch (error) {
      this.isReconnecting = false;
      console.error('Failed to initialize database:', error);
      throw error;
    }
  }

  private async getDb(): Promise<IDBPDatabase> {
    return this.executeWithRetry(async () => {
      if (!this.dbPromise) {
        this.dbPromise = this.initDB();
      }
      return this.dbPromise;
    })
  }

  async addDataAsObjectValues(storeName: string, data: any) {
    return this.executeWithRetry(async () => {
      const db = await this.getDb();
      for (let key of Object.keys(data)) {
        let item = {
          key: key,
          value: data[key]
        };
        await db.put(storeName, item);
      }
      return "Data added successfully to the local database";
    })
  }

  async addDataAsIs(storeName: string, keyName: string, data: any) {
    return this.executeWithRetry(async () => {
      const db = await this.getDb();
      if (db) {
        let item = {
          key: keyName,
          value: data
        };
        await db.put(storeName, item);
      } else {
        this.initDB();
      }
      return "Questions as object added successfully to the local database";
    })
  }

  async getData(storeName: string, keyName?: string) {
    return this.executeWithRetry(async () => {
      const db = await this.getDb();
      const data = keyName
        ? await db.get(storeName , keyName)
        : await db.getAll(storeName ) || [];
      return data;
    })
  }

  async getDataObjectStore(storeName: string, key: string) {
    return this.executeWithRetry(async () => {
      const db = await this.getDb();
      return await db.get(storeName, key);
    })
  }

  async getDataByKeys(storeName: string, keys: string[], as_object: boolean = false, object_key?: string) {
    return this.executeWithRetry(async () => {
      if (as_object && object_key) {
        let object = await this.getDataObjectStore(storeName, object_key);
        const dataObject = object?.value;

        let requested_dataObject = {};
        for (const key of keys) {
          if (this.cache.has(key)) {
            requested_dataObject = {
              ...requested_dataObject,
              [key]: this.cache.get(key)
            };
          } else {
            this.cache.set(key, dataObject[key]);
            requested_dataObject = {
              ...requested_dataObject,
              [key]: dataObject[key]
            };
          }
        }
        return requested_dataObject;
      } else {
        const results: any[] = [];
        for (const key of keys) {
          if (this.cache.has(key)) {
            results.push(this.cache.get(key));
          } else {
            const db = await this.getDb();
            const value = await db.get(storeName, key);
            this.cache.set(key, value);
            results.push(value);
          }
        }
        return results;
      }
    })
  }

  async deleteObjectStore(storeName: string) {
    this.executeWithRetry(async () => {

      const version_number = Number(localStorage.getItem(INDEXED_DB_VERSION));
  
      this.dbPromise = openDB(INDEXED_DB_DATABASE_NAME2, version_number + 1, {
        upgrade(db) {
          if (db.objectStoreNames.contains(storeName)) {
            db.deleteObjectStore(storeName );
            localStorage.setItem(INDEXED_DB_VERSION, String(version_number + 1));
            console.log(`Object store ${storeName} deleted successfully`);
          } else {
            console.log(`Object store ${storeName} does not exist`);
          }
        }
      });
  
      await this.dbPromise;
      console.log('Database opened and upgrade completed');
    })
  }

  async deleteDatabase() {
    this.executeWithRetry(async () => {
      await this.closeDatabase();
      const deleteRequest = indexedDB.deleteDatabase(INDEXED_DB_DATABASE_NAME2);
  
      return new Promise((resolve, reject) => {
        deleteRequest.onsuccess = () => {
          console.log(`Database '${INDEXED_DB_DATABASE_NAME2}' deleted successfully`);
          resolve(true);
        };
  
        deleteRequest.onerror = () => {
          console.error(`Failed to delete database '${INDEXED_DB_DATABASE_NAME2}':`, deleteRequest.error);
          reject(deleteRequest.error);
        };
  
        deleteRequest.onblocked = () => {
          console.warn(`Database deletion blocked: Make sure all connections are closed.`);
          reject(new Error('Database deletion blocked'));
        };
      });
    })
  }

  private async closeDatabase(): Promise<void> {
    this.executeWithRetry(async () => {
      const db = await this.dbPromise;
      if (db) {
        db.close();
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    })
  }
}