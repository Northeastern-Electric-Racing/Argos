import { inject, Injectable, OnDestroy } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter, Subscription } from 'rxjs';
import { ClientRule, RulesResponse } from 'src/api/rules.api';
import { EFUSE_TOPICS } from 'src/pages/efuses-page/efuses-page.topics';
import { BMS_CONFIG } from 'src/utils/bms.config';
import { Chip } from 'src/utils/bms.utils';
import { DataValue, TimerData } from 'src/utils/socket.utils';
import { DataType } from 'src/utils/types.utils';
import { topics } from 'src/utils/topic.utils';
import { NotificationLogService } from './notification-log.service';
import Storage from './storage.service';

// ── "Good data" design notes ───────────────────────────────────────────────
// Values are tuned so every screen renders in its HEALTHY/green state for a
// judge demo, and are self-consistent (aggregates derive from per-cell values).
// UI thresholds that drive the choices (see bms.utils.ts / segment-heatmap):
//   • Cell voltage: > 3.5 V renders green; heatmap is full green at ≥ 3.6 V.
//   • Cell temp: ≤ 35 °C renders green.
// We model a healthy, well-balanced pack at ~82% SOC, actively charging.

// Cell voltage band — tight spread around 3.95 V = excellent balance, all green.
const CELL_VOLT_MIN = 3.93;
const CELL_VOLT_MAX = 3.97;
// Cell temperature band (°C). Kept low so the pack-temp gauge on the charging
// page (hard-coded -15..30°C range) reads mid-scale instead of pegged at max,
// while staying well under the heatmap's 35°C green threshold.
const CELL_TEMP_MIN = 22;
const CELL_TEMP_MAX = 27;
// Pack state of charge (%) — mid-high, consistent with ~3.95 V/cell.
const SEED_SOC = 82;
// Run number shown in the top nav bar.
const SEED_RUN_ID = 7;
// Location shown on the charging page header.
const SEED_LOCATION = 'NER Garage';

// Low-voltage (GLV) bus voltage the eFuses sit on. NOTE: confirm against CAN
// defs / Calypso sim — set to a typical FSAE GLV bus value.
const GLV_VOLTAGE = 24.0;

/** Per-eFuse seed: state is 0=ON, 1=AUTO, 2=OFF. current must stay < maxCurrent. */
interface EfuseSeed {
  current: number;
  adc: number;
  state: number;
}
// Critical rails ON, thermal management (fans/pumps/brake) in AUTO, spare OFF.
const EFUSE_SEED: Record<keyof typeof EFUSE_TOPICS.VCU.eFuses, EfuseSeed> = {
  Dashboard: { current: 1.2, adc: 1490, state: 0 },
  Brake: { current: 0.32, adc: 400, state: 1 },
  Shutdown: { current: 0.45, adc: 560, state: 0 },
  LV: { current: 1.85, adc: 2300, state: 0 },
  Radfan: { current: 1.1, adc: 1370, state: 1 },
  Fanbatt: { current: 2.3, adc: 2860, state: 1 },
  PumpOne: { current: 1.4, adc: 1740, state: 1 },
  PumpTwo: { current: 1.55, adc: 1930, state: 1 },
  Spare: { current: 0.0, adc: 0, state: 2 },
  Battbox: { current: 0.9, adc: 1120, state: 0 },
  MC: { current: 1.6, adc: 1990, state: 0 }
};

// VCU Echo telemetry that drives the AUTO-mode value displays on eFuse cards.
const ECHO_MOTOR_TEMP = 52.0; // °C — Radfan / Pump One auto value
const ECHO_CONTROLLER_TEMP = 44.0; // °C — Pump Two / Spare auto value
const ECHO_BATTBOX_TEMP = 31.0; // °C — Fanbatt auto value
const ECHO_BRAKE_STATE = 0; // not braking

// localStorage key AppContextComponent uses for the notification-rules client id.
const RULES_CLIENT_ID_KEY = 'notification_rules_client_id';

/**
 * Publishes deterministic mock telemetry so the UI renders without a live feed.
 *
 * Most screens read from Storage on real MQTT topic names (topic.utils.ts), so
 * publishing there makes every downstream component work unchanged. Two screens
 * need extra plumbing, handled here too:
 *   • Charging status cards read the TimerData channel (storage.addTimerValue),
 *     not plain values — we publish synthetic timer sessions for those.
 *   • The Rules page is REST-backed (fetch), so we install a fetch interceptor
 *     that returns a realistic rule set for GET /rules/{clientId}.
 *
 * Storage uses plain Subjects (not BehaviorSubjects), so late subscribers miss
 * one-shot emissions. We publish on an interval to cover late-mounting views.
 */
@Injectable({ providedIn: 'root' })
export class SeedDataService implements OnDestroy {
  // This is a local-only branch for seed data; default on. Disable via
  // localStorage.setItem('USE_SEED_DATA', 'false') + reload.
  private static readonly ENABLED_BY_DEFAULT = true;
  private static readonly INTERVAL_MS = 1000;

