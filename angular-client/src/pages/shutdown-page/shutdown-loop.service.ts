import { computed, inject, Injectable, OnDestroy, signal } from '@angular/core';
import { Subscription } from 'rxjs';
import Storage from 'src/services/storage.service';
import { Board, SHUTDOWN_LOOP } from './shutdown-loop.model';
import { BoardLastSeen, computeLoopStatus, Reading } from './shutdown-loop.utils';
import { SHUTDOWN_TOPICS } from './shutdown-page.topics';

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
  private timer = setInterval(() => this.now.set(Date.now()), CLOCK_TICK_MS);

  readonly status = computed(() => computeLoopStatus(SHUTDOWN_LOOP, this.readings(), this.lastSeen(), this.now()));
  /** From BMS/Shutdown/State, which is inverted: 0 = TS ON, 1 = TS OFF. */
  readonly tsOn = computed(() => {
    const state = this.tsState();
    return state === undefined ? undefined : state === 0;
  });

  constructor() {
    for (const node of SHUTDOWN_LOOP) {
      const { topic, board } = node;
      if (topic && board) this.subscribe(topic, (value) => this.record(topic, board, value));
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
        const value = Number(data.values[0]);
        if (data.values.length === 0 || Number.isNaN(value)) return;
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
