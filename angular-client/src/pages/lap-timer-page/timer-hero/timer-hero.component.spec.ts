import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import LapTimerService from 'src/services/lap-timer.service';
import TimerHeroComponent from './timer-hero.component';

type TimerState = 'none' | 'idle' | 'running' | 'paused';

describe('TimerHeroComponent — action buttons', () => {
  let fixture: ComponentFixture<TimerHeroComponent>;
  const state = signal<TimerState>('none');
  const timerMock = {
    activeSession: () => (state() === 'none' ? null : { id: 's1', name: 'Session 1' }),
    isIdle: () => state() === 'idle',
    isRunning: () => state() === 'running',
    isPaused: () => state() === 'paused',
    lapCount: () => 0,
    laps: () => [],
    currentLapTimeMs: () => 0,
    formattedTotal: () => '00:00.00',
    formattedCurrentLap: () => '00:00.00',
    currentLapDeltaToBestMs: () => null,
    start: vi.fn(),
    pause: vi.fn(),
    lap: vi.fn(),
    stop: vi.fn(),
    resume: vi.fn(),
    reset: vi.fn(),
    deleteSession: vi.fn()
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TimerHeroComponent],
      providers: [{ provide: LapTimerService, useValue: timerMock }]
    }).compileComponents();
    fixture = TestBed.createComponent(TimerHeroComponent);
  });

  function buttonLabels(next: TimerState): string[] {
    state.set(next);
    fixture.detectChanges();
    const buttons: HTMLButtonElement[] = Array.from(fixture.nativeElement.querySelectorAll('.hero-actions button'));
    return buttons.map((b) => b.textContent!.trim());
  }

  it('offers only Start before a session exists', () => {
    expect(buttonLabels('none')).toEqual(['Start']);
  });

  it('offers Start and Delete for an idle session', () => {
    expect(buttonLabels('idle')).toEqual(['Start', 'Delete']);
  });

  it('offers Pause, Lap and Stop while running', () => {
    expect(buttonLabels('running')).toEqual(['Pause', 'Lap', 'Stop']);
  });

  it('offers Resume, Reset, Download and End Session while paused', () => {
    expect(buttonLabels('paused')).toEqual(['Resume', 'Reset', 'Download', 'End Session']);
  });

  it('starts the timer from the Start button', () => {
    buttonLabels('none');
    fixture.nativeElement.querySelector('.hero-actions button').click();
    expect(timerMock.start).toHaveBeenCalled();
  });
});
