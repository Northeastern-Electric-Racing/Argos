import { TestBed } from '@angular/core/testing';
import Storage from 'src/services/storage.service';
import { SHUTDOWN_LOOP } from './shutdown-loop.model';
import { ShutdownLoopService } from './shutdown-loop.service';
import { SHUTDOWN_TOPICS, VCU_CRITICAL_FAULT_TOPICS } from './shutdown-page.topics';

const MEASURED_TOPICS = SHUTDOWN_LOOP.filter((n) => n.topic && n.topic !== SHUTDOWN_TOPICS.VCU.CAN_LATCH).map(
  (n) => n.topic!
);

describe('ShutdownLoopService', () => {
  let service: ShutdownLoopService;
  let storage: Storage;

  const push = (topic: string, values: string[]) => storage.addValue(topic, { values, time: '', unit: '' });
  /** Every sense topic = `value`; critical faults all clear when `value` is '1', all tripped otherwise. */
  const pushAll = (value: string) => {
    MEASURED_TOPICS.forEach((t) => push(t, [value]));
    VCU_CRITICAL_FAULT_TOPICS.forEach((t) => push(t, [value === '1' ? '0' : '1']));
  };
  const canLatch = () => service.status().nodes.find((n) => n.node.id === 'can-latch')!;

  beforeEach(() => {
    jasmine.clock().install();
    jasmine.clock().mockDate(new Date(1_000_000));
    TestBed.configureTestingModule({ providers: [ShutdownLoopService] });
    service = TestBed.inject(ShutdownLoopService);
    storage = TestBed.inject(Storage);
  });

  afterEach(() => {
    service.ngOnDestroy();
    jasmine.clock().uninstall();
  });

  it('starts unknown', () => {
    expect(service.status().verdict).toBe('unknown');
    expect(service.tsOn()).toBeUndefined();
  });

  it('closes when all topics report 1', () => {
    pushAll('1');
    expect(service.status().verdict).toBe('closed');
  });

  it('goes stale after 60s', () => {
    pushAll('1');
    jasmine.clock().tick(61_000);
    expect(service.status().verdict).toBe('unknown');
  });

  it('ignores non-numeric values', () => {
    pushAll('1');
    expect(() => {
      push(SHUTDOWN_TOPICS.VCU.TSMS, ['abc']);
      push(SHUTDOWN_TOPICS.VCU.TSMS, []);
    }).not.toThrow();
    expect(service.status().verdict).toBe('closed');
  });

  it('tracks when a value changed, not when it was re-sent', () => {
    pushAll('1');
    push(SHUTDOWN_TOPICS.VCU.BOTS, ['0']);
    jasmine.clock().tick(400);
    pushAll('1');
    push(SHUTDOWN_TOPICS.VCU.BOTS, ['0']);
    // BOTS has been 0 for 400 ms (< 500 ms grace), TSMS closed the whole time: no mismatch yet.
    expect(service.status().mismatch).toBeFalse();
    // No new messages; the 1 s clock tick alone must let the grace window expire.
    jasmine.clock().tick(700);
    expect(service.status().mismatch).toBeTrue();
  });

  it('ignores blank values', () => {
    pushAll('1');
    push(SHUTDOWN_TOPICS.VCU.TSMS, ['']);
    push(SHUTDOWN_TOPICS.VCU.TSMS, [' ']);
    expect(service.status().verdict).toBe('closed');
  });

  it('tsOn goes stale with the BMS', () => {
    push(SHUTDOWN_TOPICS.BMS.State, ['1']);
    expect(service.tsOn()).toBeFalse();
    jasmine.clock().tick(61_000);
    expect(service.tsOn()).toBeUndefined();
  });

  it('tsOn maps inverted state', () => {
    push(SHUTDOWN_TOPICS.BMS.State, ['0']);
    expect(service.tsOn()).toBeTrue();
    push(SHUTDOWN_TOPICS.BMS.State, ['1']);
    expect(service.tsOn()).toBeFalse();
  });

  it('CAN latch closed only while every critical fault is 0', () => {
    pushAll('1');
    expect(canLatch().state).toBe('closed');
    push(VCU_CRITICAL_FAULT_TOPICS[2], ['1']);
    expect(canLatch().value).toBe(0);
    expect(service.status().suspects.map((n) => n.id)).toEqual(['can-latch']);
    push(VCU_CRITICAL_FAULT_TOPICS[2], ['0']);
    expect(canLatch().value).toBe(1);
    expect(service.status().verdict).toBe('closed');
  });

  it('CAN latch has no data until a critical fault arrives', () => {
    MEASURED_TOPICS.forEach((t) => push(t, ['1']));
    expect(canLatch().state).toBe('no-data');
  });

  it('unsubscribes on destroy', () => {
    service.ngOnDestroy();
    expect(storage.get(SHUTDOWN_TOPICS.VCU.TSMS).observed).toBeFalse();
    expect(storage.get(SHUTDOWN_TOPICS.BMS.State).observed).toBeFalse();
  });
});
