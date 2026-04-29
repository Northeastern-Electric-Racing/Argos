import { TestBed } from '@angular/core/testing';
import { BehaviorSubject, Subject } from 'rxjs';
import { LAP_STORE_STORAGE_KEY } from 'src/utils/lap-timer.types';
import { DataValue } from 'src/utils/socket.utils';
import Storage from './storage.service';
import LapTimerService, { TIME_PROVIDER } from './lap-timer.service';

// Hardcoded to dodge `bms.utils` ↔ `topic.utils` cycle in karma; must match topic.utils.
const TOPIC_SPEED = 'VCU/CarState/speed';
const TOPIC_MOTOR_TEMP = 'DTI/Temps/Motor_Temperature';
const TOPIC_SOC = 'BMS/Pack/SOC';

class FakeStorage {
  private currentRunId = new BehaviorSubject<number | undefined>(undefined);
  private streams = new Map<string, Subject<DataValue>>();

  get(key: string): Subject<DataValue> {
    let s = this.streams.get(key);
    if (!s) {
      s = new Subject<DataValue>();
      this.streams.set(key, s);
    }
    return s;
  }

  addValue(key: string, value: DataValue): void {
    this.get(key).next(value);
  }

  getCurrentRunId(): BehaviorSubject<number | undefined> {
    return this.currentRunId;
  }

  setCurrentRunId(runId?: number): void {
    this.currentRunId.next(runId);
  }
}

const dataValue = (n: number, unit = ''): DataValue => ({
  values: [String(n)],
  time: '0',
  unit
});