  private readonly storage = inject(Storage);
  private readonly router = inject(Router);
  private readonly notificationLog = inject(NotificationLogService);
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private routerSub: Subscription | null = null;
  /** True once the charging graphs' history has been backfilled for the current
   * visit; reset on navigating away so each arrival re-seeds exactly once. */
  private chargingGraphSeeded = false;

  /** Fixed wall-clock origin so the status timers tick up live over the demo. */
  private readonly seedStartMs = Date.now();
  /** Original window.fetch, restored on stop(). */
  private originalFetch: typeof window.fetch | null = null;

  // [segment][chip: 0=Alpha, 1=Beta][cell] → voltage
  private readonly cellVoltages: number[][][] = this.generateCellVoltages();
  // [segment][chip][therm] → °C
  private readonly cellTemps: number[][][] = this.generateCellTemps();

  /** @returns true when seeding started (so callers can skip live MQTT wiring). */
  start(): boolean {
    if (!this.isEnabled()) return false;
    if (this.intervalId !== null) return true;
    this.installRulesFetchInterceptor();
    this.storage.setCurrentRunId(SEED_RUN_ID);
    // One-shot: populate the notification log (rules stream rail + nav bell).
    // Deferred so the signal write lands after the initial CD pass (the nav bar
    // already reads unreadCount() — avoids ExpressionChangedAfterItHasBeenChecked).
    setTimeout(() => this.seedNotifications(), 0);
    // Publish after the current change-detection pass, never during it. start()
    // runs inside AppContext's ngOnInit (mid-CD); mutating Storage values that
    // child components read in the same pass throws NG0100 in dev mode. The
    // delayed schedule (first tick at 0ms) also covers late-mounting children.
    this.scheduleDelayedPublishes();
    // Republish after each subsequent navigation for the same reason.
    this.routerSub = this.router.events
      .pipe(filter((e) => e instanceof NavigationEnd))
      .subscribe(() => this.scheduleDelayedPublishes());
    // Safety net for anything that mounts outside of a router transition.
    this.intervalId = setInterval(() => this.publishAll(), SeedDataService.INTERVAL_MS);
    return true;
  }

  /** Spaced publishes that cover the asynchronous mount window after a route
   * transition. Storage uses plain Subjects (no replay), so a component that
   * mounts after a publish stays empty until the next emission. Heavy pages
   * (e.g. the BMS at-a-glance bar and segment overview) mount their summary
   * widgets well after NavigationEnd, so the window stretches to ~2.6s; the 1s
   * interval then keeps everything fresh. Starting at 0ms (a macrotask, not
   * synchronous) lets the initial CD pass finish first, avoiding NG0100. */
  private scheduleDelayedPublishes(): void {
    // Reset the charging-graph backfill flag whenever we're away from that page
    // so the next arrival re-seeds its history exactly once. The seeding itself
    // happens at the top of publishAll (see there), not here, so it runs in the
    // same synchronous pass as — and immediately before — that tick's live
    // points and the time series stays strictly increasing.
    if (!this.router.url.startsWith('/charging')) {
      this.chargingGraphSeeded = false;
    }
    for (const delay of [0, 150, 400, 900, 1600, 2600]) {
      setTimeout(() => this.publishAll(), delay);
    }
    // Status-card timers (ACTIVE / CHARGING / BALANCING / FAULTED) read a
    // wall-clock-derived "current" duration. Emit them a couple of times to
    // reach the cards once they've subscribed (just after NavigationEnd), then
    // stop: re-emitting every interval tick changes that duration each pass and
    // floods dev-mode with ExpressionChangedAfterItHasBeenCheckedError. Two
    // discrete emits leave the cards showing a stable, plausible session time.
    // No explicit appRef.tick() here: the status cards use default change
    // detection, so zone.js runs CD after this (zone-patched) timeout in its
    // own cycle. Forcing a synchronous tick races the just-written wall-clock
    // duration against the card's prior render and trips NG0100 in dev.
    for (const delay of [150, 900, 1700]) {
      setTimeout(() => this.publishStatusTimers(), delay);
    }
  }

  stop(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.routerSub?.unsubscribe();
    this.routerSub = null;
    if (this.originalFetch) {
      window.fetch = this.originalFetch;
      this.originalFetch = null;
    }
  }

  ngOnDestroy(): void {
    this.stop();
  }

  isEnabled(): boolean {
    const ls = localStorage.getItem('USE_SEED_DATA');
    if (ls === 'true') return true;
    if (ls === 'false') return false;
    return SeedDataService.ENABLED_BY_DEFAULT;
  }

