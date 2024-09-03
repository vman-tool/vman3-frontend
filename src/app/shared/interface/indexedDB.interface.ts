import { DBSchema } from "idb";
import { OBJECTSTORE_VA_QUESTIONS } from "../constants/indexedDB.constants";


export interface MyDB extends DBSchema {
  [OBJECTSTORE_VA_QUESTIONS]: {
    key: string;
    value: any;
  }
}