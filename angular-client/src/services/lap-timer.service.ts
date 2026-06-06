import { computed, inject, Injectable, signal, Signal } from '@angular/core';
import { Subscription } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';
import { downloadAsFile } from 'src/utils/file-download.utils';
import { topics } from 'src/utils/topic.utils';
import {
  defaultSessionName,
  emptyLapStore,
  escapeCsvCell,
  formatDeltaMs,
  formatMs,
  isLapStore,
  Lap,
  LapSession,
  LapStats,
  LapStore,
  LAP_STORE_STORAGE_KEY,
  slugifySessionName
} from 'src/utils/lap-timer.types';
import Storage from './storage.service';

export type LapState = 'idle' | 'running' | 'paused';

const TICK_INTERVAL_MS = 100;

@Injectable({ providedIn: 'root' })
export default class LapTimerService {
  private storage = inject(Storage);

  private readonly store = signal<LapStore>(hydrate());

  /** Drives time-derived computeds. */
  private readonly tickSignal = signal(0);
  private tickInterval: ReturnType<typeof setInterval> | null = null;

  private speedSamples: number[] = [];
  private lastSoc: number | null = null;
  private lapSocStart: number | null = null;
  private lapMaxMotorTemp: number | null = null;
  private telemetrySubs: Subscription[] = [];

  readonly sessions: Signal<LapSession[]> = computed(() => this.store().sessions);
  readonly activeSession: Signal<LapSession | null> = computed(() => {
    const s = this.store();
    return s.sessions.find((x) => x.id === s.activeSessionId) ?? null;
  });

  readonly state = computed<LapState>(() => {
    const s = this.activeSession();
    if (!s) return 'idle';
    if (s.isRunning) return 'running';
    if (s.isPaused) return 'paused';
    return 'idle';
  });
  readonly isRunning = computed(() => this.state() === 'running');
  readonly isPaused = computed(() => this.state() === 'paused');
  readonly isIdle = computed(() => this.state() === 'idle');
  readonly laps: Signal<Lap[]> = computed(() => this.activeSession()?.laps ?? []);
  readonly lapCount = computed(() => this.laps().length);

  readonly currentLapTimeMs = computed(() => {
    this.tickSignal();
    const s = this.activeSession();
    if (!s) return 0;
    if (s.isRunning && s.currentLapStartEpochMs !== null) {
      return s.currentLapAccumulatedMs + (Date.now() - s.currentLapStartEpochMs);
    }
    return s.currentLapAccumulatedMs;
  });

  readonly totalTimeMs = computed(() => {
    const s = this.activeSession();
    if (!s) return 0;
    const sumLaps = s.laps.reduce((acc, l) => acc + l.durationMs, 0);
    return sumLaps + this.currentLapTimeMs();
  });

  readonly formattedCurrentLap = computed(() => formatMs(this.currentLapTimeMs()));
  readonly formattedTotal = computed(() => formatMs(this.totalTimeMs()));

  readonly bestLap = computed<Lap | null>(() => {
    const ls = this.laps();
    if (ls.length === 0) return null;
    return ls.reduce((best, lap) => (lap.durationMs < best.durationMs ? lap : best));
  });

  readonly worstLap = computed<Lap | null>(() => {
    const ls = this.laps();
    if (ls.length < 2) return null;
    return ls.reduce((worst, lap) => (lap.durationMs > worst.durationMs ? lap : worst));
  });

  readonly averageLapTime = computed(() => {
    const ls = this.laps();
    if (ls.length === 0) return 0;
    return ls.reduce((sum, lap) => sum + lap.durationMs, 0) / ls.length;
  });

  readonly totalEnergyUsed = computed(() => {
    return this.laps().reduce((sum, lap) => sum + (lap.stats.energyUsed ?? 0), 0);
  });

  readonly currentLapDeltaToBestMs = computed(() => {
    const best = this.bestLap();
    if (!best) return null;
    return this.currentLapTimeMs() - best.durationMs;
  });