  private generateCellVoltages(): number[][][] {
    const range = CELL_VOLT_MAX - CELL_VOLT_MIN;
    const result: number[][][] = [];
    for (let seg = 0; seg < BMS_CONFIG.NUM_SEGMENTS; seg++) {
      const chipArrs: number[][] = [[], []];
      for (let chip = 0; chip < 2; chip++) {
        const cellCount = chip === 0 ? BMS_CONFIG.ALPHA_VOLT_COUNT : BMS_CONFIG.BETA_VOLT_COUNT;
        for (let cell = 0; cell < cellCount; cell++) {
          // Deterministic pseudo-spread across the voltage range per cell.
          const seed = seg * 26 + chip * 13 + cell;
          const frac = ((seed * 17 + 23) % 100) / 100;
          chipArrs[chip].push(Number((CELL_VOLT_MIN + frac * range).toFixed(3)));
        }
      }
      result.push(chipArrs);
    }
    return result;
  }

  private generateCellTemps(): number[][][] {
    const range = CELL_TEMP_MAX - CELL_TEMP_MIN;
    const result: number[][][] = [];
    for (let seg = 0; seg < BMS_CONFIG.NUM_SEGMENTS; seg++) {
      const chipArrs: number[][] = [[], []];
      for (let chip = 0; chip < 2; chip++) {
        const thermCount = chip === 0 ? BMS_CONFIG.ALPHA_THERM_COUNT : BMS_CONFIG.BETA_THERM_COUNT;
        for (let t = 0; t < thermCount; t++) {
          const seed = seg * 14 + chip * 7 + t;
          const frac = ((seed * 11 + 5) % 100) / 100;
          chipArrs[chip].push(Number((CELL_TEMP_MIN + frac * range).toFixed(1)));
        }
      }
      result.push(chipArrs);
    }
    return result;
  }

  private publishAll(): void {
    // Epoch milliseconds as a string — matches the live socket path
    // (socket.service.ts: `time: data.timestamp.toString()`). The charging-page
    // time-series graphs plot `{ x: +value.time, y }`, so `time` MUST parse to a
    // number; an ISO string would make `+value.time` NaN and the graphs render
    // empty.
    const time = String(Date.now());
    // Charging graphs accumulate one point per emission. Backfill a short
    // history ONCE per visit, here at the top of publishAll so it runs in the
    // same synchronous pass as — and immediately before — this tick's live
    // points for the same topics (packVoltage / high+low volts / high temp).
    // That ordering keeps the series strictly increasing in time: a stray live
    // point landing before the backfill makes the line jump back in time and
    // render as a diagonal "second line". The flag is reset on navigating away
    // (see scheduleDelayedPublishes) so each visit re-seeds exactly once.
    if (!this.chargingGraphSeeded && this.router.url.startsWith('/charging')) {
      this.chargingGraphSeeded = true;
      this.publishChargingGraphHistory();
    }
    // BMS / Accumulator
    this.publishPerCell(time);
    this.publishSegmentAggregates(time);
    this.publishChipDiagnostics(time);
    this.publishPackAggregates(time);
    this.publishPackStatus(time);
    // Charging (status-card timers are emitted separately — see
    // scheduleDelayedPublishes — to avoid a dev-mode NG0100 flood).
    this.publishChargingData(time);
    // eFuses
    this.publishEfuseData(time);
    // Shared nav-bar / system status (visible on every screen)
    this.publishSystemStatus(time);
    // The app is ZONELESS, so we deliberately do NOT call ApplicationRef.tick()
    // here. A manual tick runs before the signal scheduler has marked the OnPush
    // widgets dirty (leaving bms-at-a-glance / segment-overview blank); a
    // deferred tick collides with the scheduler the same way. We instead rely on
    // the app's existing change-detection drivers, exactly like the live socket
    // path (socket.service.ts addValue, no tick):
    //   • Signal readers (toSignal in bms-at-a-glance, statConfigs in
    //     segment-overview, the heatmap's effect) re-render via the signal graph.
    //   • Field readers (eFuse / charging status cards, current display,
    //     msgs/sec) are swept by the app-wide CD the nav-bar clock's
    //     `time$ | async` schedules every second.
  }

  /** Per-chip diagnostics (reference voltages, supplies, board temp). */
  private publishChipDiagnostics(time: string): void {
    // Plausible ADBMS / LTC681x reference/supply values.
    const VREF_V = 3.0; // VREF2 buffered reference (~3.0V)
    const VRES_V = 5.0; // regulator output
    const VANALOG_V = 5.0; // analog supply rail
    const VDIGITAL_V = 3.3; // digital supply rail
    const chips = [Chip.Alpha, Chip.Beta] as const;
    for (let seg = 0; seg < BMS_CONFIG.NUM_SEGMENTS; seg++) {
      for (const chip of chips) {
        const chipIdx = chip === Chip.Alpha ? 0 : 1;
        // Board temp = average of that chip's therms for this segment (aligns
        // with the cell temps shown in the heatmap).
        const chipTherms = this.cellTemps[seg][chipIdx];
        const boardT = chipTherms.reduce((a, b) => a + b, 0) / chipTherms.length;
        this.publish(topics.vref(seg, chip), [VREF_V.toFixed(3)], 'V', time);
        this.publish(topics.vres(seg, chip), [VRES_V.toFixed(3)], 'V', time);
        this.publish(topics.vAnalog(seg, chip), [VANALOG_V.toFixed(3)], 'V', time);
        this.publish(topics.vDigital(seg, chip), [VDIGITAL_V.toFixed(3)], 'V', time);
        this.publish(topics.boardTemp(seg, chip), [boardT.toFixed(1)], 'C', time);
      }
    }
  }

