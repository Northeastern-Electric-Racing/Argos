import { ComponentFixture, TestBed } from '@angular/core/testing';
import Storage from 'src/services/storage.service';
import { TopicLiveValueComponent } from './topic-live-value.component';

describe('TopicLiveValueComponent', () => {
  let storage: Storage;
  let fixture: ComponentFixture<TopicLiveValueComponent>;
  const topic = 'BMS/Pack/Voltage';
  const value = (v: string) => ({ values: [v], time: '0', unit: 'V' });

  const create = async () => {
    fixture = TestBed.createComponent(TopicLiveValueComponent);
    fixture.componentRef.setInput('topic', topic);
    fixture.autoDetectChanges();
    await fixture.whenStable();
  };
  /** Readers of the topic; a released topic stays in getTopics() until the sweep, so count readers. */
  const readers = () =>
    (storage as unknown as { entries: Map<string, { readers: number }> }).entries.get(topic)?.readers ?? 0;
  const text = () => (fixture.nativeElement as HTMLElement).textContent?.trim();

  beforeEach(() => {
    storage = TestBed.inject(Storage);
  });

  it('shows N/A until the topic has a value, then follows it', async () => {
    await create();
    expect(text()).toBe('N/A');
    storage.addValue(topic, value('1.23456'));
    await fixture.whenStable();
    expect(text()).toBe('1.235V');
  });

  it("starts from the topic's latest value when something else already reads it", async () => {
    const graph = storage.get(topic).subscribe();
    storage.addValue(topic, value('4'));
    await create();
    expect(text()).toBe('4.000V');
    graph.unsubscribe();
  });

  it('subscribes to its topic only while it exists', async () => {
    expect(readers()).toBe(0);
    await create();
    expect(readers()).toBe(1);
    fixture.destroy();
    expect(readers()).toBe(0);
  });
});
