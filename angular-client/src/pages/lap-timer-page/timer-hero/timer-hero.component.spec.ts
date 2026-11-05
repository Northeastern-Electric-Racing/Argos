import { ComponentFixture, TestBed } from '@angular/core/testing';
import LapTimerService from 'src/services/lap-timer.service';
import { ConfirmOptions, ConfirmService } from 'src/ui/confirm/confirm.service';
import TimerHeroComponent from './timer-hero.component';

describe('TimerHeroComponent', () => {
  let fixture: ComponentFixture<TimerHeroComponent>;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({ imports: [TimerHeroComponent] }).compileComponents();
    fixture = TestBed.createComponent(TimerHeroComponent);
    document.body.appendChild(fixture.nativeElement);
    fixture.autoDetectChanges();
    await fixture.whenStable();
  });

  afterEach(() => {
    TestBed.inject(LapTimerService).reset();
    fixture.nativeElement.remove();
  });

  const button = (label: string): HTMLButtonElement =>
    Array.from<HTMLButtonElement>(
      fixture.nativeElement.querySelectorAll('[role="group"][aria-label="Timer controls"] button')
    ).find((b) => b.textContent?.trim() === label)!;
  const press = async (label: string) => {
    const b = button(label);
    b.focus();
    b.click();
    await fixture.whenStable();
  };
  const focusedLabel = () => document.activeElement?.textContent?.trim();

  it('moves focus to the next action when Start swaps the buttons', async () => {
    await press('Start');
    expect(focusedLabel()).toBe('Pause');
  });

  it('moves focus to Resume after Stop, instead of dropping it to the page', async () => {
    await press('Start');
    await press('Stop');
    expect(document.activeElement).not.toBe(document.body);
    expect(focusedLabel()).toBe('Resume');
  });

  it('keeps focus on Lap, which does not change the actions', async () => {
    await press('Start');
    await press('Lap');
    expect(focusedLabel()).toBe('Lap');
  });

  it('moves focus to Start after Reset is confirmed, with no ring when the confirm was clicked', async () => {
    let clock = Date.now();
    vi.spyOn(Date, 'now').mockImplementation(() => (clock += 1000));
    const confirm = vi.spyOn(TestBed.inject(ConfirmService), 'confirm').mockReturnValue(undefined);
    await press('Start');
    await press('Pause');
    await press('Reset');
    const [[options]] = confirm.mock.calls as [[ConfirmOptions]];
    const focus = vi.spyOn(HTMLElement.prototype, 'focus');
    document.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, buttons: 1, detail: 1 }));
    options.accept?.();
    await fixture.whenStable();
    expect(focusedLabel()).toBe('Start');
    expect(focus).toHaveBeenLastCalledWith(expect.objectContaining({ focusVisible: false }));
    vi.restoreAllMocks();
  });
});
