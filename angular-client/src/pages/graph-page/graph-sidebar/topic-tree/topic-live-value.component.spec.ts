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

  it("starts from the topic's latest value, as a row shown on expand does", async () => {
    storage.addValue(topic, value('4'));
    await create();
    expect(text()).toBe('4.000V');
  });

  it('subscribes to its topic only while it exists', async () => {
    expect(storage.get(topic).observed).toBe(false);
    await create();
    expect(storage.get(topic).observed).toBe(true);
    fixture.destroy();
    expect(storage.get(topic).observed).toBe(false);
  });
});
