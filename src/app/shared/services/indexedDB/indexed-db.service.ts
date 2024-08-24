import { Injectable } from '@angular/core';
import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface MyDB extends DBSchema {
  odk_questions: {
    key: string;
    value: any;
  }
}

@Injectable({
  providedIn: 'root',
})
export class IndexedDBService {

  private dbPromise: Promise<IDBPDatabase<MyDB>>;
  private cache = new Map<string, any>();

  constructor() {
    this.dbPromise = this.initDB();
  }

  private async initDB() {
    return openDB<MyDB>('vmanDB', 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('odk_questions')) {
          const store = db.createObjectStore('odk_questions', { keyPath: 'key' });
        }
      },
    });
  }

  async deleteDatabase(dbName: string) {
    const deleteRequest = indexedDB.deleteDatabase(dbName);

    deleteRequest.onsuccess = function () {
      console.log(`Database '${dbName}' deleted successfully`);
    };

    deleteRequest.onerror = function () {
      console.error(`Failed to delete database '${dbName}':`, deleteRequest.error);
    };

    deleteRequest.onblocked = function () {
      console.warn(`Database deletion blocked: Make sure all connections are closed.`);
    };
  }

  async addQuestions(questions: any) {
    const db = await this.dbPromise;
    for(let key of Object.keys(questions)){
      let item = {
        key: key,
        value: questions[key]
      };
      await db.put('odk_questions', item);
    }
    return Promise.resolve("Questions added successfully to the local database");
  }
  
  async addQuestionsAsObject(questions: any) {
    if(Object.keys(questions).length){
      const db = await this.dbPromise;
      let item = {
        key: "questions_object",
        value: questions
      };
      await db.put('odk_questions', item);
    }
    return Promise.resolve("Questions as object added successfully to the local database");
  }

  // async deleteItem(key: string) {
  //   const db = await this.dbPromise;
  //   return db.delete('odk_questions', key);
  // }

  async getQuestions(key?: string) {
    const db = await this.dbPromise;
    return key ? db.get('odk_questions', key) : db.getAll('odk_questions');
  }
  
  async getQuestionsAsObject() {
    const db = await this.dbPromise;
    return db.get('odk_questions', "questions_object")
  }
  
  async getQuestionsByKeys(keys: string[]) {
    
    const results: any[] = [];

    // Fetch from cache first
    for (const key of keys) {
      if (this.cache.has(key)) {
        results.push(this.cache.get(key));
      } else {
        const db = await this.dbPromise;
        const value = await db.get('odk_questions', key);
        this.cache.set(key, value);
        results.push(value);
      }
    }

    return results;
  }
}