  constructor() {
    if (this.activeSession()?.isRunning) {
      this.subscribeTelemetry();
      this.startTickLoop();
    }
  }

  deltaFromBest(lapDurationMs: number): number | null {
    const best = this.bestLap();
    if (!best) return null;
    return lapDurationMs - best.durationMs;
  }

  getBestLapMs(sessionId?: string): number | null {
    const s = sessionId ? this.findSession(sessionId) : this.activeSession();
    if (!s || s.laps.length === 0) return null;
    return s.laps.reduce((min, l) => (l.durationMs < min ? l.durationMs : min), Infinity);
  }

  /** Auto-creates a session if none is active. */
  start(): void {
    if (!this.activeSession()) {
      this.createSession();
    }
    const session = this.activeSession();
    if (!session || session.isRunning) return;
    this.mutateActive((s) => {
      s.isRunning = true;
      s.isPaused = false;
      s.currentLapStartEpochMs = Date.now();
    });
    if (this.telemetrySubs.length === 0) this.subscribeTelemetry();
    this.startTickLoop();
  }

  pause(): void {
    const s = this.activeSession();
    if (!s || !s.isRunning) return;
    this.mutateActive((next) => {
      const slice = next.currentLapStartEpochMs !== null ? Date.now() - next.currentLapStartEpochMs : 0;
      next.currentLapAccumulatedMs += slice;
      next.currentLapStartEpochMs = null;
      next.isRunning = false;
      next.isPaused = true;
    });
    this.stopTickLoop();
    // Telemetry stays subscribed across pause/resume.
  }

  resume(): void {
    if (!this.isPaused()) return;
    this.mutateActive((next) => {
      next.isRunning = true;
      next.isPaused = false;
      next.currentLapStartEpochMs = Date.now();
    });
    if (this.telemetrySubs.length === 0) this.subscribeTelemetry();
    this.startTickLoop();
  }

  /** Each lap captures runId at record time. */
  lap(): void {
    const session = this.activeSession();
    if (!session || !session.isRunning || session.currentLapStartEpochMs === null) return;
    const endEpochMs = Date.now();
    const durationMs = session.currentLapAccumulatedMs + (endEpochMs - session.currentLapStartEpochMs);
    if (durationMs === 0) return;

    const stats = this.snapshotStats();
    const lastLap = session.laps[session.laps.length - 1];
    const startEpochMs = lastLap ? lastLap.endEpochMs : session.sessionStartEpochMs;
    const newLap: Lap = {
      number: session.laps.length + 1,
      startEpochMs,
      endEpochMs,
      durationMs,
      runId: this.storage.getCurrentRunId().getValue() ?? null,
      stats
    };

    this.mutateActive((next) => {
      next.laps = [...next.laps, newLap];
      next.currentLapAccumulatedMs = 0;
      next.currentLapStartEpochMs = endEpochMs;
    });
    this.resetLapAccumulators();
  }

  stop(): void {
    if (this.isRunning()) {
      this.lap();
      this.pause();
    }
  }

  reset(): void {
    if (!this.activeSession()) return;
    this.mutateActive((next) => {
      next.laps = [];
      next.currentLapAccumulatedMs = 0;
      next.currentLapStartEpochMs = null;
      next.isRunning = false;
      next.isPaused = false;
    });
    this.stopTickLoop();
    this.resetLapAccumulators();
  }

  createSession(name?: string): string {
    if (this.isRunning()) this.pause();
    this.unsubscribeTelemetry();

    const startEpochMs = Date.now();
    const runId = this.storage.getCurrentRunId().getValue() ?? null;
    const newSession: LapSession = {
      id: uuidv4(),
      name: name?.trim() || defaultSessionName(startEpochMs, runId),
      sessionStartEpochMs: startEpochMs,
      runIdAtSessionStart: runId,
      laps: [],
      isRunning: false,
      isPaused: false,
      currentLapStartEpochMs: null,
      currentLapAccumulatedMs: 0
    };

    this.mutateStore((store) => {
      store.sessions = [newSession, ...store.sessions];
      store.activeSessionId = newSession.id;
    });
    return newSession.id;
  }

