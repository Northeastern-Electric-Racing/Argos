import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { DataValue, StorageMap } from 'src/utils/socket.utils';

/**
 * Service for interacting with the storage
 */
@Injectable({ providedIn: 'root' })
export default class Storage {
  private storage: StorageMap;
  private currentRunId?: number;
  private resolution: number = 100;

  constructor() {
    this.storage = new Map<string, Subject<DataValue>>();
  }

  public get = (key: string): Subject<DataValue> => {
    const subject = this.storage.get(key);
    if (!subject) {
      this.storage.set(key, new Subject<DataValue>());
      return this.storage.get(key)!;
    }
    return subject;
  };

  public addValue = (key: string, value: DataValue): void => {
    const subject = this.get(key);
    subject.next(value);
  };

  public getCurrentRunId = (): number | undefined => {
    return this.currentRunId;
  };

  public setCurrentRunId = (runId: number) => {
    this.currentRunId = runId;
  };

  public setResolution = (resolution: number) => {
    this.resolution = resolution;
  };

  public getResolution = (): number => {
    return this.resolution;
  };
}
