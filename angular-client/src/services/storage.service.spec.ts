import Storage, { TOPIC_LINGER_MS } from './storage.service';
import { DataValue } from 'src/utils/socket.utils';

const value = (v: string): DataValue => ({ values: [v], time: '0', unit: 'x' });

/** Lets the microtask that batches a task's topic changes run. */
const flush = () => Promise.resolve();

describe('Storage (topic subscriptions)', () => {
  let storage: Storage;
  let changes: string[][];

  beforeEach(() => {
    vi.useFakeTimers();
    storage = new Storage();
    changes = [];
    storage.topicsChanged().subscribe((topics) => changes.push(topics));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('reads no topics before anything subscribes', async () => {
    await flush();
    expect(storage.getTopics()).toEqual([]);
    expect(changes).toEqual([]);
  });

  it('does not read a topic that is only fetched, not subscribed', async () => {
    storage.get('A/B');
    await flush();
    expect(storage.getTopics()).toEqual([]);
    expect(changes).toEqual([]);
  });

  it('batches every get() subscription in one task into a single change', async () => {
    ['E/F', 'A/B', 'C/D'].forEach((topic) => storage.get(topic).subscribe());
    expect(changes).toEqual([]);
    await flush();
    expect(changes).toEqual([['A/B', 'C/D', 'E/F']]);
    expect(storage.getTopics()).toEqual(['A/B', 'C/D', 'E/F']);
  });

  it('counts readers of the same topic once', async () => {
    const first = storage.get('A/B').subscribe();
    storage.get('A/B').subscribe();
    await flush();
    first.unsubscribe();
    vi.advanceTimersByTime(TOPIC_LINGER_MS * 2);
    await flush();
    expect(changes).toEqual([['A/B']]);
  });

  it('lingers about 2-3 s after the last reader leaves', () => {
    expect(TOPIC_LINGER_MS).toBeGreaterThanOrEqual(2000);
    expect(TOPIC_LINGER_MS).toBeLessThanOrEqual(3000);
  });

  it('releases a topic only once the linger elapses', async () => {
    storage.get('A/B').subscribe();
    const leaving = storage.get('C/D').subscribe();
    await flush();
    leaving.unsubscribe();
    vi.advanceTimersByTime(TOPIC_LINGER_MS - 1);
    await flush();
    expect(storage.getTopics()).toEqual(['A/B', 'C/D']);
    vi.advanceTimersByTime(1);
    await flush();
    expect(storage.getTopics()).toEqual(['A/B']);
    expect(changes).toEqual([['A/B', 'C/D'], ['A/B']]);
  });

  it('keeps a topic when a reader returns within the linger', async () => {
    storage.get('A/B').subscribe().unsubscribe();
    await flush();
    vi.advanceTimersByTime(TOPIC_LINGER_MS / 2);
    storage.get('A/B').subscribe();
    vi.advanceTimersByTime(TOPIC_LINGER_MS * 2);
    await flush();
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
});
