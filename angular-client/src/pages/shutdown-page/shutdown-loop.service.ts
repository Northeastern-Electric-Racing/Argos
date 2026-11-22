import { computed, inject, Injectable, OnDestroy, signal } from '@angular/core';
import { Subscription } from 'rxjs';
import Storage from 'src/services/storage.service';
import { Board, SHUTDOWN_LOOP } from './shutdown-loop.model';
import { BoardLastSeen, computeLoopStatus, Reading, STALE_AFTER_MS } from './shutdown-loop.utils';
import { SHUTDOWN_TOPICS, VCU_CRITICAL_FAULT_TOPICS } from './shutdown-page.topics';

const CLOCK_TICK_MS = 1000;

/**
 * Live shutdown-loop state for the Shutdown page. Provided by the page (not root) so its
 * subscriptions and clock stop when the page is left.
 */
@Injectable()
export class ShutdownLoopService implements OnDestroy {
  private storage = inject(Storage);
  private subscriptions: Subscription[] = [];

  private readings = signal<ReadonlyMap<string, Reading>>(new Map());
  private lastSeen = signal<BoardLastSeen>({});
  private now = signal(Date.now());
  private tsState = signal<number | undefined>(undefined);
  /** Latest value of each critical VCU fault received so far. */
  private criticalFaults = new Map<string, number>();
  private timer = setInterval(() => this.now.set(Date.now()), CLOCK_TICK_MS);

  readonly status = computed(() => computeLoopStatus(SHUTDOWN_LOOP, this.readings(), this.lastSeen(), this.now()));
  /** From BMS/Shutdown/State, which is inverted: 0 = TS ON, 1 = TS OFF. Undefined while BMS is silent. */
  readonly tsOn = computed(() => {
    const state = this.tsState();
    const seen = this.lastSeen().BMS;
    if (state === undefined || seen === undefined || this.now() - seen > STALE_AFTER_MS) return undefined;
    return state === 0;
  });

  constructor() {
    for (const node of SHUTDOWN_LOOP) {
      const { topic, board } = node;
      if (topic && board && topic !== SHUTDOWN_TOPICS.VCU.CAN_LATCH) {
        this.subscribe(topic, (value) => this.record(topic, board, value));
      }
    }
    for (const fault of VCU_CRITICAL_FAULT_TOPICS) {
      this.subscribe(fault, (value) => {
        this.criticalFaults.set(fault, value);
        const anyTripped = [...this.criticalFaults.values()].some((v) => v !== 0);
        this.record(SHUTDOWN_TOPICS.VCU.CAN_LATCH, 'VCU', anyTripped ? 0 : 1);
      });
    }
    this.subscribe(SHUTDOWN_TOPICS.BMS.State, (value) => {
      this.tsState.set(value);
      this.markSeen('BMS', Date.now());
    });
  }

  ngOnDestroy(): void {
    clearInterval(this.timer);
    this.subscriptions.forEach((sub) => sub.unsubscribe());
    this.subscriptions = [];
  }

  private subscribe(topic: string, onValue: (value: number) => void): void {
    this.subscriptions.push(
      this.storage.get(topic).subscribe((data) => {
        const [raw] = data.values;
        // Number('') and Number(' ') are 0, which would read as an open loop: reject blanks outright.
        if (raw === undefined || raw === null || String(raw).trim() === '') return;
        const value = Number(raw);
        if (!Number.isFinite(value)) return;
        onValue(value);
      })
    );
  }

  private record(topic: string, board: Board, value: number): void {
    const now = Date.now();
    const prev = this.readings().get(topic);
    const changedAt = prev && prev.value === value ? prev.changedAt : now;
    const next = new Map(this.readings());
    next.set(topic, { value, receivedAt: now, changedAt });
    this.readings.set(next);
    this.markSeen(board, now);
  }

  private markSeen(board: Board, now: number): void {
    this.lastSeen.update((seen) => ({ ...seen, [board]: now }));
    this.now.set(now);
  }
}