  /** Pack-level summary values used by the At-A-Glance bar. */
  private publishPackStatus(time: string): void {
    const packV = this.sumPackVoltage();
    let packTempSum = 0;
    let packTempN = 0;
    for (let seg = 0; seg < BMS_CONFIG.NUM_SEGMENTS; seg++) {
      for (const t of this.cellTemps[seg][0]) {
        packTempSum += t;
        packTempN += 1;
      }
      for (const t of this.cellTemps[seg][1]) {
        packTempSum += t;
        packTempN += 1;
      }
    }
    this.publish(topics.packVoltage(), [packV.toFixed(2)], 'V', time);
    this.publish(topics.packTemp(), [(packTempSum / packTempN).toFixed(1)], 'C', time);
    this.publish(topics.stateOfCharge(), [String(SEED_SOC)], '%', time);
    // Accumulator command targets shown on the BMS at-a-glance bar. Labeled
    // "CCL"/"DCL" there, same as the charging page's BMS/Pack/CCL+DCL — keep the
    // numbers identical across screens so a judge switching pages sees no
    // contradiction (see publishChargingData).
    this.publish(topics.accCCL(), ['45'], 'A', time);
    this.publish(topics.accDCL(), ['250'], 'A', time);
  }

  private publishPerCell(time: string): void {
    for (let seg = 0; seg < BMS_CONFIG.NUM_SEGMENTS; seg++) {
      for (let cell = 0; cell < BMS_CONFIG.ALPHA_VOLT_COUNT; cell++) {
        this.publish(topics.alphaVolt(seg, cell), [this.cellVoltages[seg][0][cell].toString()], 'V', time);
        this.publish(topics.alphaBurning(seg, cell), ['0'], '', time);
        this.publish(topics.alphaCvs(seg, cell), ['0'], '', time);
      }
      for (let t = 0; t < BMS_CONFIG.ALPHA_THERM_COUNT; t++) {
        // Topic value is the therm index × 2 (see allAlphaThermValues in topic.utils.ts).
        this.publish(topics.alphaTemp(seg, t * 2), [this.cellTemps[seg][0][t].toString()], 'C', time);
      }
      for (let cell = 0; cell < BMS_CONFIG.BETA_VOLT_COUNT; cell++) {
        this.publish(topics.betaVolt(seg, cell), [this.cellVoltages[seg][1][cell].toString()], 'V', time);
        this.publish(topics.betaBurning(seg, cell), ['0'], '', time);
        this.publish(topics.betaCvs(seg, cell), ['0'], '', time);
      }
      for (let t = 0; t < BMS_CONFIG.BETA_THERM_COUNT; t++) {
        this.publish(topics.betaTemp(seg, t * 2), [this.cellTemps[seg][1][t].toString()], 'C', time);
      }
    }
  }

  private publishSegmentAggregates(time: string): void {
    for (let seg = 0; seg < BMS_CONFIG.NUM_SEGMENTS; seg++) {
      const segCellVolts = [...this.cellVoltages[seg][0], ...this.cellVoltages[seg][1]];
      const totalV = segCellVolts.reduce((a, b) => a + b, 0);
      const avgV = totalV / segCellVolts.length;
      this.publish(topics.segmentVoltage(seg), [avgV.toFixed(3)], 'V', time);
      this.publish(topics.segmentTotalVoltage(seg), [totalV.toFixed(2)], 'V', time);

      const segCellTemps = [...this.cellTemps[seg][0], ...this.cellTemps[seg][1]];
      const avgT = segCellTemps.reduce((a, b) => a + b, 0) / segCellTemps.length;
      this.publish(topics.segmentTemp(seg), [avgT.toFixed(1)], 'C', time);

      // Die temps — slightly offset per segment for visual variety.
      this.publish(topics.dieTemp(seg, Chip.Alpha), [(30 + seg * 0.5).toFixed(1)], 'C', time);
      this.publish(topics.dieTemp(seg, Chip.Beta), [(31 + seg * 0.5).toFixed(1)], 'C', time);
    }
  }

