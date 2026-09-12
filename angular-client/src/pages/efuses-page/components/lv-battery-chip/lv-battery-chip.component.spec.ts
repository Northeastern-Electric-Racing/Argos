import { ComponentFixture, TestBed } from '@angular/core/testing';
import LvBatteryChipComponent from './lv-battery-chip.component';

// Presentational component: drive it through its inputs and assert the rendered DOM,
// so the tests cover external behavior rather than internal signals. Zoneless change
// detection is registered globally in src/test-setup.ts.
describe('LvBatteryChipComponent', () => {
  let fixture: ComponentFixture<LvBatteryChipComponent>;

  const text = (selector: string): string =>
    (fixture.nativeElement as HTMLElement).querySelector(selector)?.textContent?.trim() ?? '';

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LvBatteryChipComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(LvBatteryChipComponent);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('shows a placeholder until a voltage arrives', () => {
    // voltage input defaults to undefined
    expect(text('.value')).toBe('–');
  });

  it('formats the voltage to two decimals', () => {
    fixture.componentRef.setInput('voltage', 24.5);
    fixture.detectChanges();

    expect(text('.value')).toBe('24.50');
  });

  it('shows the placeholder for a non-finite voltage', () => {
    fixture.componentRef.setInput('voltage', NaN);
    fixture.detectChanges();

    expect(text('.value')).toBe('–');
  });

  it('labels the status dot for accessibility, driven by the fault flag', () => {
    const dot = (): HTMLElement => (fixture.nativeElement as HTMLElement).querySelector('.dot')!;

    expect(dot().getAttribute('aria-label')).toBe('LV battery nominal');

    fixture.componentRef.setInput('faulted', true);
    fixture.detectChanges();

    expect(dot().getAttribute('aria-label')).toBe('LV battery fault');
  });
});
