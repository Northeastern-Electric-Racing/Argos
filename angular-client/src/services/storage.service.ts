import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';
import { DataValue, StorageMap, TimerData, TimerStorageMap } from 'src/utils/socket.utils';

/**
 * Service for interacting with the storage
 */
@Injectable({ providedIn: 'root' })
export default class Storage {
  private storage: StorageMap;
  private timerStorage: TimerStorageMap;

  private currentRunId = new BehaviorSubject<number | undefined>(undefined);

  private resolution: number = 100;

  constructor() {
    this.storage = new Map<string, Subject<DataValue>>();
    this.timerStorage = new Map<string, Subject<TimerData>>();
  }

  public get = (key: string): Subject<DataValue> => {
    const subject = this.storage.get(key);
    if (!subject) {
      const subject = new Subject<DataValue>();
      this.storage.set(key, subject);
      return subject;
    }
    return subject;
  };

  public addValue = (key: string, value: DataValue): void => {
    const subject = this.get(key);
    subject.next(value);
  };

  public getCurrentRunId = () => {
    return this.currentRunId;
  };

  public setCurrentRunId = (runId?: number) => {
    this.currentRunId.next(runId);
  };

  public setResolution = (resolution: number) => {
    this.resolution = resolution;
  };

  public getResolution = (): number => {
    return this.resolution;
  };

  public getTimerData = (key: string): Subject<TimerData> => {
    const subject = this.timerStorage.get(key);
    if (!subject) {
      const subject = new Subject<TimerData>();
      this.timerStorage.set(key, subject);
      return subject;
    }
    return subject;
  };

  public addTimerValue = (key: string, value: TimerData) => {
    const subject = this.getTimerData(key);
    subject.next(value);
  };
}
