import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';
import { DataValue, StorageMap, TimerData, TimerStorageMap } from 'src/utils/socket.utils';
import { RunLaps, Track } from 'src/utils/types.utils';

/**
 * Service for interacting with the storage
 */
@Injectable({ providedIn: 'root' })
export default class Storage {
  private storage: StorageMap;
  /** Each topic's latest value, so a reader that subscribes late (an expanded tree row) shows it at once. */
  private latestValues = new Map<string, DataValue>();
  private timerStorage: TimerStorageMap;

  private currentRunId = new BehaviorSubject<number | undefined>(undefined);
  private tracks = new BehaviorSubject<Track[]>([]);
  private liveLaps = new BehaviorSubject<RunLaps | undefined>(undefined);

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
    this.latestValues.set(key, value);
    const subject = this.get(key);
    subject.next(value);
  };

  /** The topic's latest value, or undefined before its first one. */
  public latest = (key: string): DataValue | undefined => this.latestValues.get(key);

  public getCurrentRunId = () => {
    return this.currentRunId;
  };

  public setCurrentRunId = (runId?: number) => {
    this.currentRunId.next(runId);
  };

  public getTracks = () => {
    return this.tracks;
  };

  public setTracks = (tracks: Track[]) => {
    this.tracks.next(tracks);
  };

  public getLiveLaps = () => {
    return this.liveLaps;
  };

  public setLiveLaps = (laps: RunLaps) => {
    this.liveLaps.next(laps);
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
