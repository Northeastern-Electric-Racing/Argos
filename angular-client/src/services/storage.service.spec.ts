import Storage from './storage.service';
import { DataValue } from 'src/utils/socket.utils';

const value = (v: string): DataValue => ({ values: [v], time: '0', unit: 'x' });

/** Lets the microtask that batches a task's topic changes run. */
const flush = () => Promise.resolve();

describe('Storage (topic subscriptions)', () => {
  let storage: Storage;
  let changes: string[][];

  beforeEach(() => {
    storage = new Storage();
    changes = [];
    storage.topicsChanged().subscribe((topics) => changes.push(topics));
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
    await flush();
    expect(changes).toEqual([['A/B']]);
  });

  it('drops a topic as soon as its last reader leaves', async () => {
    storage.get('A/B').subscribe();
    const leaving = storage.get('C/D').subscribe();
    await flush();
    leaving.unsubscribe();
    await flush();
    expect(changes).toEqual([['A/B', 'C/D'], ['A/B']]);
  });

  it('drops every topic a page read in one change when the page leaves', async () => {
    const page = ['A/B', 'C/D', 'E/F'].map((topic) => storage.get(topic).subscribe());
    storage.get('G/H').subscribe();
    await flush();
    page.forEach((subscription) => subscription.unsubscribe());
    await flush();
    expect(changes).toEqual([['A/B', 'C/D', 'E/F', 'G/H'], ['G/H']]);
  });

  it('sends nothing when a topic is left and read again in the same task, as on a page switch', async () => {
    const leaving = storage.get('A/B').subscribe();
    await flush();
    leaving.unsubscribe();
    storage.get('A/B').subscribe();
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

  it('forgets the latest value once nothing reads the topic', () => {
    const reader = storage.get('A/B').subscribe();
    storage.addValue('A/B', value('1'));
    reader.unsubscribe();
    const seen: string[] = [];
    storage.get('A/B').subscribe((v) => seen.push(v.values[0]));
    expect(seen).toEqual([]);
  });
});
