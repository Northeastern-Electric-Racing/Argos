export const LAP_STORE_SCHEMA_VERSION = 1;
export const LAP_STORE_STORAGE_KEY = 'argos_lap_store_v1';

export interface LapStats {
  avgSpeed: number | null;
  maxSpeed: number | null;
  socStart: number | null;
  socEnd: number | null;
  energyUsed: number | null;
  maxMotorTemp: number | null;
}

export interface Lap {
  number: number;
  startEpochMs: number;
  endEpochMs: number;
  durationMs: number;
  runId: number | null;
  stats: LapStats;
}

export interface LapSession {
  id: string;
  name: string;
  sessionStartEpochMs: number;
  runIdAtSessionStart: number | null;
  laps: Lap[];
  isRunning: boolean;
  isPaused: boolean;
  currentLapStartEpochMs: number | null;
  currentLapAccumulatedMs: number;
}

export interface LapStore {
  schemaVersion: number;
  activeSessionId: string | null;
  sessions: LapSession[];
}

export const emptyLapStore = (): LapStore => ({
  schemaVersion: LAP_STORE_SCHEMA_VERSION,
  activeSessionId: null,
  sessions: []
});

const pad2 = (n: number) => n.toString().padStart(2, '0');

export const formatMs = (ms: number): string => {
  if (!isFinite(ms) || ms < 0) ms = 0;
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const centiseconds = Math.floor((ms % 1000) / 10);
  const msPart = `${pad2(seconds)}.${pad2(centiseconds)}`;
  return hours > 0 ? `${hours}:${pad2(minutes)}:${msPart}` : `${pad2(minutes)}:${msPart}`;
};

export const formatDeltaMs = (deltaMs: number | null): string => {
  if (deltaMs === null || deltaMs === undefined || isNaN(deltaMs)) return '—';
  if (deltaMs === 0) return `±${formatMs(0)}`;
  const sign = deltaMs > 0 ? '+' : '-';
  return `${sign}${formatMs(Math.abs(deltaMs))}`;
};

export const defaultSessionName = (startEpochMs: number, runId: number | null): string => {
  const d = new Date(startEpochMs);
  const datePart = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  const timePart = `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  const base = `Session — ${datePart} ${timePart}`;
  return runId !== null ? `${base} — Run ${runId}` : base;
};

export const slugifySessionName = (name: string): string => {
  const slug = (name || '')
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return slug.slice(0, 40) || 'session';
};

export const escapeCsvCell = (value: string | number | boolean | null | undefined): string => {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str === '') return '';
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

export const isLapStore = (value: unknown): value is LapStore => {
  if (!value || typeof value !== 'object') return false;
  const v = value as Partial<LapStore>;
  if (v.schemaVersion !== LAP_STORE_SCHEMA_VERSION) return false;
  if (!Array.isArray(v.sessions)) return false;
  if (v.activeSessionId !== null && typeof v.activeSessionId !== 'string') return false;
  return v.sessions.every(isLapSession);
};

const isLapSession = (s: unknown): s is LapSession => {
  if (!s || typeof s !== 'object') return false;
  const v = s as Partial<LapSession>;
  return (
    typeof v.id === 'string' &&
    typeof v.name === 'string' &&
    typeof v.sessionStartEpochMs === 'number' &&
    (v.runIdAtSessionStart === null || typeof v.runIdAtSessionStart === 'number') &&
    Array.isArray(v.laps) &&
    typeof v.isRunning === 'boolean' &&
    typeof v.isPaused === 'boolean' &&
    (v.currentLapStartEpochMs === null || typeof v.currentLapStartEpochMs === 'number') &&
    typeof v.currentLapAccumulatedMs === 'number' &&
    v.laps.every(isLap)
  );
};

const isLap = (l: unknown): l is Lap => {
  if (!l || typeof l !== 'object') return false;
  const v = l as Partial<Lap>;
  return (
    typeof v.number === 'number' &&
    typeof v.startEpochMs === 'number' &&
    typeof v.endEpochMs === 'number' &&
    typeof v.durationMs === 'number' &&
    (v.runId === null || typeof v.runId === 'number') &&
    !!v.stats &&
    typeof v.stats === 'object'
  );
};
