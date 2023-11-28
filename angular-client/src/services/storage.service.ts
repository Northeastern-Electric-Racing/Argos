import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { DataValue, StorageMap } from 'src/utils/socket.utils';

/**
 * Service for interacting with the storage
 */
@Injectable({ providedIn: 'root' })
export default class Storage {
  private storage: StorageMap;
  private currentRunId?: number;

  constructor() {
    this.storage = new Map<string, BehaviorSubject<DataValue[]>>();
  }

  public get(key: string): BehaviorSubject<DataValue[]> | undefined {
    return this.storage.get(key);
  }

  public set(key: string, value: BehaviorSubject<DataValue[]>): void {
    this.storage.set(key, value);
  }

  public getCurrentRunId(): number | undefined {
    return this.currentRunId;
  }

  public setCurrentRunId(runId: number) {
    this.currentRunId = runId;
  }
}
