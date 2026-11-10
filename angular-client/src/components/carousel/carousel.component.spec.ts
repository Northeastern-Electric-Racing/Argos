import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { Mock } from 'vitest';
import { Run } from 'src/utils/types.utils';
import { CarouselComponent } from './carousel.component';

const run = (id: number): Run =>
  ({ id, driverName: `Driver ${id}`, locationName: `Track ${id}`, time: new Date(2026, 0, id) }) as unknown as Run;

describe('CarouselComponent', () => {
  let fixture: ComponentFixture<CarouselComponent>;
  let close: Mock;
  let selectRun: Mock;
  let reducedMotion = false;

  const create = async (runs: Run[]) => {
    close = vi.fn();
    selectRun = vi.fn();
    vi.stubGlobal('matchMedia', (q: string) => ({ matches: reducedMotion && q.includes('reduce'), media: q }));
    await TestBed.configureTestingModule({
      imports: [CarouselComponent],
      providers: [
        provideRouter([]),
        { provide: DialogRef, useValue: { close } },
        { provide: DIALOG_DATA, useValue: { runs, selectRun } }
      ]
    }).compileComponents();
    fixture = TestBed.createComponent(CarouselComponent);
    fixture.detectChanges();
  };

  beforeEach(() => {
    vi.useFakeTimers();
    reducedMotion = false;
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  const el = (): HTMLElement => fixture.nativeElement;
  const slide = () => el().querySelector<HTMLElement>('[aria-roledescription="slide"]')!;
  const button = (name: string) => el().querySelector<HTMLButtonElement>(`button[aria-label="${name}"]`)!;
  const tick = (ms: number) => {
    vi.advanceTimersByTime(ms);
    fixture.detectChanges();
  };

  it('shows one run at a time, labelled by its position', async () => {
    await create([run(1), run(2), run(3)]);
    expect(el().querySelectorAll('[aria-roledescription="slide"]').length).toBe(1);
    expect(slide().getAttribute('aria-label')).toBe('1 of 3');
    expect(slide().textContent).toContain('Run #1');
    expect(slide().textContent).toContain('Driver 1');
    expect(slide().textContent).toContain('Track 1');
  });

  it('wraps around in both directions, one run per step', async () => {
    await create([run(1), run(2), run(3)]);
    button('Previous run').click();
    fixture.detectChanges();
    expect(slide().textContent).toContain('Run #3');
    button('Next run').click();
    fixture.detectChanges();
    expect(slide().textContent).toContain('Run #1');
  });

  it('advances every 3000 ms, wrapping after the last run', async () => {
    await create([run(1), run(2)]);
    tick(2999);
    expect(slide().textContent).toContain('Run #1');
    tick(1);
    expect(slide().textContent).toContain('Run #2');
    tick(3000);
    expect(slide().textContent).toContain('Run #1');
  });

  it('pauses while the pointer is over it, and announces the slide while paused', async () => {
    await create([run(1), run(2)]);
    const region = el().querySelector<HTMLElement>('[aria-roledescription="carousel"]')!;
    expect(slide().getAttribute('aria-live')).toBe('off');
    region.dispatchEvent(new MouseEvent('mouseenter'));
    tick(6000);
    expect(slide().textContent).toContain('Run #1');
    expect(slide().getAttribute('aria-live')).toBe('polite');
    region.dispatchEvent(new MouseEvent('mouseleave'));
    tick(3000);
    expect(slide().textContent).toContain('Run #2');
  });

  it('pauses while keyboard focus is inside', async () => {
    await create([run(1), run(2)]);
    const next = button('Next run');
    vi.spyOn(next, 'matches').mockImplementation((s: string) => s === ':focus-visible');
    next.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    tick(6000);
    expect(slide().textContent).toContain('Run #1');
  });

  it('starts stopped under reduced motion, and the stop/start control toggles rotation', async () => {
    reducedMotion = true;
    await create([run(1), run(2)]);
    const toggle = () => el().querySelector<HTMLButtonElement>('button[aria-label$="automatic slide show"]')!;
    expect(toggle().getAttribute('aria-label')).toBe('Start automatic slide show');
    tick(6000);
    expect(slide().textContent).toContain('Run #1');
    toggle().click();
    fixture.detectChanges();
    expect(toggle().getAttribute('aria-label')).toBe('Stop automatic slide show');
    tick(3000);
    expect(slide().textContent).toContain('Run #2');
  });

  it('jumps to a run from its indicator, marking it current', async () => {
    await create([run(1), run(2), run(3)]);
    button('Show run 3').click();
    fixture.detectChanges();
    expect(slide().textContent).toContain('Run #3');
    expect(button('Show run 3').getAttribute('aria-current')).toBe('true');
    expect(button('Show run 1').getAttribute('aria-current')).toBe('false');
  });

  it('selects the shown run and closes the dialog', async () => {
    await create([run(1), run(2)]);
    button('Next run').click();
    fixture.detectChanges();
    const select = [...el().querySelectorAll('button')].find((b) => b.textContent?.includes('Select this Run'))!;
    select.click();
    expect(close).toHaveBeenCalled();
    expect(selectRun).toHaveBeenCalledWith(expect.objectContaining({ id: 2 }));
  });

  it('says so when there are no runs', async () => {
    await create([]);
    expect(el().textContent).toContain('No runs yet');
    tick(3000);
  });
});
