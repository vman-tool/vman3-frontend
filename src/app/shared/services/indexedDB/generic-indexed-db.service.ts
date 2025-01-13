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

  private async initDB() {
    const version_number = Number(localStorage.getItem(INDEXED_DB_VERSION) || "1")

    const handleBlocking = () => {
      console.warn('Database blocking. Reloading page...');
      this.reloadPage();
    };

    const handleTerminated = () => {
      console.error('Database terminated unexpectedly');
      this.handleDatabaseError();
    };

    try {
      return this.dbPromise ? this.dbPromise : await openDB(INDEXED_DB_DATABASE_NAME2, version_number, {
        upgrade(db) {
          INDEX_DB_OBJECTSTORES.forEach((storeName: string) => {
            if (!db.objectStoreNames.contains(storeName)) {
              db.createObjectStore(storeName , { keyPath: 'key' });
            }
          })
          localStorage.setItem(INDEXED_DB_VERSION, String(version_number + 1));
        },
        blocked() {
          console.warn('Database blocked. Closing other tabs...');
        },
        blocking: handleBlocking,
        terminated: handleTerminated
      });
    } catch (error) {
      console.error('Failed to initialize database:', error);
      throw error;
    }
  }

  private async getDb(): Promise<IDBPDatabase> {
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

  async addDataAsObjectValues(storeName: string, data: any) {
    try {
      const db = await this.getDb();
      for (let key of Object.keys(data)) {
        let item = {
          key: key,
          value: data[key]
        };
        await db.put(storeName, item);
      }
      return "Data added successfully to the local database";
    } catch (error) {
      await this.handleDatabaseError();
      throw error;
    }
  }

  async addDataAsIs(storeName: string, keyName: string, data: any) {
    try {
      const db = await this.getDb();
      if(db){
        let item = {
          key: keyName,
          value: data
        };
        await db.put(storeName , item);
      } else {
        this.initDB();
      }
      return "Questions as object added successfully to the local database";
    } catch (error) {
      await this.handleDatabaseError();
      throw error;
    }
  }

  async getData(storeName: string, keyName?: string) {
    try {
      const db = await this.getDb();
      const data = keyName
        ? await db.get(storeName , keyName)
        : await db.getAll(storeName ) || [];
      return data;
    } catch (error) {
      await this.handleDatabaseError();
      return [];
    }
  }

  async getDataFromObjectStore(storeName: string, key: string) {
    try {
      const db = await this.getDb();
      return db.get(storeName, key);
    } catch (error) {
      await this.handleDatabaseError();
      throw error;
    }
  }

  async deleteObjectStore(storeName: string) {
    try {
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
    } catch (error) {
      await this.handleDatabaseError();
      throw error;
    }
  }

  async deleteDatabase() {
    try {
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