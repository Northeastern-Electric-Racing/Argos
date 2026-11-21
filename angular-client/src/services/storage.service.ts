import { Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BehaviorSubject, defer, finalize, interval, Observable, ReplaySubject, share, Subject } from 'rxjs';
import { DataValue, TimerData, TimerStorageMap } from 'src/utils/socket.utils';
import { RunLaps, Track } from 'src/utils/types.utils';

/** How often topics nothing reads any more leave the list the server sends this client. */
export const TOPIC_SWEEP_MS = 2500;

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
  /** The topics the server sends: every read topic, plus those whose last reader left since the last sweep. */
  private listed = new Set<string>();
  private topics: string[] = [];
  private topicChanges = new Subject<string[]>();
  private publishScheduled = false;

  private timerStorage: TimerStorageMap = new Map<string, Subject<TimerData>>();

  private currentRunId = new BehaviorSubject<number | undefined>(undefined);
  private tracks = new BehaviorSubject<Track[]>([]);
  private liveLaps = new BehaviorSubject<RunLaps | undefined>(undefined);

  private resolution: number = 100;

  constructor() {
    interval(TOPIC_SWEEP_MS)
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.sweep());
  }

  /**
   * Live values of one topic, replaying the latest to late subscribers. The first subscriber
   * adds the topic to the list the server sends at once; after the last leaves, the next sweep
   * removes it.
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

  /** The topics the server sends this client, sorted. */
  public getTopics = (): string[] => {
    return this.topics;
  };

  /** The full sorted topic list each time it changes: when a topic is first read, and when a sweep removes some. */
  public topicsChanged = (): Observable<string[]> => {
    return this.topicChanges.asObservable();
  };

  private setRead = (key: string, read: boolean): void => {
    if (!read) {
      this.read.delete(key);
      return;
    }
    this.read.add(key);
    if (this.listed.has(key)) return;
    this.listed.add(key);
    this.schedulePublish();
  };

  /** Removes the topics nothing reads any more. A topic read again before the sweep never leaves the list. */
  private sweep = (): void => {
    // read is a subset of listed, so the same size means the same topics
    if (this.listed.size === this.read.size) return;
    this.listed = new Set(this.read);
    this.publish();
  };

  /** Publishes at the end of the task, so a page's many get()s add their topics in one list. */
  private schedulePublish = (): void => {
    if (this.publishScheduled) return;
    this.publishScheduled = true;
    queueMicrotask(() => {
      this.publishScheduled = false;
      this.publish();
    });
  };

  private publish = (): void => {
    const topics = [...this.listed].sort();
    if (topics.length === this.topics.length && topics.every((topic, i) => topic === this.topics[i])) return;
    this.topics = topics;
    this.topicChanges.next(topics);
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
