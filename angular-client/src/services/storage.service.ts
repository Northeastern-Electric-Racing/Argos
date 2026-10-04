import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, ReplaySubject, Subject } from 'rxjs';
import { DataValue, TimerData, TimerStorageMap } from 'src/utils/socket.utils';

type TopicEntry = {
  stream: ReplaySubject<DataValue>;
  readers: number;
  linger?: ReturnType<typeof setTimeout>;
};

/** How long a topic stays in the desired set after its last reader leaves. */
const LINGER_MS = 5000;

/**
 * Service for interacting with the storage
 */
@Injectable({ providedIn: 'root' })
export default class Storage {
  private entries = new Map<string, TopicEntry>();

  /**
   * The full topic list this client wants the server to deliver.
   * Stays null (never emitted -> server firehoses) until the first non-empty
   * set exists, so a client with no readers behaves exactly like today.
   */
  private desiredSet = new BehaviorSubject<string[] | null>(null);
  private syncScheduled = false;

  private timerStorage: TimerStorageMap = new Map<string, Subject<TimerData>>();

  private currentRunId = new BehaviorSubject<number | undefined>(undefined);

  private resolution: number = 100;

  /**
   * Live stream for one exact topic. Ref-counted: while any subscriber is
   * attached (plus a short linger after the last one leaves) the topic is part
   * of the desired set sent to the server. Replays the latest value to late
   * subscribers.
   */
  public get = (key: string): Observable<DataValue> => {
    return new Observable<DataValue>((subscriber) => {
      const entry = this.retainTopic(key);
      const sub = entry.stream.subscribe(subscriber);
      return () => {
        sub.unsubscribe();
        this.releaseTopic(key);
      };
    });
  };

  public addValue = (key: string, value: DataValue): void => {
    this.entries.get(key)?.stream.next(value);
  };

  /**
   * The desired topic list as it changes (batched per task, deduplicated).
   * null = never had a non-empty set; the client should stay on the firehose.
   */
  public getDesiredSet = (): Observable<string[] | null> => {
    return this.desiredSet.asObservable();
  };

  public getCurrentDesiredSet = (): string[] | null => {
    return this.desiredSet.value;
  };

  private retainTopic = (key: string): TopicEntry => {
    let entry = this.entries.get(key);
    if (!entry) {
      entry = { stream: new ReplaySubject<DataValue>(1), readers: 0 };
      this.entries.set(key, entry);
    }
    if (entry.linger !== undefined) {
      clearTimeout(entry.linger);
      entry.linger = undefined;
    }
    entry.readers++;
    this.scheduleSync();
    return entry;
  };

  private releaseTopic = (key: string): void => {
    const entry = this.entries.get(key);
    if (!entry) return;
    entry.readers--;
    if (entry.readers > 0) return;
    entry.linger = setTimeout(() => {
      this.entries.delete(key);
      this.scheduleSync();
    }, LINGER_MS);
  };

  /**
   * Batches every retain/release in the current task (e.g. a page mount's
   * hundreds of get() calls) into one sync. A microtask runs right after the
   * current task with no added delay, and unlike a timer is not throttled in
   * background tabs.
   */
  private scheduleSync = (): void => {
    if (this.syncScheduled) return;
    this.syncScheduled = true;
    queueMicrotask(() => {
      this.syncScheduled = false;
      this.pushDesiredSet();
    });
  };

  private pushDesiredSet = (): void => {
    const set = [...this.entries.keys()].sort();
    const previous = this.desiredSet.value;
    if (previous === null && set.length === 0) return;
    if (previous !== null && previous.length === set.length && previous.every((topic, i) => topic === set[i])) {
      return;
    }
    this.desiredSet.next(set);
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
