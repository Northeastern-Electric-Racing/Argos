import { ComponentFixture, TestBed } from '@angular/core/testing';
import LapTimerService from 'src/services/lap-timer.service';
import LapsTableComponent from './laps-table.component';

describe('LapsTableComponent', () => {
  let fixture: ComponentFixture<LapsTableComponent>;
  let timer: LapTimerService;

  beforeEach(async () => {
    localStorage.clear();
    fixture = TestBed.createComponent(LapsTableComponent);
    timer = TestBed.inject(LapTimerService);
    fixture.autoDetectChanges();
    await fixture.whenStable();
  });

  // Spec files in one worker share window (Vitest runs with isolate: false): leave storage empty.
  afterEach(() => {
    timer.clearAllSessions();
    localStorage.clear();
  });

  /** Three laps of 80s, 70s and 90s. */
  async function recordLaps(): Promise<void> {
    let clock = Date.parse('2026-01-15T12:00:00Z');
    const at = vi.spyOn(Date, 'now').mockImplementation(() => clock);
    timer.start();
    for (const seconds of [80, 70, 90]) {
      clock += seconds * 1000;
      timer.lap();
    }
    timer.pause();
    at.mockRestore();
    await fixture.whenStable();
  }
  const text = (el: Element) => el.textContent?.replace(/\s+/g, ' ').trim();
  /** What a screen reader reads: the text without aria-hidden parts (the flag icon's ligature). */
  const spoken = (el: Element) => {
    const copy = el.cloneNode(true) as Element;
    copy.querySelectorAll('[aria-hidden="true"]').forEach((e) => e.remove());
    return text(copy);
  };
  const rows = () => Array.from<HTMLTableRowElement>(fixture.nativeElement.querySelectorAll('tbody tr'));

  it('says so when there is no session, then when the session has no laps yet', async () => {
    expect(text(fixture.nativeElement)).toContain('No active session');
    timer.createSession('Practice');
    await fixture.whenStable();
    expect(text(fixture.nativeElement)).toContain('Hit Start then Lap to begin recording');
  });

  it('lists the columns of #909 and 814', async () => {
    await recordLaps();
    const headers = Array.from<HTMLElement>(fixture.nativeElement.querySelectorAll('thead th')).map(text);
    expect(headers).toEqual([
      '#',
      'Duration',
      'Δ Best',
      'Time of Day',
      'Started At',
      'Run',
      'Avg Speed',
      'Energy',
      'Max Temp'
    ]);
  });

  it('lists the newest lap first, with each lap’s delta to the best and the best one named for screen readers', async () => {
    await recordLaps();
    expect(rows().map((r) => text(r.cells[0]))).toEqual(['3', '2', '1']);
    expect(rows().map((r) => text(r.cells[1]))).toEqual(['01:30.00', '01:10.00', '01:20.00']);
    expect(text(rows()[0].cells[2])).toBe('+00:20.00');
    expect(spoken(rows()[1].cells[2])).toBe('Best lap —');
    expect(text(rows()[2].cells[2])).toBe('+00:10.00');
  });
});
