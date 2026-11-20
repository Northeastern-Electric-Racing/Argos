import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, ReplaySubject, Subject } from 'rxjs';
import { DataValue, TimerData, TimerStorageMap } from 'src/utils/socket.utils';
import { RunLaps, Track } from 'src/utils/types.utils';

/** How long a topic stays subscribed after its last reader leaves, so a quick page switch keeps it. */
export const TOPIC_LINGER_MS = 2500;

type TopicEntry = {
  /** Replays the latest value to late subscribers. */
  stream: ReplaySubject<DataValue>;
  readers: number;
  linger?: ReturnType<typeof setTimeout>;
};

/**
 * Service for interacting with the storage
 */
@Injectable({ providedIn: 'root' })
export default class Storage {
  /** The topics this client reads: each one has a reader, or lost its last within the linger. */
  private entries = new Map<string, TopicEntry>();
  private topics: string[] = [];
  private topicChanges = new Subject<string[]>();
  private syncScheduled = false;

  private timerStorage: TimerStorageMap = new Map<string, Subject<TimerData>>();

  private currentRunId = new BehaviorSubject<number | undefined>(undefined);
  private tracks = new BehaviorSubject<Track[]>([]);
  private liveLaps = new BehaviorSubject<RunLaps | undefined>(undefined);

  private resolution: number = 100;

  /**
   * Live values of one topic, replaying the latest to late subscribers. While anything is
   * subscribed (and for TOPIC_LINGER_MS after the last unsubscribes) the topic is one this
   * client reads, so the server delivers it.
   */
  public get = (key: string): Observable<DataValue> => {
    return new Observable<DataValue>((subscriber) => {
      const subscription = this.retain(key).stream.subscribe(subscriber);
      return () => {
        subscription.unsubscribe();
        this.release(key);
      };
    });
  };

  /** Delivers a value to the topic's readers; a topic nothing reads drops it. */
  public addValue = (key: string, value: DataValue): void => {
    this.entries.get(key)?.stream.next(value);
  };

  /** The topics this client reads, sorted. */
  public getTopics = (): string[] => {
    return this.topics;
  };

  /** The full sorted topic list each time it changes, once per task however many get()s changed it. */
  public topicsChanged = (): Observable<string[]> => {
    return this.topicChanges.asObservable();
  };

  private retain = (key: string): TopicEntry => {
    let entry = this.entries.get(key);
    if (!entry) {
      entry = { stream: new ReplaySubject<DataValue>(1), readers: 0 };
      this.entries.set(key, entry);
      this.scheduleSync();
    }
    clearTimeout(entry.linger);
    entry.linger = undefined;
    entry.readers++;
    return entry;
  };

  private release = (key: string): void => {
    const entry = this.entries.get(key);
    if (!entry || --entry.readers > 0) return;
    entry.linger = setTimeout(() => {
      this.entries.delete(key);
      this.scheduleSync();
    }, TOPIC_LINGER_MS);
  };

  /**
   * Batches every change in the current task (a page mount's many get() calls) into one. A
   * microtask runs right after the task with no added delay and isn't throttled in background tabs.
   */
  private scheduleSync = (): void => {
    if (this.syncScheduled) return;
    this.syncScheduled = true;
    queueMicrotask(() => {
      this.syncScheduled = false;
      const topics = [...this.entries.keys()].sort();
      if (topics.length === this.topics.length && topics.every((topic, i) => topic === this.topics[i])) return;
      this.topics = topics;
      this.topicChanges.next(topics);
    });
  };

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
