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

  constructor() {
    this.dbPromise = this.initDB();
  }

  private async initDB(is_another_version?: boolean) {
    const version_number = is_another_version ? Number(localStorage.getItem(INDEXED_DB_VERSION) || "1") + 1 : Number(localStorage.getItem(INDEXED_DB_VERSION) || "1") 

    return openDB<MyDB>(INDEXED_DB_DATABASE_NAME, version_number, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(OBJECTSTORE_VA_QUESTIONS)) {
          const store = db.createObjectStore(OBJECTSTORE_VA_QUESTIONS, { keyPath: 'key' });
          localStorage.setItem(INDEXED_DB_VERSION, String(version_number+1))
        }
      },
    });
  }
  private async getDb(): Promise<IDBPDatabase<MyDB>> {
      if (!this.dbPromise) {
          this.dbPromise = this.initDB();
      }
      return this.dbPromise;
  }

  private async closeDatabase(): Promise<void> {
    this.dbPromise.then(db => db.close());
  }


  async deleteObjectStore() {
    const version_number = Number(localStorage.getItem(INDEXED_DB_VERSION))
    
    this.dbPromise = openDB<MyDB>(INDEXED_DB_DATABASE_NAME, version_number+1, {
      upgrade(db) {
        if (db.objectStoreNames.contains(OBJECTSTORE_VA_QUESTIONS)) {
          db.deleteObjectStore(OBJECTSTORE_VA_QUESTIONS);

          localStorage.setItem(INDEXED_DB_VERSION, String(version_number+1))
          console.log(`Object store ${OBJECTSTORE_VA_QUESTIONS} deleted successfully`);
        } else {
          console.log(`Object store ${OBJECTSTORE_VA_QUESTIONS} does not exist`);
        }
      }
    });

  this.dbPromise;
  console.log('Database opened and upgrade completed');
}
  async deleteDatabase(dbName: string) {
    await this.closeDatabase();
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
    const db = await this.getDb();
    for(let key of Object.keys(questions)){
      let item = {
        key: key,
        value: questions[key]
      };
      await db.put(OBJECTSTORE_VA_QUESTIONS, item);
    }
    return Promise.resolve("Questions added successfully to the local database");
  }
  
  async addQuestionsAsObject(questions: any) {
    if(Object.keys(questions).length){
      const db = await this.getDb();
      let item = {
        key: "questions_object",
        value: questions
      };
      await db.put(OBJECTSTORE_VA_QUESTIONS, item);
    }
    return Promise.resolve("Questions as object added successfully to the local database");
  }

  // async deleteItem(key: string) {
  //   const db = await this.dbPromise;
  //   return db.delete('odk_questions', key);
  // }

  async getQuestions(key?: string) {
    try {
      const db = await this.getDb();
      const questions = key ? await db.get(OBJECTSTORE_VA_QUESTIONS, key) :await db.getAll(OBJECTSTORE_VA_QUESTIONS) || [];
      return questions 
    } catch (error) {
      return Promise.resolve([])
    }
  }
  
  async getQuestionsAsObject() {
    const db = await this.getDb();
    return db.get(OBJECTSTORE_VA_QUESTIONS, "questions_object")
  }
  
  async getQuestionsByKeys(keys: string[], as_object: boolean = false) {
    
    if(as_object){
      let object = await this.getQuestionsAsObject();
      
      const questionsObject = object?.value 

      let requested_questionsObject = {}
      for (const key of keys){
        if (this.cache.has(key)) {
          requested_questionsObject = {
            ...requested_questionsObject,
            [key]: this.cache.get(key)
          }
        } else {
          this.cache.set(key, questionsObject[key]);
          requested_questionsObject = {
            ...requested_questionsObject,
            [key]: questionsObject[key]
          }

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
      return results    
    }
  }
}
