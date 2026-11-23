import { ChangeDetectionStrategy, Component, inject, OnDestroy, signal } from '@angular/core';
import Storage from 'src/services/storage.service';
import { UiButtonDirective } from 'src/ui/button/button.directive';
import { Board, SHUTDOWN_LOOP } from '../../shutdown-loop.model';
import { SHUTDOWN_TOPICS, VCU_CRITICAL_FAULT_TOPICS } from '../../shutdown-page.topics';

const PUBLISH_EVERY_MS = 1000;
const MEASURED = SHUTDOWN_LOOP.filter((n) => n.topic && n.board) as {
  id: string;
  label: string;
  topic: string;
  board: Board;
}[];

/**
 * Dev-mode only: publishes fake shutdown readings into Storage so the page can be checked without
 * the car (the Calypso simulator randomizes each bit independently and can't show a healthy loop).
 */
@Component({
  selector: 'shutdown-mock-panel',
  templateUrl: './mock-panel.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [UiButtonDirective]
})
export class MockPanelComponent implements OnDestroy {
  private storage = inject(Storage);
  private timer?: ReturnType<typeof setInterval>;

  readonly nodes = MEASURED;
  readonly values = signal<Record<string, number>>(Object.fromEntries(MEASURED.map((n) => [n.topic, 1])));
  readonly publishing = signal(false);
  /** Published as BMS/Shutdown/State, which is inverted: 0 = TS ON. */
  readonly tsOn = signal(false);

  ngOnDestroy(): void {
    clearInterval(this.timer);
  }

  togglePublishing(): void {
    if (this.publishing()) {
      clearInterval(this.timer);
      this.publishing.set(false);
      return;
    }
    this.publishing.set(true);
    this.publish();
    this.timer = setInterval(() => this.publish(), PUBLISH_EVERY_MS);
  }

  toggle(topic: string): void {
    this.values.update((v) => ({ ...v, [topic]: v[topic] ? 0 : 1 }));
  }

  allClosed(): void {
    this.setOpenFrom(undefined);
  }

  /** A single culprit: TSMS reads 0 right after the cockpit BRB reads 1. */
  breakAtTsms(): void {
    this.setOpenFrom(SHUTDOWN_TOPICS.VCU.TSMS);
  }

  /** A suspect stretch: the side BRBs have no reading, so they share the blame with the BMS latch. */
  breakAtBmsLatch(): void {
    this.setOpenFrom(SHUTDOWN_TOPICS.VCU.BMS);
  }

  /** A suspect stretch with the energy-meter placeholder in it. */
  breakAtAccSense(): void {
    this.setOpenFrom(SHUTDOWN_TOPICS.BMS.Acc);
  }

  /** Break at TSMS, but HVD downstream still reads closed: flagged once it persists past the grace window. */
  mismatchAtHvd(): void {
    this.setOpenFrom(SHUTDOWN_TOPICS.VCU.TSMS);
    this.values.update((v) => ({ ...v, [SHUTDOWN_TOPICS.VCU.HVD]: 1 }));
  }

  /** Opens `topic` and everything after it in loop order; undefined closes all. */
  private setOpenFrom(topic: string | undefined): void {
    const start = topic ? MEASURED.findIndex((n) => n.topic === topic) : MEASURED.length;
    this.values.set(Object.fromEntries(MEASURED.map((n, i) => [n.topic, i >= start ? 0 : 1])));
  }

  private publish(): void {
    const values = this.values();
    const time = String(Date.now());
    this.storage.addValue(SHUTDOWN_TOPICS.BMS.State, { values: [this.tsOn() ? '0' : '1'], time, unit: '' });
    for (const n of MEASURED) {
      if (n.topic === SHUTDOWN_TOPICS.VCU.CAN_LATCH) {
        // The CAN latch is derived from the critical faults: open = every fault tripped.
        const fault = values[n.topic] ? '0' : '1';
        for (const t of VCU_CRITICAL_FAULT_TOPICS) this.storage.addValue(t, { values: [fault], time, unit: '' });
      } else {
        this.storage.addValue(n.topic, { values: [String(values[n.topic])], time, unit: '' });
      }
    }
  }
}
