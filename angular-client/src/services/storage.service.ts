import { DataValue, StorageMap } from 'src/utils/socket.utils';

/**
 * Service for interacting with the storage
 */
export default class Storage {
  private storage: StorageMap;

  constructor(storage: StorageMap) {
    this.storage = storage;
  }

  public get(key: string): DataValue[] | undefined {
    return this.storage.get(key);
  }

  public set(key: string, value: any): void {
    this.storage.set(key, value);
  }
}
