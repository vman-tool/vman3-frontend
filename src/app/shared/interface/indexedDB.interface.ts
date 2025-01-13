import { DBSchema } from "idb";
import { OBJECTSTORE_VA_QUESTIONS } from "../constants/indexedDB.constants";


export interface MyDB extends DBSchema {
  [OBJECTSTORE_VA_QUESTIONS]: {
    key: string;
    value: any;
  }
}


export interface IndexedDBObjectStore extends DBSchema {
  [storeName: string]: {
    key: string;
    value: any;
  };
}

export interface ObjectStoreConfig {
  name: string;
  keyPath: string;
  indexes?: {
    [key: string]: { key: IDBValidKey; value: string };
  };
}
