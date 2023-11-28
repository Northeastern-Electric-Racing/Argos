import { BehaviorSubject } from 'rxjs';
import { DataValue, StorageMap } from 'src/utils/socket.utils';

/**
 * Service for interacting with the storage
 */
export default class Storage {
  private storage: StorageMap;
  private currentRunId?: number;

  constructor(storage: StorageMap) {
    this.storage = storage;
  }

  public get(key: string): BehaviorSubject<DataValue[]> | undefined {
    return this.storage.get(key);
  }

  public set(key: string, value: BehaviorSubject<DataValue[]>): void {
    this.storage.set(key, value);
  }

  public getCurrentRun(): number | undefined {
    return this.currentRunId;
  }

  public setCurrentRun(runId: number) {
    this.currentRunId = runId;
  }
}
