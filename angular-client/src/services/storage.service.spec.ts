import Storage from './storage.service';
import { DataValue } from 'src/utils/socket.utils';

const value = (v: string): DataValue => ({ values: [v], time: '0', unit: 'x' });

/** Lets the queued microtask sync run. */
const flushSync = () => Promise.resolve();

describe('Storage (selective subscription)', () => {
  let storage: Storage;
  let sets: (string[] | null)[];

  // jasmine.clock instead of fakeAsync: the test env is zoneless (src/test-setup.ts)
  const tick = (ms: number) => jasmine.clock().tick(ms);

  beforeEach(() => {
    jasmine.clock().install();
    storage = new Storage();
    sets = [];
    storage.getDesiredSet().subscribe((set) => sets.push(set));
  });

  afterEach(() => jasmine.clock().uninstall());

  it('stays on the firehose (null) until a first reader appears', async () => {
    await flushSync();
    expect(sets).toEqual([null]);
  });

  it('batches all get() calls in one task into a single sync', async () => {
    const subs = ['A/B', 'C/D', 'E/F'].map((topic) => storage.get(topic).subscribe());
    expect(sets).toEqual([null]); // nothing sent until the task ends
    await flushSync();
    expect(sets).toEqual([null, ['A/B', 'C/D', 'E/F']]);
    subs.forEach((sub) => sub.unsubscribe());
    tick(6000);
  });

  it('dedupes readers of the same topic', async () => {
    const first = storage.get('A/B').subscribe();
    const second = storage.get('A/B').subscribe();
    await flushSync();
    expect(sets).toEqual([null, ['A/B']]);
    first.unsubscribe();
    second.unsubscribe();
    tick(6000);
  });

  it('drops a topic only after the linger elapses', async () => {
    const sub = storage.get('A/B').subscribe();
    await flushSync();
    sub.unsubscribe();
    tick(4000);
    await flushSync();
    expect(sets).toEqual([null, ['A/B']]);
    tick(1100);
    await flushSync();
    expect(sets).toEqual([null, ['A/B'], []]);
  });

  it('keeps a topic when a reader returns within the linger', async () => {
    const first = storage.get('A/B').subscribe();
    await flushSync();
    first.unsubscribe();
    tick(2000);
    const second = storage.get('A/B').subscribe();
    tick(6000);
    await flushSync();
    expect(sets).toEqual([null, ['A/B']]);
    second.unsubscribe();
    tick(6000);
  });

  it('replays the latest value to late subscribers while the entry is alive', () => {
    const first = storage.get('A/B').subscribe();
    storage.addValue('A/B', value('1'));
    storage.addValue('A/B', value('2'));
    const seen: string[] = [];
    const second = storage.get('A/B').subscribe((v) => seen.push(v.values[0]));
    expect(seen).toEqual(['2']);
    first.unsubscribe();
    second.unsubscribe();
    tick(6000);
  });
});
