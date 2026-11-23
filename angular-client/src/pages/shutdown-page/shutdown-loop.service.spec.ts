import { TestBed } from '@angular/core/testing';
import Storage from 'src/services/storage.service';
import { SHUTDOWN_LOOP } from './shutdown-loop.model';
import { NODE_STATE_CODE } from './shutdown-loop.server';
import { ShutdownLoopService } from './shutdown-loop.service';
import { SHUTDOWN_SERVER_TOPICS, SHUTDOWN_TOPICS, VCU_CRITICAL_FAULT_TOPICS } from './shutdown-page.topics';

const MEASURED_TOPICS = SHUTDOWN_LOOP.filter((n) => n.topic && n.topic !== SHUTDOWN_TOPICS.VCU.CAN_LATCH).map(
  (n) => n.topic!
);
const VCU_PIN_TOPICS = Object.values(SHUTDOWN_TOPICS.VCU).filter((t) => t !== SHUTDOWN_TOPICS.VCU.CAN_LATCH);

describe('ShutdownLoopService', () => {
  let service: ShutdownLoopService;
  let storage: Storage;

  const push = (topic: string, values: string[]) => storage.addValue(topic, { values, time: '', unit: '' });
  /** Every sense topic = `value`; critical faults all clear when `value` is '1', all tripped otherwise. */
  const pushAll = (value: string) => {
    MEASURED_TOPICS.forEach((t) => push(t, [value]));
    VCU_CRITICAL_FAULT_TOPICS.forEach((t) => push(t, [value === '1' ? '0' : '1']));
  };
  const faultsClear = () => VCU_CRITICAL_FAULT_TOPICS.forEach((t) => push(t, ['0']));
  const node = (id: string) => service.status().nodes.find((n) => n.node.id === id)!;
  const canLatch = () => node('can-latch');
  /** Pushes `send` every 250 ms for `ms`. */
  const keepSending = (ms: number, send: () => void) => {
    for (let t = 0; t < ms; t += 250) {
      vi.advanceTimersByTime(250);
      send();
    }
  };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(1_000_000));
    TestBed.configureTestingModule({ providers: [ShutdownLoopService] });
    service = TestBed.inject(ShutdownLoopService);
    storage = TestBed.inject(Storage);
  });

  afterEach(() => {
    service.ngOnDestroy();
    vi.useRealTimers();
  });

  it('starts unknown', () => {
    expect(service.status().verdict).toBe('unknown');
    expect(service.tsOn()).toBeUndefined();
  });

  it('closes when all topics report 1', () => {
    pushAll('1');
    expect(service.status().verdict).toBe('closed');
  });

  it('goes stale after 60s before the message rate is known', () => {
    pushAll('1');
    vi.advanceTimersByTime(61_000);
    expect(service.status().verdict).toBe('unknown');
  });

  it('goes stale within seconds at trackside message rates', () => {
    pushAll('1');
    keepSending(500, () => pushAll('1'));
    expect(service.status().verdict).toBe('closed');
    vi.advanceTimersByTime(3_100);
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
    vi.advanceTimersByTime(400);
    pushAll('1');
    push(SHUTDOWN_TOPICS.VCU.BOTS, ['0']);
    // BOTS has been 0 for 400 ms (< 500 ms grace), TSMS closed the whole time: no mismatch yet.
    expect(service.status().mismatch).toBe(false);
    // No new messages; the 1 s clock tick alone must let the grace window expire.
    vi.advanceTimersByTime(700);
    expect(service.status().mismatch).toBe(true);
  });

  it('ignores blank values', () => {
    pushAll('1');
    push(SHUTDOWN_TOPICS.VCU.TSMS, ['']);
    push(SHUTDOWN_TOPICS.VCU.TSMS, [' ']);
    expect(service.status().verdict).toBe('closed');
  });

  it('tsOn goes stale with BMS/Shutdown/State', () => {
    push(SHUTDOWN_TOPICS.BMS.State, ['1']);
    expect(service.tsOn()).toBe(false);
    vi.advanceTimersByTime(61_000);
    expect(service.tsOn()).toBeUndefined();
  });

  it('tsOn maps inverted state', () => {
    push(SHUTDOWN_TOPICS.BMS.State, ['0']);
    expect(service.tsOn()).toBe(true);
    push(SHUTDOWN_TOPICS.BMS.State, ['1']);
    expect(service.tsOn()).toBe(false);
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

  it('CAN latch does not stay tripped once its faults go stale', () => {
    pushAll('1');
    push(VCU_CRITICAL_FAULT_TOPICS[0], ['1']);
    // 0x123 keeps arriving, 0x502 (the faults) stops.
    keepSending(61_000, () => MEASURED_TOPICS.forEach((t) => push(t, ['1'])));
    expect(canLatch().state).toBe('no-data');
    expect(service.status().verdict).toBe('unknown');
  });

  it('messages on one VCU frame do not keep the other frame live', () => {
    pushAll('1');
    keepSending(61_000, faultsClear);
    expect(node('tsms').state).toBe('no-data');
    expect(canLatch().state).toBe('closed');
  });

  it('BMS/Shutdown/State does not keep the BMS sense readings live', () => {
    pushAll('1');
    keepSending(61_000, () => {
      VCU_PIN_TOPICS.forEach((t) => push(t, ['1']));
      faultsClear();
      push(SHUTDOWN_TOPICS.BMS.State, ['1']);
    });
    expect(node('acc-sense').state).toBe('no-data');
    expect(service.tsOn()).toBe(false);
  });

  it('keeps the same status object until something changes', () => {
    pushAll('1');
    const first = service.status();
    expect(service.status()).toBe(first);
    push(SHUTDOWN_TOPICS.VCU.TSMS, ['0']);
    expect(service.status()).not.toBe(first);
    expect(service.status().suspects.map((n) => n.id)).toEqual(['tsms']);
  });

  it('prefers fresh scylla-server node states, then falls back to its own', () => {
    pushAll('1');
    const codes = SHUTDOWN_LOOP.map((n) => (n.id === 'tsms' ? NODE_STATE_CODE.suspect : NODE_STATE_CODE.closed));
    push(SHUTDOWN_SERVER_TOPICS.NodeStates, codes.map(String));
    expect(service.status().source).toBe('server');
    expect(service.status().suspects.map((n) => n.id)).toEqual(['tsms']);
    keepSending(3_500, () => pushAll('1'));
    expect(service.status().source).toBe('local');
    expect(service.status().verdict).toBe('closed');
  });

  it('unsubscribes on destroy', () => {
    service.ngOnDestroy();
    expect(storage.get(SHUTDOWN_TOPICS.VCU.TSMS).observed).toBe(false);
    expect(storage.get(SHUTDOWN_TOPICS.BMS.State).observed).toBe(false);
    expect(storage.get(SHUTDOWN_SERVER_TOPICS.NodeStates).observed).toBe(false);
  });
});
