import { ComponentFixture, TestBed } from '@angular/core/testing';
import QuickViewChipComponent from './quick-view-chip.component';

// Presentational component: drive it through its inputs and assert the rendered DOM.
// Zoneless change detection is registered globally in src/test-setup.ts.
describe('QuickViewChipComponent', () => {
  let fixture: ComponentFixture<QuickViewChipComponent>;

  const el = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const text = (selector: string): string => el().querySelector(selector)?.textContent?.trim() ?? '';
  const set = (inputs: Record<string, unknown>) => {
    Object.entries(inputs).forEach(([key, value]) => fixture.componentRef.setInput(key, value));
    fixture.detectChanges();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QuickViewChipComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(QuickViewChipComponent);
    fixture.componentRef.setInput('label', 'Pack Voltage');
    fixture.detectChanges();
  });

  it('shows the label and a placeholder until a value arrives', () => {
    expect(text('.label')).toBe('Pack Voltage');
    expect(text('.value')).toBe('–');
  });

  it('formats a numeric value to the given precision, with its unit', () => {
    set({ value: 412.345, precision: 1, unit: 'V' });

    expect(text('.value')).toBe('412.3');
    expect(text('.unit')).toBe('V');
  });

  it('shows the placeholder for a non-finite number', () => {
    set({ value: NaN });

    expect(text('.value')).toBe('–');
  });

  it('shows a text value as is', () => {
    set({ value: 'CHARGING' });

    expect(text('.value')).toBe('CHARGING');
  });

  it('renders the detail line only when given', () => {
    expect(el().querySelector('.detail')).toBeNull();

    set({ detail: 'Cell 4 | Chip B' });

    expect(text('.detail')).toBe('Cell 4 | Chip B');
  });

  it('renders a labelled status dot only when given a status', () => {
    expect(el().querySelector('.dot')).toBeNull();

    set({ status: 'fault', statusLabel: 'Charger fault' });

    const dot = el().querySelector('.dot')!;
    expect(dot.getAttribute('role')).toBe('img');
    expect(dot.getAttribute('aria-label')).toBe('Charger fault');
    expect(dot.classList).toContain('fault');
  });
});
