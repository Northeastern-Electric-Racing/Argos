import { ApplicationRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import LapTimerService from 'src/services/lap-timer.service';
import TimerHeroComponent from './timer-hero.component';

describe('TimerHeroComponent', () => {
  let fixture: ComponentFixture<TimerHeroComponent>;

  const actionButton = (label: string) =>
    Array.from((fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('.hero-actions button')).find(
      (b) => b.textContent?.trim() === label
    );

  const press = async (label: string) => {
    const button = actionButton(label)!;
    button.focus();
    button.click();
    await TestBed.inject(ApplicationRef).whenStable();
  };

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({ imports: [TimerHeroComponent] }).compileComponents();
    fixture = TestBed.createComponent(TimerHeroComponent);
    document.body.appendChild(fixture.nativeElement);
    await fixture.whenStable();
  });

  afterEach(() => {
    TestBed.inject(LapTimerService).reset();
    fixture.nativeElement.remove();
    localStorage.clear();
  });

  it('keeps focus in the timer actions when Start swaps them for Pause, Lap and Stop', async () => {
    await press('Start');
    expect(document.activeElement).toBe(actionButton('Pause'));
  });

  it('keeps focus in the timer actions when Stop swaps them for Resume and Reset', async () => {
    await press('Start');
    await press('Stop');
    expect(document.activeElement).toBe(actionButton('Resume'));
  });
});
