import { signal, WritableSignal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { QuickViewReadout, QuickViewStatus } from 'src/services/quick-view.service';
import QuickViewReadoutComponent from './quick-view-readout.component';

// Presentational: drive it through the readout descriptor and assert the rendered DOM.
describe('QuickViewReadoutComponent', () => {
  let fixture: ComponentFixture<QuickViewReadoutComponent>;
  let value: WritableSignal<number | string | undefined>;

  const el = (selector: string): HTMLElement | null => (fixture.nativeElement as HTMLElement).querySelector(selector);
  const text = (selector: string): string => el(selector)?.textContent?.trim() ?? '';

  const render = (readout: Partial<QuickViewReadout>) => {
    fixture = TestBed.createComponent(QuickViewReadoutComponent);
    fixture.componentRef.setInput('readout', { label: 'Pack Voltage', value, ...readout });
    fixture.detectChanges();
  };

  beforeEach(() => {
    value = signal<number | string | undefined>(undefined);
  });

  it('shows the label, and a placeholder until a value arrives', () => {
    render({});

    expect(text('.subtitle')).toBe('Pack Voltage');
    expect(text('.value')).toBe('–');
  });

  it('formats a numeric value to the readout’s decimals, with its unit', () => {
    render({ decimals: 1, unit: 'V' });

    value.set(402.345);
    fixture.detectChanges();

    expect(text('.value')).toBe('402.3');
    expect(text('.unit')).toBe('V');
  });

  it('shows the placeholder for a non-finite number', () => {
    render({ decimals: 1 });

    value.set(NaN);
    fixture.detectChanges();

    expect(text('.value')).toBe('–');
  });

  it('shows a string value as-is', () => {
    render({});

    value.set('CHARGING');
    fixture.detectChanges();

    expect(text('.value')).toBe('CHARGING');
  });

  it('renders the optional detail line', () => {
    render({ detail: signal('Cell 4 | Chip A') });

    expect(text('.detail')).toBe('Cell 4 | Chip A');
  });

  it('labels the status dot so state is not conveyed by color alone', () => {
    const status = signal<QuickViewStatus | undefined>({ color: 'red', label: 'Fault active' });
    render({ status });

    expect(el('.dot')?.getAttribute('aria-label')).toBe('Fault active');
  });

  it('omits the dot, unit and detail when the readout has none', () => {
    render({});

    expect(el('.dot')).toBeNull();
    expect(el('.unit')).toBeNull();
    expect(el('.detail')).toBeNull();
  });
});
