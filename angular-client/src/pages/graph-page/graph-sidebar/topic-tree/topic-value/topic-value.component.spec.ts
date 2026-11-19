import { ComponentFixture, TestBed } from '@angular/core/testing';
import Storage from 'src/services/storage.service';
import { TopicValueComponent } from './topic-value.component';

/** jsdom has no IntersectionObserver; this one lets a spec move its targets on and off screen. */
class FakeIntersectionObserver {
  static instances: FakeIntersectionObserver[] = [];
  readonly targets = new Set<Element>();
  constructor(readonly callback: IntersectionObserverCallback) {
    FakeIntersectionObserver.instances.push(this);
  }
  observe(target: Element): void {
    this.targets.add(target);
  }
  unobserve(target: Element): void {
    this.targets.delete(target);
  }
  disconnect(): void {
    this.targets.clear();
  }
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
  static show(target: Element, isIntersecting: boolean): void {
    for (const observer of FakeIntersectionObserver.instances) {
      if (!observer.targets.has(target)) continue;
      observer.callback(
        [{ target, isIntersecting } as IntersectionObserverEntry],
        observer as unknown as IntersectionObserver
      );
    }
  }
}

describe('TopicValueComponent', () => {
  const topic = 'BMS/Pack/Voltage';
  const original = globalThis.IntersectionObserver;
  let fixture: ComponentFixture<TopicValueComponent>;
  let storage: Storage;

  const host = (): HTMLElement => fixture.nativeElement;
  const show = async (onScreen: boolean) => {
    FakeIntersectionObserver.show(host(), onScreen);
    await fixture.whenStable();
  };
  const send = async (value: string) => {
    storage.addValue(topic, { values: [value], time: '0', unit: 'V' });
    await fixture.whenStable();
  };

  beforeEach(async () => {
    globalThis.IntersectionObserver = FakeIntersectionObserver as unknown as typeof IntersectionObserver;
    storage = TestBed.inject(Storage);
    fixture = TestBed.createComponent(TopicValueComponent);
    fixture.componentRef.setInput('topic', topic);
    fixture.autoDetectChanges();
    await fixture.whenStable();
  });

  afterEach(() => {
    fixture.destroy();
    globalThis.IntersectionObserver = original;
    FakeIntersectionObserver.instances = [];
  });

  it('reads nothing until the row is on screen', async () => {
    expect(storage.get(topic).observed).toBe(false);
    await send('1');
    expect(host().textContent?.trim()).toBe('N/A');
  });

  it('reads the topic while on screen and lets go when it leaves', async () => {
    await show(true);
    expect(storage.get(topic).observed).toBe(true);
    await send('3.5');
    expect(host().textContent?.trim()).toBe('3.500V');
    await show(false);
    expect(storage.get(topic).observed).toBe(false);
  });

  it('shows the latest value at once when it comes back on screen', async () => {
    await show(true);
    await show(false);
    await send('7');
    await show(true);
    expect(host().textContent?.trim()).toBe('7.000V');
  });

  it('starts from the latest value the first time it is on screen, too', async () => {
    await send('2');
    await show(true);
    expect(host().textContent?.trim()).toBe('2.000V');
  });

  it('lets go of the topic and the observer when destroyed', async () => {
    await show(true);
    fixture.destroy();
    expect(storage.get(topic).observed).toBe(false);
    expect(FakeIntersectionObserver.instances[0].targets.size).toBe(0);
  });

  it('shares one observer between rows', () => {
    const second = TestBed.createComponent(TopicValueComponent);
    second.componentRef.setInput('topic', 'BMS/Pack/SoC');
    second.detectChanges();
    TestBed.tick();
    expect(FakeIntersectionObserver.instances.length).toBe(1);
    expect(FakeIntersectionObserver.instances[0].targets.size).toBe(2);
    second.destroy();
  });
});
