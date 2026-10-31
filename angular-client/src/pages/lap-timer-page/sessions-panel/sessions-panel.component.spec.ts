import { computed, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import LapTimerService from 'src/services/lap-timer.service';
import { ConfirmService } from 'src/services/confirm.service';
import { ToastService } from 'src/services/toast.service';
import { LapSession } from 'src/utils/lap-timer.types';
import SessionsPanelComponent from './sessions-panel.component';

const session = (id: string, name: string): LapSession => ({
  id,
  name,
  sessionStartEpochMs: 0,
  runIdAtSessionStart: null,
  laps: [],
  isRunning: false,
  isPaused: false,
  currentLapStartEpochMs: null,
  currentLapAccumulatedMs: 0
});

describe('SessionsPanelComponent', () => {
  let fixture: ComponentFixture<SessionsPanelComponent>;
  const activeId = signal('a');
  const sessions = signal([session('a', 'Morning'), session('b', 'Afternoon')]);
  const timer = {
    sessions,
    activeSession: computed(() => sessions().find((s) => s.id === activeId()) ?? null),
    isIdle: signal(true),
    getBestLapMs: () => null,
    selectSession: vi.fn((id: string) => activeId.set(id))
  };

  beforeEach(async () => {
    activeId.set('a');
    timer.selectSession.mockClear();
    await TestBed.configureTestingModule({
      imports: [SessionsPanelComponent],
      providers: [
        { provide: LapTimerService, useValue: timer },
        { provide: ConfirmService, useValue: { confirm: vi.fn() } },
        { provide: ToastService, useValue: { add: vi.fn() } }
      ]
    }).compileComponents();
    fixture = TestBed.createComponent(SessionsPanelComponent);
    fixture.detectChanges();
  });

  const el = (): HTMLElement => fixture.nativeElement;
  const selectButtons = () => Array.from(el().querySelectorAll('td.col-name button') as NodeListOf<HTMLButtonElement>);

  it('keeps table rows as rows, with no interactive role holding the actions button', () => {
    const rows = Array.from(el().querySelectorAll('tr.session-row'));
    expect(rows).toHaveLength(2);
    expect(rows.every((row) => row.getAttribute('role') === 'row' && !row.hasAttribute('tabindex'))).toBe(true);
  });

  it('selects a session from the button on its name, which marks the active one', () => {
    expect(selectButtons().map((b) => [b.textContent?.trim(), b.getAttribute('aria-current')])).toEqual([
      ['Morning', 'true'],
      ['Afternoon', null]
    ]);

    selectButtons()[1].click();
    fixture.detectChanges();

    expect(timer.selectSession).toHaveBeenCalledExactlyOnceWith('b');
    expect(selectButtons()[1].getAttribute('aria-current')).toBe('true');
  });

  it('still selects a session when its row is clicked', () => {
    (el().querySelectorAll('tr.session-row')[1] as HTMLElement).click();
    expect(timer.selectSession).toHaveBeenCalledExactlyOnceWith('b');
  });
});
