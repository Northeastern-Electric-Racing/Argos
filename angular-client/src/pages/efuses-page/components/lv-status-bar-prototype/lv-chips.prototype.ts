import { Component, input } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { StatusBarItemComponent } from './status-bar.prototype';

/**
 * PROTOTYPE — throwaway. Three structurally different LV-battery chips, all pure
 * presentational (voltage + firmware LV-fault flag come in as inputs from the host).
 * Flip between them with ?variant= to settle the chip anatomy, then keep one.
 */

const RED = 'var(--color-battery-low)';
const GREEN = 'var(--color-battery-high)';
const fmt = (v?: number): string => (v != null && isFinite(v) ? v.toFixed(2) : '–');

/** Variant A — reuses the status-bar-item shell: icon + "LV Battery" label + value + unit + status dot. */
@Component({
  selector: 'proto-lv-chip-a',
  standalone: true,
  imports: [StatusBarItemComponent],
  template: `
    <proto-status-bar-item
      icon="battery_charging_2"
      label="LV Battery"
      [value]="value()"
      unit="V"
      [dotColor]="faulted() ? red : green"
    />
  `
})
export class LvChipAComponent {
  voltage = input<number>();
  faulted = input<boolean>(false);
  red = RED;
  green = GREEN;
  value = (): string => fmt(this.voltage());
}

/** Variant B — compact rounded pill, value-first, no label, no dot: the whole pill turns red on fault. */
@Component({
  selector: 'proto-lv-chip-b',
  standalone: true,
  imports: [MatIcon],
  template: `
    <div class="pill" [class.fault]="faulted()">
      <mat-icon class="i" svgIcon="battery_charging_2" aria-hidden="true" />
      <span class="v">{{ value() }}</span
      ><span class="u">V</span>
    </div>
  `,
  styles: [
    `
      .pill {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        max-width: 25vw;
        padding: 6px 12px;
        border-radius: 999px;
        background: var(--color-background-page);
        border: 1px solid var(--color-divider);
        white-space: nowrap;
      }
      .pill.fault {
        border-color: var(--color-battery-low);
      }
      .pill.fault .v,
      .pill.fault .u,
      .pill.fault .i {
        color: var(--color-battery-low);
      }
      .i {
        width: 18px;
        height: 18px;
        color: #cfcfcf;
      }
      .v {
        font-size: var(--font-size-md, 15px);
        font-weight: 700;
        color: #ffffff;
      }
      .u {
        font-size: var(--font-size-sm, 12px);
        color: #9a9a9a;
      }
    `
  ]
})
export class LvChipBComponent {
  voltage = input<number>();
  faulted = input<boolean>(false);
  value = (): string => fmt(this.voltage());
}

/** Variant C — richer card: big value over a "LV Battery" subtitle, icon left, status dot right. */
@Component({
  selector: 'proto-lv-chip-c',
  standalone: true,
  imports: [MatIcon],
  template: `
    <div class="card">
      <mat-icon class="ic" svgIcon="battery_charging_2" aria-hidden="true" />
      <div class="col">
        <div class="top">
          <span class="val">{{ value() }}</span
          ><span class="un">V</span>
        </div>
        <div class="sub">LV Battery</div>
      </div>
      <span class="dot" [style.background]="faulted() ? red : green"></span>
    </div>
  `,
  styles: [
    `
      .card {
        display: inline-flex;
        align-items: center;
        gap: 10px;
        max-width: 25vw;
        padding: 6px 14px;
        border-radius: 8px;
        background: var(--color-background-page);
        border: 1px solid var(--color-divider);
      }
      .ic {
        width: 26px;
        height: 26px;
        flex: 0 0 auto;
        color: #cfcfcf;
      }
      .col {
        display: flex;
        flex-direction: column;
        line-height: 1.1;
      }
      .top {
        display: flex;
        align-items: baseline;
        gap: 3px;
      }
      .val {
        font-size: var(--font-size-lg, 20px);
        font-weight: 700;
        color: #ffffff;
      }
      .un {
        font-size: var(--font-size-sm, 12px);
        color: #9a9a9a;
      }
      .sub {
        font-size: var(--font-size-sm, 11px);
        color: #8f8f8f;
        text-transform: uppercase;
        letter-spacing: 0.04em;
      }
      .dot {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        flex: 0 0 auto;
        margin-left: 4px;
      }
    `
  ]
})
export class LvChipCComponent {
  voltage = input<number>();
  faulted = input<boolean>(false);
  red = RED;
  green = GREEN;
  value = (): string => fmt(this.voltage());
}
