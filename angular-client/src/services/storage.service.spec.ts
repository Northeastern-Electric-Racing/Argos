import { TestBed } from '@angular/core/testing';
import { DataValue } from 'src/utils/socket.utils';
import Storage from './storage.service';

describe('Storage', () => {
  let storage: Storage;
  const value = (v: string): DataValue => ({ values: [v], time: '0', unit: 'V' });

  beforeEach(() => {
    storage = TestBed.inject(Storage);
  });

  it("gives a late subscriber the topic's latest value at once, then follows it", () => {
    const topic = 'storage-spec/late';
    storage.addValue(topic, value('1'));
    storage.addValue(topic, value('2'));
    const seen: string[] = [];
    const subscription = storage.get(topic).subscribe((v) => seen.push(v.values[0]));
    storage.addValue(topic, value('3'));
    subscription.unsubscribe();
    expect(seen).toEqual(['2', '3']);
  });

  it('gives a subscriber nothing before the topic has a value', () => {
    const seen: DataValue[] = [];
    const subscription = storage.get('storage-spec/empty').subscribe((v) => seen.push(v));
    subscription.unsubscribe();
    expect(seen).toEqual([]);
  });
});
