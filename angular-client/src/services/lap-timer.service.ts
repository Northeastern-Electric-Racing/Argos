import { computed, Injectable, signal } from '@angular/core';
import { startLap as apiStartLap, pauseLap as apiPauseLap, stopLap as apiStopLap } from 'src/api/lap-timer.api';

export type LapState = 'idle' | 'running' | 'paused';

export interface LapRecord {
  number: number;
  duration: number;
}

@Injectable({ providedIn: 'root' })
export default class LapTimerService {
  readonly state = signal<LapState>('idle');
  readonly currentLapTime = signal(0);
  readonly totalTime = signal(0);
  readonly laps = signal<LapRecord[]>([]);

  private intervalId: ReturnType<typeof setInterval> | null = null;
  private lastTickTime = 0;

  readonly isRunning = computed(() => this.state() === 'running');
  readonly isPaused = computed(() => this.state() === 'paused');
  readonly isIdle = computed(() => this.state() === 'idle');
  readonly lapCount = computed(() => this.laps().length);

  readonly formattedCurrentLap = computed(() => this.formatTime(this.currentLapTime()));
  readonly formattedTotal = computed(() => this.formatTime(this.totalTime()));

  start(): void {
    if (this.state() === 'idle') {
      // Fresh start
      this.laps.set([]);
      this.currentLapTime.set(0);
      this.totalTime.set(0);
    }
    this.state.set('running');
    this.startTicking();
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
    this.laps.update((prev) => [...prev, { number: prev.length + 1, duration: lapDuration }]);
    this.currentLapTime.set(0);
  }

  stop(): void {
    // Record final lap if there's time on it
    const remaining = this.currentLapTime();
    if (remaining > 0) {
      this.laps.update((prev) => [...prev, { number: prev.length + 1, duration: remaining }]);
    }
    this.stopTicking();
    this.state.set('idle');
    this.currentLapTime.set(0);
    apiStopLap().catch(() => {});
  }

  reset(): void {
    this.stopTicking();
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

  private startTicking(): void {
    this.lastTickTime = performance.now();
    this.intervalId = setInterval(() => {
      const now = performance.now();
      const delta = now - this.lastTickTime;
      this.lastTickTime = now;
      this.currentLapTime.update((t) => t + delta);
      this.totalTime.update((t) => t + delta);
    }, 10);
  }

  private stopTicking(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}