  private publishPackAggregates(time: string): void {
    type VEntry = { v: number; chip: number; cell: number };
    const volts: VEntry[] = [];
    for (let seg = 0; seg < BMS_CONFIG.NUM_SEGMENTS; seg++) {
      for (let cell = 0; cell < BMS_CONFIG.ALPHA_VOLT_COUNT; cell++) {
        volts.push({ v: this.cellVoltages[seg][0][cell], chip: 0, cell });
      }
      for (let cell = 0; cell < BMS_CONFIG.BETA_VOLT_COUNT; cell++) {
        volts.push({ v: this.cellVoltages[seg][1][cell], chip: 1, cell });
      }
    }
    const vMax = volts.reduce((a, b) => (b.v > a.v ? b : a), volts[0]);
    const vMin = volts.reduce((a, b) => (b.v < a.v ? b : a), volts[0]);
    const vAvg = volts.reduce((s, e) => s + e.v, 0) / volts.length;

    this.publish(topics.highVoltsValue(), [vMax.v.toFixed(3)], 'V', time);
    this.publish(topics.highVoltsChip(), [vMax.chip.toString()], '', time);
    this.publish(topics.highVoltsCell(), [vMax.cell.toString()], '', time);
    this.publish(topics.lowVoltsValue(), [vMin.v.toFixed(3)], 'V', time);
    this.publish(topics.lowVoltsChip(), [vMin.chip.toString()], '', time);
    this.publish(topics.lowVoltsCell(), [vMin.cell.toString()], '', time);
    this.publish(topics.voltsAvgValue(), [vAvg.toFixed(3)], 'V', time);

    type TEntry = { t: number; chip: number; therm: number };
    const temps: TEntry[] = [];
    for (let seg = 0; seg < BMS_CONFIG.NUM_SEGMENTS; seg++) {
      for (let t = 0; t < BMS_CONFIG.ALPHA_THERM_COUNT; t++) {
        temps.push({ t: this.cellTemps[seg][0][t], chip: 0, therm: t });
      }
      for (let t = 0; t < BMS_CONFIG.BETA_THERM_COUNT; t++) {
        temps.push({ t: this.cellTemps[seg][1][t], chip: 1, therm: t });
      }
    }
    const tMax = temps.reduce((a, b) => (b.t > a.t ? b : a), temps[0]);
    const tMin = temps.reduce((a, b) => (b.t < a.t ? b : a), temps[0]);
    const tAvg = temps.reduce((s, e) => s + e.t, 0) / temps.length;

    this.publish(topics.highTempValue(), [tMax.t.toFixed(1)], 'C', time);
    this.publish(topics.highTempChip(), [tMax.chip.toString()], '', time);
    this.publish(topics.highTempCell(), [tMax.therm.toString()], '', time);
    this.publish(topics.lowTempValue(), [tMin.t.toFixed(1)], 'C', time);
    this.publish(topics.lowTempChip(), [tMin.chip.toString()], '', time);
    this.publish(topics.lowTempCell(), [tMin.therm.toString()], '', time);
    this.publish(topics.tempAvgValue(), [tAvg.toFixed(1)], 'C', time);
  }

  // ── Anchor values (shared by steady-state publishes + graph backfill) ─────

  /** Pack voltage = sum of every cell voltage (the steady-state anchor). */
  private sumPackVoltage(): number {
    let packV = 0;
    for (let seg = 0; seg < BMS_CONFIG.NUM_SEGMENTS; seg++) {
      for (const v of this.cellVoltages[seg][0]) packV += v;
      for (const v of this.cellVoltages[seg][1]) packV += v;
    }
    return packV;
  }

  /** Every cell voltage in the pack, flattened. */
  private allCellVoltages(): number[] {
    const out: number[] = [];
    for (let seg = 0; seg < BMS_CONFIG.NUM_SEGMENTS; seg++) {
      out.push(...this.cellVoltages[seg][0], ...this.cellVoltages[seg][1]);
    }
    return out;
  }

  /** Every thermistor temperature in the pack, flattened. */
  private allCellTemps(): number[] {
    const out: number[] = [];
    for (let seg = 0; seg < BMS_CONFIG.NUM_SEGMENTS; seg++) {
      out.push(...this.cellTemps[seg][0], ...this.cellTemps[seg][1]);
    }
    return out;
  }

  // ── Charging page ─────────────────────────────────────────────────────────

