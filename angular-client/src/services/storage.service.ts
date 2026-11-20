import { Injectable } from '@angular/core';
import { BehaviorSubject, defer, finalize, Observable, ReplaySubject, share, Subject } from 'rxjs';
import { DataValue, TimerData, TimerStorageMap } from 'src/utils/socket.utils';
import { RunLaps, Track } from 'src/utils/types.utils';

type Topic = {
  /** Fed by addValue. */
  values: Subject<DataValue>;
  /** What get() returns: shared by its readers, replaying the latest value while any remain. */
  stream: Observable<DataValue>;
};

/**
 * Service for interacting with the storage
 */
@Injectable({ providedIn: 'root' })
export default class Storage {
  private topicStreams = new Map<string, Topic>();
  /** The topics with at least one reader. */
  private read = new Set<string>();
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
   * subscribed the topic is one this client reads, so the server delivers it; when the last
   * subscriber leaves, it isn't.
   */
  public get = (key: string): Observable<DataValue> => {
    let topic = this.topicStreams.get(key);
    if (!topic) {
      const values = new Subject<DataValue>();
      const stream = defer(() => {
        this.setRead(key, true);
        return values;
      }).pipe(
        finalize(() => this.setRead(key, false)),
        share({ connector: () => new ReplaySubject<DataValue>(1) })
      );
      topic = { values, stream };
      this.topicStreams.set(key, topic);
    }
    return topic.stream;
  };

  /** Delivers a value to the topic's readers; a topic nothing reads drops it. */
  public addValue = (key: string, value: DataValue): void => {
    this.topicStreams.get(key)?.values.next(value);
  };

  /** The topics this client reads, sorted. */
  public getTopics = (): string[] => {
    return this.topics;
  };

  /** The full sorted topic list each time it changes, once per task however many get()s changed it. */
  public topicsChanged = (): Observable<string[]> => {
    return this.topicChanges.asObservable();
  };

  private setRead = (key: string, read: boolean): void => {
    if (read) this.read.add(key);
    else this.read.delete(key);
    this.scheduleSync();
  };

  /**
   * Batches every change in the current task into one, so a page that leaves and the page that
   * replaces it send one list, and a topic both read never leaves it. A microtask runs right after
   * the task with no added delay and isn't throttled in background tabs.
   */
  private scheduleSync = (): void => {
    if (this.syncScheduled) return;
    this.syncScheduled = true;
    queueMicrotask(() => {
      this.syncScheduled = false;
      const topics = [...this.read].sort();
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
