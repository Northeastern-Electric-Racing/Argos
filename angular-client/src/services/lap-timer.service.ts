import { computed, inject, Injectable, signal } from '@angular/core';
import { Subscription } from 'rxjs';
import { startLap as apiStartLap, pauseLap as apiPauseLap, stopLap as apiStopLap } from 'src/api/lap-timer.api';
import { topics } from 'src/utils/topic.utils';
import Storage from './storage.service';

export type LapState = 'idle' | 'running' | 'paused';

export interface LapStats {
  avgSpeed: number | null;
  maxSpeed: number | null;
  socStart: number | null;
  socEnd: number | null;
  energyUsed: number | null; // SOC delta as percentage points
  maxMotorTemp: number | null;
}

export interface LapRecord {
  number: number;
  duration: number;
  stats: LapStats;
}

@Injectable({ providedIn: 'root' })
export default class LapTimerService {
  private storage = inject(Storage);

  readonly state = signal<LapState>('idle');
  readonly currentLapTime = signal(0);
  readonly totalTime = signal(0);
  readonly laps = signal<LapRecord[]>([]);

  private rafId: number | null = null;
  private lastTickTime = 0;

  // Telemetry accumulators for current lap
  private speedSamples: number[] = [];
  private lastSoc: number | null = null;
  private lapSocStart: number | null = null;
  private lapMaxMotorTemp: number | null = null;
  private telemetrySubs: Subscription[] = [];

  readonly isRunning = computed(() => this.state() === 'running');
  readonly isPaused = computed(() => this.state() === 'paused');
  readonly isIdle = computed(() => this.state() === 'idle');
  readonly lapCount = computed(() => this.laps().length);

  readonly formattedCurrentLap = computed(() => this.formatTime(this.currentLapTime()));
  readonly formattedTotal = computed(() => this.formatTime(this.totalTime()));

  readonly bestLap = computed(() => {
    const laps = this.laps();
    if (laps.length === 0) return null;
    return laps.reduce((best, lap) => (lap.duration < best.duration ? lap : best));
  });

  readonly worstLap = computed(() => {
    const laps = this.laps();
    if (laps.length < 2) return null;
    return laps.reduce((worst, lap) => (lap.duration > worst.duration ? lap : worst));
  });

  readonly averageLapTime = computed(() => {
    const laps = this.laps();
    if (laps.length === 0) return 0;
    return laps.reduce((sum, lap) => sum + lap.duration, 0) / laps.length;
  });

  // Session-level computed stats
  readonly totalEnergyUsed = computed(() => {
    const laps = this.laps();
    return laps.reduce((sum, lap) => sum + (lap.stats.energyUsed ?? 0), 0);
  });

  deltaFromBest(lapDuration: number): number | null {
    const best = this.bestLap();
    if (!best) return null;
    return lapDuration - best.duration;
  }

  formatDelta(deltaMs: number): string {
    const sign = deltaMs >= 0 ? '+' : '-';
    return `${sign}${this.formatTime(Math.abs(deltaMs))}`;
  }

  start(): void {
    if (this.state() === 'idle') {
      this.laps.set([]);
      this.currentLapTime.set(0);
      this.totalTime.set(0);
    }
    this.state.set('running');
    this.startTicking();
    this.subscribeTelemetry();
    apiStartLap().catch(() => {});
  }

  pause(): void {
    if (this.state() !== 'running') return;
    this.state.set('paused');
    this.stopTicking();
    apiPauseLap().catch(() => {});
  }

  resume(): void {
    if (this.state() !== 'paused') return;
    this.state.set('running');
    this.startTicking();
    apiStartLap().catch(() => {});
  }

  lap(): void {
    if (this.state() !== 'running') return;
    const lapDuration = this.currentLapTime();
    if (lapDuration === 0) return;
    const stats = this.snapshotStats();
    this.laps.update((prev) => [...prev, { number: prev.length + 1, duration: lapDuration, stats }]);
    this.currentLapTime.set(0);
    this.resetLapAccumulators();
  }

  stop(): void {
    const remaining = this.currentLapTime();
    if (remaining > 0) {
      const stats = this.snapshotStats();
      this.laps.update((prev) => [...prev, { number: prev.length + 1, duration: remaining, stats }]);
    }
    this.stopTicking();
    this.unsubscribeTelemetry();
    this.state.set('idle');
    this.currentLapTime.set(0);
    apiStopLap().catch(() => {});
  }

  reset(): void {
    this.stopTicking();
    this.unsubscribeTelemetry();
    this.state.set('idle');
    this.currentLapTime.set(0);
    this.totalTime.set(0);
    this.laps.set([]);
  }

  formatTime(timeMs: number): string {
    const totalSeconds = Math.floor(timeMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const centiseconds = Math.floor((timeMs % 1000) / 10);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`;
  }

  // --- Telemetry tracking ---

  private subscribeTelemetry(): void {
    this.resetLapAccumulators();

    this.telemetrySubs.push(
      this.storage.get(topics.speed()).subscribe((value) => {
        if (this.state() !== 'running') return;
        const speed = parseFloat(value.values[0]);
        if (!isNaN(speed)) {
          this.speedSamples.push(speed);
        }
      })
    );

    this.telemetrySubs.push(
      this.storage.get(topics.stateOfCharge()).subscribe((value) => {
        if (this.state() !== 'running') return;
        const soc = parseFloat(value.values[0]);
        if (!isNaN(soc)) {
          if (this.lapSocStart === null) this.lapSocStart = soc;
          this.lastSoc = soc;
        }
      })
    );

    this.telemetrySubs.push(
      this.storage.get(topics.motorTemp()).subscribe((value) => {
        if (this.state() !== 'running') return;
        const temp = parseFloat(value.values[0]);
        if (!isNaN(temp)) {
          this.lapMaxMotorTemp = this.lapMaxMotorTemp === null ? temp : Math.max(this.lapMaxMotorTemp, temp);
        }
      })
    );
  }

  private unsubscribeTelemetry(): void {
    this.telemetrySubs.forEach((sub) => sub.unsubscribe());
    this.telemetrySubs = [];
  }

  private snapshotStats(): LapStats {
    const avgSpeed = this.speedSamples.length > 0
      ? this.speedSamples.reduce((a, b) => a + b, 0) / this.speedSamples.length
      : null;
    const maxSpeed = this.speedSamples.length > 0
      ? Math.max(...this.speedSamples)
      : null;
    const energyUsed = this.lapSocStart !== null && this.lastSoc !== null
      ? this.lapSocStart - this.lastSoc
      : null;

    return {
      avgSpeed,
      maxSpeed,
      socStart: this.lapSocStart,
      socEnd: this.lastSoc,
      energyUsed,
      maxMotorTemp: this.lapMaxMotorTemp,
    };
  }

  private resetLapAccumulators(): void {
    this.speedSamples = [];
    this.lapSocStart = this.lastSoc; // carry over current SOC as next lap's start
    this.lapMaxMotorTemp = null;
  }

  // --- Timer internals ---

  private startTicking(): void {
    this.lastTickTime = performance.now();
    const tick = () => {
      const now = performance.now();
      const delta = now - this.lastTickTime;
      this.lastTickTime = now;
      this.currentLapTime.update((t) => t + delta);
      this.totalTime.update((t) => t + delta);
      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
  }

  private stopTicking(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }
}
