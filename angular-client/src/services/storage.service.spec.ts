import Storage from './storage.service';
import { DataValue } from 'src/utils/socket.utils';

const value = (v: string): DataValue => ({ values: [v], time: '0', unit: 'x' });

describe('Storage (selective subscription)', () => {
  let storage: Storage;
  let sets: (string[] | null)[];

  // jasmine.clock instead of fakeAsync: the test env is zoneless (src/test-setup.ts)
  const tick = (ms: number) => jasmine.clock().tick(ms);

  beforeEach(() => {
    jasmine.clock().install();
    jasmine.clock().mockDate();
    storage = new Storage();
    sets = [];
    storage.getDesiredSet().subscribe((set) => sets.push(set));
  });

  afterEach(() => jasmine.clock().uninstall());

  it('stays on the firehose (null) until a first reader appears', () => {
    expect(sets).toEqual([null]);
    tick(50);
    expect(sets).toEqual([null]);
  });

  it('adds a topic on the first get() subscriber and dedupes further readers', () => {
    const first = storage.get('A/B').subscribe();
    tick(20);
    const second = storage.get('A/B').subscribe();
    tick(20);
    expect(sets).toEqual([null, ['A/B']]);
    first.unsubscribe();
    second.unsubscribe();
    tick(6000);
  });

  it('drops a topic only after the linger elapses', () => {
    const sub = storage.get('A/B').subscribe();
    tick(20);
    sub.unsubscribe();
    tick(4000);
    expect(sets).toEqual([null, ['A/B']]);
    tick(1100);
    expect(sets).toEqual([null, ['A/B'], []]);
  });

  it('keeps a topic when a reader returns within the linger', () => {
    const first = storage.get('A/B').subscribe();
    tick(20);
    first.unsubscribe();
    tick(2000);
    const second = storage.get('A/B').subscribe();
    tick(6000);
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

  it('includes wildcard filters and routes matching messages with their topic', () => {
    const seen: string[] = [];
    const sub = storage.subscribe('BMS/PerCell/#').subscribe((message) => seen.push(message.topic));
    tick(20);
    expect(sets).toEqual([null, ['BMS/PerCell/#']]);
    storage.addValue('BMS/PerCell/3/Volt', value('4.1'));
    storage.addValue('MPU/Speed', value('99'));
    expect(seen).toEqual(['BMS/PerCell/3/Volt']);
    sub.unsubscribe();
    tick(6000);
    expect(sets).toEqual([null, ['BMS/PerCell/#'], []]);
  });
});