  /**
   * Backfill the three charging-page time-series graphs (pack voltage, high/low
   * cell voltage, max cell temp) with a short, realistic charging ramp so they
   * render a populated line immediately instead of accumulating one point/sec
   * from empty.
   *
   * Each series ENDS exactly at the same anchor value the per-second publish
   * emits (sumPackVoltage / cell min-max / max temp), so the graph's right edge
   * agrees with the displayed numbers and the live tail continues seamlessly.
   * Points are emitted oldest→newest with epoch-ms timestamps because the graph
   * plots in array insertion order (ApexCharts 'category' x-axis).
   */
  private publishChargingGraphHistory(): void {
    const POINTS = 60;
    const STEP_MS = 1500; // ~90 s of history
    const now = Date.now();

    const packEnd = this.sumPackVoltage();
    const volts = this.allCellVoltages();
    const highEnd = Math.max(...volts);
    const lowEnd = Math.min(...volts);
    const tempEnd = Math.max(...this.allCellTemps());

    // Charging ramp: values climb toward the anchor across the window.
    const packStart = packEnd - 2.5; // V
    const highStart = highEnd - 0.03; // V
    const lowStart = lowEnd - 0.025; // V
    const tempStart = tempEnd - 2.5; // °C

    for (let i = 0; i < POINTS; i++) {
      const f = i / (POINTS - 1); // 0 → 1 (progress through the ramp)
      const t = now - (POINTS - 1 - i) * STEP_MS; // oldest → now
      // Ease-out so the rise tapers like a real charge curve. Monotonic and
      // noise-free on purpose: a per-point wiggle, once rounded (esp. temp at
      // 0.1°C resolution), becomes a high-frequency zigzag that the straight
      // stroke renders as a forked / double line. ease(1) = 1, so the final
      // point lands exactly on the anchor (seamless with the live tail).
      const ease = 1 - (1 - f) ** 1.7;
      const time = String(t);
      this.publish(topics.packVoltage(), [(packStart + (packEnd - packStart) * ease).toFixed(2)], 'V', time);
      this.publish(topics.highVoltsValue(), [(highStart + (highEnd - highStart) * ease).toFixed(3)], 'V', time);
      this.publish(topics.lowVoltsValue(), [(lowStart + (lowEnd - lowStart) * ease).toFixed(3)], 'V', time);
      this.publish(topics.highTempValue(), [(tempStart + (tempEnd - tempStart) * ease).toFixed(1)], 'C', time);
    }
  }

  /** Pack/charging values + a clean (all-zero) fault picture. */
  private publishChargingData(time: string): void {
    this.publish(topics.location(), [SEED_LOCATION], '', time);
    // Actively charging at a healthy rate — below the 45 A charge limit and the
    // 60 A "High Charge Current" notification rule.
    this.publish(topics.current(), ['30.0'], 'A', time);
    this.publish(topics.chargeCurrentLimit(), ['45'], 'A', time);
    this.publish(topics.dischargeCurrentLimit(), ['250'], 'A', time);
    // BMS state machine: 2 = CHARGING (renders green). Balancing on; charger on.
    this.publish(topics.bmsMode(), ['2'], '', time);
    this.publish(topics.statusBalancing(), ['1'], '', time);
    this.publish(topics.charging(), ['0'], '', time);

    // Every fault topic clear → fault list stays empty, all status dots calm.
    for (const faultTopic of this.allFaultTopics()) {
      this.publish(faultTopic, ['0'], '', time);
    }
  }

  /** Charger + BMS fault flags consumed by the charging fault-display. */
  private allFaultTopics(): string[] {
    return [
      topics.commTimeoutFault(),
      topics.hardwareFailureFault(),
      topics.overTempFault(),
      topics.overVoltageFault(),
      topics.wrongBatConnectFault(),
      topics.openWire(),
      topics.chargerLimitEnforcementFault(),
      topics.chargerCanFault(),
      topics.batteryThermistor(),
      topics.chargerSafetyRelay(),
      topics.dischargeLimitEnforcementFault(),
      topics.externalCanFault(),
      topics.weakPackFault(),
      topics.lowCellVoltage(),
      topics.chargeReadingMismatch(),
      topics.currentSensorFault(),
      topics.internalCellCommFault(),
      topics.internalSoftwareFault(),
      topics.packOverheat(),
      topics.cellUndervoltage(),
      topics.cellOvervoltage(),
      topics.cellsNotBalancing()
    ];
  }

  /**
   * The combined-status cards (ACTIVE / FAULTED / BALANCING / CHARGING) read the
   * TimerData channel, which carries a per-value time-accumulation map. We model
   * an in-progress charging session that ticks up live:
   *   • bmsMode: active in state 2 (CHARGING) → ACTIVE dot green, never FAULTED.
   *   • statusBalancing: active in state 1 → BALANCING dot blue.
   *   • charging (BMS/Charging/Control): active in state 0 → CHARGING dot lit.
   * Each map MUST contain the keys the components index ([2]+[3] for bmsMode,
   * [1] for balancing, [0] for charging) or their `.reduce` calls would throw.
   */
  private publishStatusTimers(): void {
    this.storage.addTimerValue(topics.bmsMode(), this.timerData(topics.bmsMode(), 2, [0, 1, 2, 3], 22 * 60 * 1000));
    this.storage.addTimerValue(
      topics.statusBalancing(),
      this.timerData(topics.statusBalancing(), 1, [0, 1], 14 * 60 * 1000)
    );
    this.storage.addTimerValue(topics.charging(), this.timerData(topics.charging(), 0, [0, 1], 22 * 60 * 1000));
  }