  selectSession(id: string): void {
    if (this.store().activeSessionId === id) return;
    if (this.isRunning()) this.pause();
    this.unsubscribeTelemetry();
    this.stopTickLoop();
    this.mutateStore((store) => {
      if (store.sessions.some((s) => s.id === id)) {
        store.activeSessionId = id;
      }
    });
    if (this.activeSession()?.isRunning) {
      this.subscribeTelemetry();
      this.startTickLoop();
    }
  }

  renameSession(id: string, name: string): void {
    const trimmed = name?.trim();
    if (!trimmed) return;
    this.mutateStore((store) => {
      store.sessions = store.sessions.map((s) => (s.id === id ? { ...s, name: trimmed } : s));
    });
  }

  deleteSession(id: string): void {
    const wasActive = this.store().activeSessionId === id;
    if (wasActive) {
      this.stopTickLoop();
      this.unsubscribeTelemetry();
    }
    this.mutateStore((store) => {
      store.sessions = store.sessions.filter((s) => s.id !== id);
      if (wasActive) store.activeSessionId = null;
    });
  }

  endActiveSession(): void {
    if (!this.activeSession()) return;
    if (this.isRunning()) this.pause();
    this.unsubscribeTelemetry();
    this.stopTickLoop();
    this.mutateStore((store) => {
      store.activeSessionId = null;
    });
  }

  clearAllSessions(): void {
    this.stopTickLoop();
    this.unsubscribeTelemetry();
    this.mutateStore((store) => {
      store.sessions = [];
      store.activeSessionId = null;
    });
  }

  /** Split from downloadCsv() for testability. */
  buildCsv(sessionId?: string): { filename: string; body: string } | null {
    const s = sessionId ? this.findSession(sessionId) : this.activeSession();
    if (!s) return null;

    const bestLapMs = s.laps.length === 0 ? null : Math.min(...s.laps.map((l) => l.durationMs));

    const columns = ['Lap', 'Duration', '+/- Best', 'Time of Day', 'Run', 'Avg Speed (mph)', 'Energy (%)', 'Max Temp (°C)'];

    const rows = s.laps.map((l) => {
      const deltaBestMs = bestLapMs === null ? null : l.durationMs - bestLapMs;
      const isBest = bestLapMs !== null && l.durationMs === bestLapMs;
      return [
        l.number,
        formatMs(l.durationMs),
        isBest ? '' : deltaBestMs === null ? '' : formatDeltaMs(deltaBestMs),
        new Date(l.endEpochMs).toISOString().slice(11, 23),
        l.runId ?? '',
        l.stats.avgSpeed !== null ? l.stats.avgSpeed.toFixed(1) : '',
        l.stats.energyUsed !== null ? l.stats.energyUsed.toFixed(2) : '',
        l.stats.maxMotorTemp !== null ? l.stats.maxMotorTemp.toFixed(0) : ''
      ]
        .map(escapeCsvCell)
        .join(',');
    });

    const body = [columns.join(','), ...rows].join('\r\n') + '\r\n';
    const sessionStartIso = new Date(s.sessionStartEpochMs).toISOString();
    const datePart = sessionStartIso.slice(0, 19).replace(/:/g, '-');
    const filename = `argos-laps-${slugifySessionName(s.name)}-${s.runIdAtSessionStart ?? 'norun'}-${datePart}.csv`;
    return { filename, body };
  }

  downloadCsv(sessionId?: string): string | null {
    const built = this.buildCsv(sessionId);
    if (!built) return null;
    downloadAsFile(built.filename, built.body, 'text/csv;charset=utf-8;');
    return built.filename;
  }

