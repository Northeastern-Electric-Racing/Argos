import { computed, inject, Injectable, OnDestroy, signal, WritableSignal } from '@angular/core';
import { Subscription } from 'rxjs';
import Storage from 'src/services/storage.service';
import { DataValue } from 'src/utils/socket.utils';
import { SHUTDOWN_LOOP } from './shutdown-loop.model';
import { parseServerNodeStates, resolveLoopStatus, ServerNodeStates } from './shutdown-loop.scylla';
import { computeLoopStatus, isLive, nextReading, Reading, withDerivedReadings } from './shutdown-loop.utils';
import { SHUTDOWN_SERVER_TOPICS, SHUTDOWN_TOPICS, VCU_CRITICAL_FAULT_TOPICS } from './shutdown-page.topics';

/** Re-evaluates staleness, grace windows and ages while no messages arrive. */
const CLOCK_TICK_MS = 1000;

/**
 * Milliseconds on a monotonic clock, for receive times, staleness and grace windows: a wall-clock
 * step (NTP correcting a base station's clock) must not make readings live or stale.
 */
const monotonicNow = (): number => performance.now();

/**
 * Live shutdown-loop state for the Shutdown page. Provided by the page (not root) so its
 * subscriptions and clock stop when the page is left.
 *
 * Messages only update a mutable map and bump a version signal, so each costs O(1); `status` is a
 * lazy `computed`, so it runs at most once per change detection pass (which zoneless Angular
 * coalesces to one per frame) however many messages arrived, plus once per clock tick.
 */
@Injectable()
export class ShutdownLoopService implements OnDestroy {
  private storage = inject(Storage);
  private subscriptions: Subscription[] = [];

  /** Latest reading per topic. Mutated in place; `version` signals each change. */
  private readings = new Map<string, Reading>();
  private serverStates: ServerNodeStates | undefined;
  private version = signal(0);
  private clock = signal(0);
  private timer = setInterval(() => this.clock.update((n) => n + 1), CLOCK_TICK_MS);

  /**
   * Whether to show scylla-server's node states while they are fresh. The dev mock panel turns it
   * off while it publishes, since its readings only exist in this client and scylla would otherwise
   * override them with its status of the real (or simulated) car.
   */
  readonly preferServer: WritableSignal<boolean> = signal(true);

  readonly status = computed(() => {
    this.version();
    this.clock();
    const preferServer = this.preferServer();
    // Read the time here rather than from the clock signal, so a reading never looks newer than now.
    const now = monotonicNow();
    const local = computeLoopStatus(SHUTDOWN_LOOP, withDerivedReadings(this.readings, now), now);
    return preferServer ? resolveLoopStatus(local, this.serverStates, now) : { ...local, source: 'local' as const };
  });

  /** From BMS/Shutdown/State, which is inverted: 0 = TS ON, 1 = TS OFF. Undefined while it is stale. */
  readonly tsOn = computed(() => {
    this.version();
    this.clock();
    const state = this.readings.get(SHUTDOWN_TOPICS.BMS.State);
    return isLive(state, monotonicNow()) ? state.value === 0 : undefined;
  });

  constructor() {
    const topics = new Set<string>([...VCU_CRITICAL_FAULT_TOPICS, SHUTDOWN_TOPICS.BMS.State]);
    for (const { topic } of SHUTDOWN_LOOP) {
      // The CAN latch is derived from the critical faults, not published.
      if (topic && topic !== SHUTDOWN_TOPICS.VCU.CAN_LATCH) topics.add(topic);
    }
    for (const topic of topics) this.subscribe(topic, (data) => this.record(topic, data));
    this.subscribe(SHUTDOWN_SERVER_TOPICS.NodeStates, (data) => {
      const states = parseServerNodeStates(data.values, monotonicNow());
      if (!states) return;
      this.serverStates = states;
      this.version.update((n) => n + 1);
    });
  }

  ngOnDestroy(): void {
    clearInterval(this.timer);
    this.subscriptions.forEach((sub) => sub.unsubscribe());
    this.subscriptions = [];
  }

  private subscribe(topic: string, onData: (data: DataValue) => void): void {
    this.subscriptions.push(this.storage.get(topic).subscribe(onData));
  }

  private record(topic: string, data: DataValue): void {
    const [raw] = data.values;
    // Number('') and Number(' ') are 0, which would read as an open loop: reject blanks outright.
    if (raw === undefined || raw === null || String(raw).trim() === '') return;
    const value = Number(raw);
    if (!Number.isFinite(value)) return;
    this.readings.set(topic, nextReading(this.readings.get(topic), value, monotonicNow()));
    this.version.update((n) => n + 1);
  }
}
