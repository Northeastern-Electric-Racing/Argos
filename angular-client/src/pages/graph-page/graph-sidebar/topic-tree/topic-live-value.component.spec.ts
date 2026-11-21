import { ComponentFixture, TestBed } from '@angular/core/testing';
import Storage, { TOPIC_SWEEP_MS } from 'src/services/storage.service';
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
  /** Whether the server sends this client the topic, once the task and the next sweep have run. */
  const reading = async () => {
    await Promise.resolve();
    vi.advanceTimersByTime(TOPIC_SWEEP_MS);
    return storage.getTopics().includes(topic);
  };
  const text = () => (fixture.nativeElement as HTMLElement).textContent?.trim();

  beforeEach(() => {
    // only the sweep's interval: Angular renders on real timers
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    storage = TestBed.inject(Storage);
  });

  afterEach(() => {
    vi.useRealTimers();
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
    expect(await reading()).toBe(false);
    await create();
    expect(await reading()).toBe(true);
    fixture.destroy();
    expect(await reading()).toBe(false);
  });
});