  private mutateStore(mutator: (s: LapStore) => void): void {
    const next = cloneStore(this.store());
    mutator(next);
    this.store.set(next);
    this.persist(next);
  }

  private mutateActive(mutator: (s: LapSession) => void): void {
    const activeId = this.store().activeSessionId;
    if (activeId === null) return;
    this.mutateStore((store) => {
      store.sessions = store.sessions.map((s) => {
        if (s.id !== activeId) return s;
        const draft = { ...s, laps: [...s.laps] };
        mutator(draft);
        return draft;
      });
    });
  }

  private persist(store: LapStore): void {
    try {
      localStorage.setItem(LAP_STORE_STORAGE_KEY, JSON.stringify(store));
    } catch (e) {
      console.warn('LapTimerService: localStorage write failed', e);
    }
  }

  private findSession(id: string): LapSession | null {
    return this.store().sessions.find((s) => s.id === id) ?? null;
  }

  private startTickLoop(): void {
    if (this.tickInterval !== null) return;
    this.tickInterval = setInterval(() => {
      this.tickSignal.update((n) => (n + 1) | 0);
    }, TICK_INTERVAL_MS);
  }

  private stopTickLoop(): void {
    if (this.tickInterval !== null) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
    // Final bump so derived computeds settle.
    this.tickSignal.update((n) => (n + 1) | 0);
  }

  private subscribeTelemetry(): void {
    this.resetLapAccumulators();

    this.telemetrySubs.push(
      this.storage.get(topics.speed()).subscribe((value) => {
        if (!this.isRunning()) return;
        const speed = parseFloat(value.values[0]);
        if (!isNaN(speed)) this.speedSamples.push(speed);
      })
    );
    this.telemetrySubs.push(
      this.storage.get(topics.stateOfCharge()).subscribe((value) => {
        if (!this.isRunning()) return;
        const soc = parseFloat(value.values[0]);
        if (!isNaN(soc)) {
          if (this.lapSocStart === null) this.lapSocStart = soc;
          this.lastSoc = soc;
        }
      })
    );
    this.telemetrySubs.push(
      this.storage.get(topics.motorTemp()).subscribe((value) => {
        if (!this.isRunning()) return;
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
    const samples = this.speedSamples;
    const avgSpeed = samples.length > 0 ? samples.reduce((a, b) => a + b, 0) / samples.length : null;
    const maxSpeed = samples.length > 0 ? Math.max(...samples) : null;
    const energyUsed = this.lapSocStart !== null && this.lastSoc !== null ? this.lapSocStart - this.lastSoc : null;
    return {
      avgSpeed,
      maxSpeed,
      socStart: this.lapSocStart,
      socEnd: this.lastSoc,
      energyUsed,
      maxMotorTemp: this.lapMaxMotorTemp
    };
  }

  private resetLapAccumulators(): void {
    this.speedSamples = [];
    // Carry latest SOC into next lap's start.
    this.lapSocStart = this.lastSoc;
    this.lapMaxMotorTemp = null;
  }
}

function hydrate(): LapStore {
  try {
    const raw = localStorage.getItem(LAP_STORE_STORAGE_KEY);
    if (!raw) return emptyLapStore();
    const parsed: unknown = JSON.parse(raw);
    if (!isLapStore(parsed)) {
      localStorage.removeItem(LAP_STORE_STORAGE_KEY);
      return emptyLapStore();
    }
    // Coerce dangling activeSessionId to null.
    if (parsed.activeSessionId !== null && !parsed.sessions.some((s) => s.id === parsed.activeSessionId)) {
      parsed.activeSessionId = null;
    }
    return parsed;
  } catch {
    return emptyLapStore();
  }
}

function cloneStore(s: LapStore): LapStore {
  return {
    schemaVersion: s.schemaVersion,
    activeSessionId: s.activeSessionId,
    sessions: s.sessions.map((sess) => ({ ...sess, laps: [...sess.laps] }))
  };
}