  /**
   * Build a TimerData object whose current value has been held since
   * `activeForMs` ago (so the "current" timer counts up over the demo) plus one
   * earlier completed interval (so the "total" timer shows accumulated history).
   */
  private timerData(topic: string, lastValue: number, keys: number[], activeForMs: number): TimerData {
    const now = Date.now();
    const lastChange = this.seedStartMs - activeForMs;
    const map: Record<string, { start_time: number; end_time: number }[]> = {};
    for (const k of keys) map[String(k)] = [];
    // An earlier completed session for this value: ~50 min, ending 70 min ago.
    map[String(lastValue)] = [{ start_time: now - 2 * 60 * 60 * 1000, end_time: now - 70 * 60 * 1000 }];
    return { topic, last_change: lastChange, last_value: lastValue, total_time_per_value_map: map };
  }

  // ── eFuses page ─────────────────────────────────────────────────────────

  /** Each eFuse: healthy (enabled, unfaulted), with plausible bus voltage /
   * load current, plus the VCU Echo + RTDS telemetry the page renders. */
  private publishEfuseData(time: string): void {
    const fuses = EFUSE_TOPICS.VCU.eFuses;
    (Object.keys(fuses) as (keyof typeof fuses)[]).forEach((key) => {
      const seed = EFUSE_SEED[key];
      const bundle = fuses[key];
      const enabled = seed.state === 2 ? 0 : 1; // OFF → not powering its load
      this.publish(bundle.ADC, [String(seed.adc)], '', time);
      this.publish(bundle.Voltage, [GLV_VOLTAGE.toFixed(2)], 'V', time);
      this.publish(bundle.Current, [seed.current.toFixed(2)], 'A', time);
      this.publish(bundle.Faulted, ['0'], '', time);
      this.publish(bundle.Enabled, [String(enabled)], '', time);
      this.publish(bundle.Control_State, [String(seed.state)], '', time);
      // Calypso commanded state drives the ON/OFF/AUTO switch position.
      this.publish(EFUSE_TOPICS.Calypso.eFuse_Commands[key], [String(seed.state)], '', time);
    });

    // VCU Echo telemetry feeding the AUTO-mode value displays.
    const echo = EFUSE_TOPICS.VCU.Echo;
    this.publish(echo.Motor_Temp, [ECHO_MOTOR_TEMP.toFixed(1)], 'C', time);
    this.publish(echo.Controller_Temp, [ECHO_CONTROLLER_TEMP.toFixed(1)], 'C', time);
    this.publish(echo.Battbox_Temp, [ECHO_BATTBOX_TEMP.toFixed(1)], 'C', time);
    this.publish(echo.Brake_State, [String(ECHO_BRAKE_STATE)], '', time);
    this.publish(echo.BMS_Shutdown, ['0'], '', time);

    // RTDS debug card — everything nominal / inactive.
    const rtds = EFUSE_TOPICS.VCU.RTDS;
    this.publish(rtds.Pin_State, ['0'], '', time);
    this.publish(rtds.Sounding_State, ['0'], '', time);
    this.publish(rtds.Reverse_State, ['0'], '', time);
    this.publish(rtds.Error_State, ['0'], '', time);
  }

  // ── Rules page (REST-backed) ────────────────────────────────────────────

