import { DBSchema } from "idb";
import { OBJECTSTORE_VA_QUESTIONS } from "../constants/indexedDB.constants";


export interface MyDB extends DBSchema {
  [OBJECTSTORE_VA_QUESTIONS]: {
    key: string;
    value: any;
  }
}

interface StoreRecord {
  key: string;
  value: any;
}


export interface VmanIndexedDB extends DBSchema {
  [key: string]: {
    key: string;
    value: StoreRecord;
  };
}

export interface ObjectStoreConfig {
  name: string;
  keyPath: string;
  indexes?: {
    [key: string]: { key: IDBValidKey; value: string };
  };
}
