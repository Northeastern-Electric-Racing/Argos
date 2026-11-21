import { TestBed } from '@angular/core/testing';
import Storage, { TOPIC_SWEEP_MS } from './storage.service';
import { DataValue } from 'src/utils/socket.utils';

const value = (v: string): DataValue => ({ values: [v], time: '0', unit: 'x' });

/** Ends the task, which sends the topics added in it. */
const endTask = () => Promise.resolve();
/** Runs the next sweep, which removes the topics nothing reads any more. */
const sweep = () => vi.advanceTimersByTime(TOPIC_SWEEP_MS);

describe('Storage (topic subscriptions)', () => {
  let storage: Storage;
  let changes: string[][];

  beforeEach(() => {
    vi.useFakeTimers();
    storage = TestBed.inject(Storage);
    changes = [];
    storage.topicsChanged().subscribe((topics) => changes.push(topics));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('reads no topics before anything subscribes', async () => {
    await endTask();
    sweep();
    expect(storage.getTopics()).toEqual([]);
    expect(changes).toEqual([]);
  });

  it('does not read a topic that is only fetched, not subscribed', async () => {
    storage.get('A/B');
    await endTask();
    expect(storage.getTopics()).toEqual([]);
    expect(changes).toEqual([]);
  });

  it('adds every topic first read in a task in one change, without waiting for a sweep', async () => {
    ['E/F', 'A/B', 'C/D'].forEach((topic) => storage.get(topic).subscribe());
    expect(changes).toEqual([]);
    await endTask();
    expect(changes).toEqual([['A/B', 'C/D', 'E/F']]);
    expect(storage.getTopics()).toEqual(['A/B', 'C/D', 'E/F']);
  });

  it('counts readers of the same topic once', async () => {
    const first = storage.get('A/B').subscribe();
    storage.get('A/B').subscribe();
    await endTask();
    first.unsubscribe();
    sweep();
    expect(changes).toEqual([['A/B']]);
  });

  it('keeps a topic whose last reader left until the next sweep, then removes it', async () => {
    storage.get('A/B').subscribe();
    const leaving = storage.get('C/D').subscribe();
    await endTask();
    leaving.unsubscribe();
    await endTask();
    expect(storage.getTopics()).toEqual(['A/B', 'C/D']);
    sweep();
    expect(changes).toEqual([['A/B', 'C/D'], ['A/B']]);
  });

  it('removes every topic a page read in one change at the sweep after the page leaves', async () => {
    const page = ['A/B', 'C/D', 'E/F'].map((topic) => storage.get(topic).subscribe());
    storage.get('G/H').subscribe();
    await endTask();
    page.forEach((subscription) => subscription.unsubscribe());
    sweep();
    expect(changes).toEqual([['A/B', 'C/D', 'E/F', 'G/H'], ['G/H']]);
  });

  it('never removes a topic read again before the sweep, as on a page switch', async () => {
    const leaving = storage.get('A/B').subscribe();
    await endTask();
    leaving.unsubscribe();
    storage.get('A/B').subscribe();
    await endTask();
    sweep();
    expect(changes).toEqual([['A/B']]);
  });

  it('sends nothing at a sweep when no topic was left', async () => {
    storage.get('A/B').subscribe();
    await endTask();
    sweep();
    sweep();
    expect(changes).toEqual([['A/B']]);
  });

  it('delivers values to subscribers of the topic', () => {
    const seen: string[] = [];
    storage.get('A/B').subscribe((v) => seen.push(v.values[0]));
    storage.addValue('A/B', value('1'));
    storage.addValue('C/D', value('2'));
    expect(seen).toEqual(['1']);
  });

  it('replays the latest value to a late subscriber', () => {
    storage.get('A/B').subscribe();
    storage.addValue('A/B', value('1'));
    storage.addValue('A/B', value('2'));
    const seen: string[] = [];
    storage.get('A/B').subscribe((v) => seen.push(v.values[0]));
    expect(seen).toEqual(['2']);
  });

  it('forgets the latest value as soon as nothing reads the topic, before the sweep', () => {
    const reader = storage.get('A/B').subscribe();
    storage.addValue('A/B', value('1'));
    reader.unsubscribe();
    const seen: string[] = [];
    storage.get('A/B').subscribe((v) => seen.push(v.values[0]));
    expect(seen).toEqual([]);
  });
});
