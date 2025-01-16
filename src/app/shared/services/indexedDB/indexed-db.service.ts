import { Injectable } from '@angular/core';
import { INDEXED_DB_DATABASE_NAME, INDEXED_DB_VERSION, OBJECTSTORE_VA_QUESTIONS } from 'app/shared/constants/indexedDB.constants';
import { MyDB } from 'app/shared/interface/indexedDB.interface';
import { openDB, IDBPDatabase } from 'idb';

@Injectable({
  providedIn: 'root',
})
export class IndexedDBService {
  private dbPromise: Promise<IDBPDatabase<MyDB>>;
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

  private reloadPage() {
    localStorage.setItem('indexeddb_recovery', 'true');
    window.location.reload();
  }

  private async initDB(is_another_version?: boolean) {
    const version_number = is_another_version 
      ? Number(localStorage.getItem(INDEXED_DB_VERSION) || "1") + 1 
      : Number(localStorage.getItem(INDEXED_DB_VERSION) || "1");

    const handleBlocking = () => {
      console.warn('Database blocking. Reloading page...');
      this.reloadPage();
    };

    const handleTerminated = () => {
      console.error('Database terminated unexpectedly');
      this.handleDatabaseError();
    };

    try {
      return await openDB<MyDB>(INDEXED_DB_DATABASE_NAME, version_number, {
        upgrade(db) {
          if (!db.objectStoreNames.contains(OBJECTSTORE_VA_QUESTIONS)) {
            const store = db.createObjectStore(OBJECTSTORE_VA_QUESTIONS, { keyPath: 'key' });
            localStorage.setItem(INDEXED_DB_VERSION, String(version_number + 1));
          }
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

  private async getDb(): Promise<IDBPDatabase<MyDB>> {
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

  async addQuestions(questions: any) {
    try {
      const db = await this.getDb();
      for (let key of Object.keys(questions)) {
        let item = {
          key: key,
          value: questions[key]
        };
        await db.put(OBJECTSTORE_VA_QUESTIONS, item);
      }
      return "Questions added successfully to the local database";
    } catch (error) {
      await this.handleDatabaseError();
      throw error;
    }
  }

  async addQuestionsAsObject(questions: any) {
    try {
      if (Object.keys(questions).length) {
        const db = await this.getDb();
        let item = {
          key: "questions_object",
          value: questions
        };
        await db.put(OBJECTSTORE_VA_QUESTIONS, item);
      }
      return "Questions as object added successfully to the local database";
    } catch (error) {
      await this.handleDatabaseError();
      throw error;
    }
  }

  async getQuestions(key?: string) {
    try {
      const db = await this.getDb();
      const questions = key 
        ? await db.get(OBJECTSTORE_VA_QUESTIONS, key) 
        : await db.getAll(OBJECTSTORE_VA_QUESTIONS) || [];
      return questions;
    } catch (error) {
      await this.handleDatabaseError();
      return [];
    }
  }

  async getQuestionsAsObject() {
    try {
      const db = await this.getDb();
      return db.get(OBJECTSTORE_VA_QUESTIONS, "questions_object");
    } catch (error) {
      await this.handleDatabaseError();
      throw error;
    }
  }

  async getQuestionsByKeys(keys: string[], as_object: boolean = false) {
    try {
      if (as_object) {
        let object = await this.getQuestionsAsObject();
        const questionsObject = object?.value;

        let requested_questionsObject = {};
        for (const key of keys) {
          if (this.cache.has(key)) {
            requested_questionsObject = {
              ...requested_questionsObject,
              [key]: this.cache.get(key)
            };
          } else {
            this.cache.set(key, questionsObject[key]);
            requested_questionsObject = {
              ...requested_questionsObject,
              [key]: questionsObject[key]
            };
          }
        }
        return requested_questionsObject;
      } else {
        const results: any[] = [];
        for (const key of keys) {
          if (this.cache.has(key)) {
            results.push(this.cache.get(key));
          } else {
            const db = await this.getDb();
            const value = await db.get(OBJECTSTORE_VA_QUESTIONS, key);
            this.cache.set(key, value);
            results.push(value);
          }
        }
        return results;
      }
    } catch (error) {
      await this.handleDatabaseError();
      throw error;
    }
  }

  async deleteObjectStore() {
    try {
      const version_number = Number(localStorage.getItem(INDEXED_DB_VERSION));
      
      this.dbPromise = openDB<MyDB>(INDEXED_DB_DATABASE_NAME, version_number + 1, {
        upgrade(db) {
          if (db.objectStoreNames.contains(OBJECTSTORE_VA_QUESTIONS)) {
            db.deleteObjectStore(OBJECTSTORE_VA_QUESTIONS);
            localStorage.setItem(INDEXED_DB_VERSION, String(version_number + 1));
            console.log(`Object store ${OBJECTSTORE_VA_QUESTIONS} deleted successfully`);
          } else {
            console.log(`Object store ${OBJECTSTORE_VA_QUESTIONS} does not exist`);
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

  async deleteDatabase(dbName: string) {
    try {
      await this.closeDatabase();
      const deleteRequest = indexedDB.deleteDatabase(dbName);

      return new Promise((resolve, reject) => {
        deleteRequest.onsuccess = () => {
          console.log(`Database '${dbName}' deleted successfully`);
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