describe('LapTimerService', () => {
  let now = 0;
  let fakeStorage: FakeStorage;

  function makeService(): LapTimerService {
    return TestBed.inject(LapTimerService);
  }

  function reset(initialNow = 0): LapTimerService {
    now = initialNow;
    fakeStorage = new FakeStorage();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        LapTimerService,
        { provide: Storage, useValue: fakeStorage },
        { provide: TIME_PROVIDER, useValue: () => now }
      ]
    });
    return makeService();
  }

  beforeEach(() => {
    localStorage.removeItem(LAP_STORE_STORAGE_KEY);
  });

  afterEach(() => {
    localStorage.removeItem(LAP_STORE_STORAGE_KEY);
  });

  it('should be created with an empty store', () => {
    const svc = reset();
    expect(svc).toBeTruthy();
    expect(svc.sessions().length).toBe(0);
    expect(svc.activeSession()).toBeNull();
    expect(svc.state()).toBe('idle');
  });

  it('start() with no active session implicitly creates one and tags runIdAtSessionStart', () => {
    const svc = reset();
    fakeStorage.setCurrentRunId(7);
    now = 1000;
    svc.start();
    const s = svc.activeSession();
    expect(s).not.toBeNull();
    expect(s!.runIdAtSessionStart).toBe(7);
    expect(s!.isRunning).toBeTrue();
    expect(s!.laps).toEqual([]);
  });

  it('lap() captures duration, per-lap runId, startEpochMs == previous lap endEpochMs', () => {
    const svc = reset();
    fakeStorage.setCurrentRunId(3);
    now = 1000;
    svc.start();
    now = 6000;
    svc.lap();
    now = 11000;
    svc.lap();

    const laps = svc.laps();
    expect(laps.length).toBe(2);
    expect(laps[0].durationMs).toBe(5000);
    expect(laps[0].startEpochMs).toBe(1000);
    expect(laps[0].endEpochMs).toBe(6000);
    expect(laps[0].runId).toBe(3);
    expect(laps[1].startEpochMs).toBe(6000);
    expect(laps[1].endEpochMs).toBe(11000);
    expect(laps[1].durationMs).toBe(5000);
  });

  it('pause() then resume() does not count paused interval', () => {
    const svc = reset();
    now = 0;
    svc.start();
    now = 3000;
    svc.pause();
    now = 10000;
    svc.resume();
    now = 12000;
    svc.lap();

    const lap = svc.laps()[0];
    expect(lap.durationMs).toBe(5000);
  });

  it('stop() flushes a partial in-progress lap and pauses the session', () => {
    const svc = reset();
    now = 0;
    svc.start();
    now = 4000;
    svc.stop();

    expect(svc.laps().length).toBe(1);
    expect(svc.laps()[0].durationMs).toBe(4000);
    expect(svc.isRunning()).toBeFalse();
    expect(svc.isPaused()).toBeTrue();
    expect(svc.activeSession()).not.toBeNull();
  });

  it('reset() clears active session laps and elapsed but keeps the session entity', () => {
    const svc = reset();
    now = 0;
    svc.start();
    now = 5000;
    svc.lap();

    svc.reset();

    const s = svc.activeSession();
    expect(s).not.toBeNull();
    expect(s!.laps).toEqual([]);
    expect(s!.isRunning).toBeFalse();
    expect(svc.totalTimeMs()).toBe(0);
  });

  it('createSession() while another is running pauses the prior session and makes the new one active', () => {
    const svc = reset();
    now = 0;
    svc.start();
    const firstId = svc.activeSession()!.id;
    now = 3000;
    svc.lap();
    const secondId = svc.createSession('Practice 2');

    expect(secondId).not.toBe(firstId);
    expect(svc.activeSession()!.id).toBe(secondId);
    expect(svc.activeSession()!.name).toBe('Practice 2');

    const prior = svc.sessions().find((s) => s.id === firstId)!;
    expect(prior.isRunning).toBeFalse();
    expect(prior.isPaused).toBeTrue();
    expect(prior.laps.length).toBe(1);
  });

  it('selectSession() switches the active pointer; the prior session retains state', () => {
    const svc = reset();
    now = 0;
    svc.start();
    const a = svc.activeSession()!.id;
    now = 5000;
    svc.lap();
    const b = svc.createSession();
    now = 6000;
    svc.start();
    now = 9000;
    svc.lap();

    svc.selectSession(a);
    expect(svc.activeSession()!.id).toBe(a);
    expect(svc.laps().length).toBe(1);

    svc.selectSession(b);
    expect(svc.activeSession()!.id).toBe(b);
    expect(svc.laps().length).toBe(1);
  });

  it('renameSession() updates the name; empty/whitespace is rejected', () => {
    const svc = reset();
    svc.createSession('Original');
    const id = svc.activeSession()!.id;
    svc.renameSession(id, '  Renamed  ');
    expect(svc.activeSession()!.name).toBe('Renamed');

    svc.renameSession(id, '   ');
    expect(svc.activeSession()!.name).toBe('Renamed');
  });

  it('deleteSession() removes the session; if it was active, activeSessionId becomes null', () => {
    const svc = reset();
    svc.createSession('A');
    const a = svc.activeSession()!.id;
    svc.createSession('B');
    const b = svc.activeSession()!.id;

    svc.deleteSession(a);
    expect(svc.sessions().some((s) => s.id === a)).toBeFalse();
    expect(svc.activeSession()!.id).toBe(b);

    svc.deleteSession(b);
    expect(svc.sessions().length).toBe(0);
    expect(svc.activeSession()).toBeNull();
  });

  it('clearAllSessions() wipes all sessions and the active pointer', () => {
    const svc = reset();
    now = 0;
    svc.start();
    now = 5000; svc.lap();
    svc.createSession();
    svc.createSession();
    expect(svc.sessions().length).toBe(3);

    svc.clearAllSessions();
    expect(svc.sessions().length).toBe(0);
    expect(svc.activeSession()).toBeNull();

    fakeStorage = new FakeStorage();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        LapTimerService,
        { provide: Storage, useValue: fakeStorage },
        { provide: TIME_PROVIDER, useValue: () => now }
      ]
    });
    const svc2 = TestBed.inject(LapTimerService);
    expect(svc2.sessions().length).toBe(0);
  });

  it('endActiveSession() pauses and nulls activeSessionId; session remains in sessions[]', () => {
    const svc = reset();
    now = 0;
    svc.start();
    const id = svc.activeSession()!.id;
    now = 4000;
    svc.endActiveSession();

    expect(svc.activeSession()).toBeNull();
    const s = svc.sessions().find((x) => x.id === id);
    expect(s).toBeTruthy();
    expect(s!.isRunning).toBeFalse();
  });

  it('localStorage round-trip — second service instance hydrates state', () => {
    const svc1 = reset();
    fakeStorage.setCurrentRunId(42);
    now = 1000;
    svc1.start();
    now = 3000;
    svc1.lap();
    const sessionId = svc1.activeSession()!.id;

    fakeStorage = new FakeStorage();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        LapTimerService,
        { provide: Storage, useValue: fakeStorage },
        { provide: TIME_PROVIDER, useValue: () => now }
      ]
    });
    const svc2 = TestBed.inject(LapTimerService);

    expect(svc2.activeSession()!.id).toBe(sessionId);
    expect(svc2.laps()[0].runId).toBe(42);
    expect(svc2.laps()[0].durationMs).toBe(2000);
    expect(svc2.activeSession()!.isRunning).toBeTrue();

    now = 5000;
    expect(svc2.currentLapTimeMs()).toBe(2000);
  });

  it('corrupt JSON in localStorage is dropped silently; empty store on next load', () => {
    localStorage.setItem(LAP_STORE_STORAGE_KEY, '{not json');
    const svc = reset();
    expect(svc.sessions().length).toBe(0);
    expect(localStorage.getItem(LAP_STORE_STORAGE_KEY)).toBeNull();
  });

  it('wrong schemaVersion is dropped silently', () => {
    localStorage.setItem(
      LAP_STORE_STORAGE_KEY,
      JSON.stringify({ schemaVersion: 99, activeSessionId: null, sessions: [] })
    );
    const svc = reset();
    expect(svc.sessions().length).toBe(0);
  });

  it('activeSessionId pointing to a nonexistent session hydrates as null', () => {
    localStorage.setItem(
      LAP_STORE_STORAGE_KEY,
      JSON.stringify({ schemaVersion: 1, activeSessionId: 'ghost', sessions: [] })
    );
    const svc = reset();
    expect(svc.activeSession()).toBeNull();
  });

  it('lap() is a no-op when no active session, when not running, or when zero-duration', () => {
    const svc = reset();

    svc.lap(); // no active session
    expect(svc.laps().length).toBe(0);

    svc.createSession();
    svc.lap(); // active but not running
    expect(svc.laps().length).toBe(0);

    now = 0;
    svc.start();
    svc.lap(); // running but zero duration
    expect(svc.laps().length).toBe(0);

    now = 1;
    svc.lap();
    expect(svc.laps().length).toBe(1);
  });

  it('each lap captures runId at lap-record time, not session start', () => {
    const svc = reset();
    fakeStorage.setCurrentRunId(1);
    now = 0;
    svc.start();
    fakeStorage.setCurrentRunId(2);
    now = 1000;
    svc.lap();
    fakeStorage.setCurrentRunId(3);
    now = 2000;
    svc.lap();

    expect(svc.activeSession()!.runIdAtSessionStart).toBe(1);
    expect(svc.laps()[0].runId).toBe(2);
    expect(svc.laps()[1].runId).toBe(3);
  });

  it('bestLap / worstLap / averageLapTime / deltaFromBest reflect the active session laps', () => {
    const svc = reset();
    now = 0;
    svc.start();
    now = 5000; svc.lap();   // 5000
    now = 13000; svc.lap();  // 8000
    now = 16000; svc.lap();  // 3000

    expect(svc.bestLap()!.durationMs).toBe(3000);
    expect(svc.worstLap()!.durationMs).toBe(8000);
    expect(svc.averageLapTime()).toBeCloseTo((5000 + 8000 + 3000) / 3);
    expect(svc.deltaFromBest(5000)).toBe(2000);
    expect(svc.deltaFromBest(3000)).toBe(0);
  });

  it('LapStats are populated from telemetry: avgSpeed, maxSpeed, energyUsed, maxMotorTemp', () => {
    const svc = reset();
    now = 0;
    svc.start();

    fakeStorage.addValue(TOPIC_SPEED, dataValue(40));
    fakeStorage.addValue(TOPIC_SPEED, dataValue(60));
    fakeStorage.addValue(TOPIC_SOC, dataValue(80));
    fakeStorage.addValue(TOPIC_MOTOR_TEMP, dataValue(60));
    fakeStorage.addValue(TOPIC_MOTOR_TEMP, dataValue(70));
    fakeStorage.addValue(TOPIC_SOC, dataValue(78));

    now = 5000;
    svc.lap();
    const stats = svc.laps()[0].stats;
    expect(stats.avgSpeed).toBeCloseTo(50);
    expect(stats.maxSpeed).toBe(60);
    expect(stats.socStart).toBe(80);
    expect(stats.socEnd).toBe(78);
    expect(stats.energyUsed).toBe(2);
    expect(stats.maxMotorTemp).toBe(70);
  });

  it('buildCsv produces a header row + one row per lap with formatted values', () => {
    const svc = reset();
    fakeStorage.setCurrentRunId(7);
    now = 1745849385000; // arbitrary epoch
    svc.start();
    fakeStorage.addValue(TOPIC_SPEED, dataValue(50));
    fakeStorage.addValue(TOPIC_SOC, dataValue(90));
    fakeStorage.addValue(TOPIC_MOTOR_TEMP, dataValue(65));
    fakeStorage.addValue(TOPIC_SOC, dataValue(88));
    now += 60000;
    svc.lap();
    fakeStorage.addValue(TOPIC_SOC, dataValue(86));
    fakeStorage.addValue(TOPIC_MOTOR_TEMP, dataValue(70));
    now += 58000;
    svc.lap();

    const built = svc.buildCsv();
    expect(built).not.toBeNull();
    const lines = built!.body.trim().split('\r\n');

    expect(lines[0]).toBe('Lap,Duration,+/- Best,Time of Day,Run,Avg Speed (mph),Energy (%),Max Temp (°C)');
    expect(lines.length).toBe(3);

    const lap1 = lines[1].split(',');
    const lap2 = lines[2].split(',');
    expect(lap1[0]).toBe('1');
    expect(lap1[1]).toBe('01:00.00');
    expect(lap1[2]).toBe('+00:02.00');
    expect(lap1[4]).toBe('7');
    expect(lap2[0]).toBe('2');
    expect(lap2[1]).toBe('00:58.00');
    expect(lap2[2]).toBe('');

    expect(built!.filename).toContain('argos-laps-');
    expect(built!.filename.endsWith('.csv')).toBeTrue();
  });
});