  /**
   * The Rules page fetches GET {backend}/rules/{clientId}. With no backend in
   * seed mode, we patch window.fetch to answer that one route with a realistic
   * rule set; everything else passes through to the real fetch.
   */
  private installRulesFetchInterceptor(): void {
    if (this.originalFetch) return;
    const original = window.fetch.bind(window);
    this.originalFetch = original;
    window.fetch = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : (input as Request).url;
      const method = (init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase();
      if (url.includes('/rules/')) {
        if (method === 'GET') {
          return Promise.resolve(this.buildRulesResponse());
        }
        // Rule writes (add/delete/edit/subscribe) — acknowledge so the UI's
        // success paths run and it re-fetches the seeded list.
        return Promise.resolve(new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } }));
      }
      // Add-Rule dialog populates its topic autocomplete from GET /datatypes.
      if (url.includes('/datatypes')) {
        return Promise.resolve(this.jsonResponse(this.seedDataTypes()));
      }
      return original(input, init);
    };
  }

  private buildRulesResponse(): Response {
    const clientId = localStorage.getItem(RULES_CLIENT_ID_KEY) ?? 'seed-client';
    const body: RulesResponse = { requesting_client_id: clientId, client_rules: this.seedRules(clientId) };
    return this.jsonResponse(body);
  }

  private jsonResponse(body: unknown): Response {
    return new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }

  /** Topic list backing the Add-Rule dialog's autocomplete (GET /datatypes). */
  private seedDataTypes(): DataType[] {
    return [
      'BMS/Status/Temp_Average',
      'BMS/Cells/Volts_Low_Value',
      'BMS/Cells/Volts_High_Value',
      'BMS/Cells/Volts_Avg_Value',
      'BMS/Pack/SOC',
      'BMS/Pack/Voltage',
      'BMS/Charging/Current',
      'BMS/Status/State',
      'BMS/Status/F/Weak_Pack',
      'BMS/Status/F/Cell_Undervoltage',
      'DTI/Temps/Motor_Temperature',
      'VCU/CarState/speed',
      'TPU/HaLow/RSSI',
      'TPU/OnBoard/CpuTemp'
    ].map((name) => ({ name, unit: '' }));
  }

  /** A realistic set of safety-monitoring notification rules. `is_subscribed`
   * stays consistent with whether `clientId` appears in `subscribers`.
   *
   * `expr` uses the backend rules-engine syntax: the topic's latest value is
   * bound to the variable `a` and evaluated with evalexpr (see
   * scylla-server/src/rule_structs.rs). `debounce_time` is in SECONDS. */
  private seedRules(clientId: string): ClientRule[] {
    const subbed = (others: string[]): { subscribers: string[]; is_subscribed: true } => ({
      subscribers: [clientId, ...others],
      is_subscribed: true
    });
    const unsubbed = (others: string[]): { subscribers: string[]; is_subscribed: false } => ({
      subscribers: others,
      is_subscribed: false
    });
    return [
      { id: 'Pack Overheat', topic: 'BMS/Status/Temp_Average', expr: 'a > 55', debounce_time: 5, ...subbed(['pit-crew']) },
      { id: 'Cell Undervoltage', topic: 'BMS/Cells/Volts_Low_Value', expr: 'a < 3.0', debounce_time: 2, ...subbed([]) },
      { id: 'Cell Overvoltage', topic: 'BMS/Cells/Volts_High_Value', expr: 'a > 4.2', debounce_time: 2, ...subbed([]) },
      {
        id: 'High Charge Current',
        topic: 'BMS/Charging/Current',
        expr: 'a > 60',
        debounce_time: 1,
        ...subbed(['pit-crew'])
      },
      {
        id: 'Motor Overheat',
        topic: 'DTI/Temps/Motor_Temperature',
        expr: 'a > 90',
        debounce_time: 3,
        ...subbed(['driver'])
      },
      { id: 'Low State of Charge', topic: 'BMS/Pack/SOC', expr: 'a < 20', debounce_time: 10, ...unsubbed(['pit-crew']) },
      { id: 'Weak Pack', topic: 'BMS/Status/F/Weak_Pack', expr: 'a == 1', debounce_time: 2, ...unsubbed([]) },
      { id: 'Low HaLow Signal', topic: 'TPU/HaLow/RSSI', expr: 'a < -80', debounce_time: 15, ...unsubbed(['pit-crew']) }
    ];
  }

  // ── Shared chrome (nav bar) ─────────────────────────────────────────────

  /** Values shown in the top nav on every screen. */
  private publishSystemStatus(time: string): void {
    // Healthy telemetry throughput and a snappy link.
    this.publish(topics.msgsPerSecond(), ['215'], '', time);
    this.publish(topics.latency(), ['12'], 'ms', time); // Old_Latency (charging-mobile)
    this.publish(topics.newLatency(), ['8'], 'ms', time); // Latency
  }

  /**
   * Pre-populate the notification log with a few past rule firings so the Rules
   * page stream rail and the nav bell aren't empty. The story is coherent with
   * the live seed data: the car came in on low charge, a brief high-current
   * spike at the start of the charge, and an occasional telemetry-link dip —
   * all now resolved (current telemetry reads healthy). Ids match seeded rules.
   */
  private seedNotifications(): void {
    const now = Date.now();
    const minsAgo = (m: number): string => new Date(now - m * 60 * 1000).toISOString();
    // Oldest first — addNotification prepends, so the rail ends up newest-first.
    const events: { id: string; topic: string; values: number[]; minsAgo: number }[] = [
      { id: 'Low State of Charge', topic: 'BMS/Pack/SOC', values: [18], minsAgo: 31 },
      { id: 'High Charge Current', topic: 'BMS/Charging/Current', values: [63], minsAgo: 12 },
      { id: 'Low HaLow Signal', topic: 'TPU/HaLow/RSSI', values: [-83], minsAgo: 4 }
    ];
    for (const e of events) {
      this.notificationLog.addNotification({ id: e.id, topic: e.topic, values: e.values, time: minsAgo(e.minsAgo) });
    }
  }

  private publish(topic: string, values: string[], unit: string, time: string): void {
    const data: DataValue = { values, time, unit };
    this.storage.addValue(topic, data);
  }
}
