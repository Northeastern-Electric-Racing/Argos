import { TestBed } from '@angular/core/testing';
import TypographyComponent from './typography.component';

describe('TypographyComponent', () => {
  const render = (inputs: Record<string, unknown>) => {
    const fixture = TestBed.createComponent(TypographyComponent);
    for (const [name, value] of Object.entries(inputs)) fixture.componentRef.setInput(name, value);
    fixture.detectChanges();
    return fixture.nativeElement.querySelector('p') as HTMLParagraphElement;
  };

  it('renders its content in a paragraph styled by the variant', () => {
    const p = render({ variant: 'info-value', content: '42' });
    expect(p.textContent).toBe('42');
    expect(p.classList).toContain('text-2xl');
    expect(p.classList).toContain('font-bold');
  });

  it('applies textClass on top, replacing the variant classes it overrides', () => {
    const p = render({ variant: 'info-value', content: 'N/A', textClass: 'text-xs text-fg-muted' });
    expect(p.classList).toContain('text-xs');
    expect(p.classList).toContain('text-fg-muted');
    expect(p.classList).not.toContain('text-2xl');
    expect(p.classList).not.toContain('text-fg');
  });

  it('keeps additionalStyles as inline style for unmigrated callers', () => {
    const p = render({ variant: 'header', content: 'x', additionalStyles: 'margin: 0px; color: red' });
    expect(p.style.margin).toBe('0px');
    expect(p.style.color).toBe('red');
  });

  // 814 parity (plan 2.2): Theme wrote these variants' size as `fontSize:`, which Angular's style binding sorts
  // after a caller's `font-size:`, so that override never applied. Keep rendering what 814 rendered.
  it('ignores a dash-case font-size override on the variants whose 814 size won over it', () => {
    const p = render({ variant: 'subheader', content: 'Old', additionalStyles: 'font-size:20px; padding-top: 5px' });
    expect(p.style.fontSize).toBe('');
    expect(p.style.paddingTop).toBe('5px');
  });

  it('applies a camelCase fontSize override, and a font-size one on the other variants', () => {
    expect(render({ variant: 'header', content: 'x', additionalStyles: 'fontSize: 36px' }).style.fontSize).toBe('36px');
    expect(render({ variant: 'info-unit', content: 'x', additionalStyles: 'font-size:15px;' }).style.fontSize).toBe('15px');
  });

  it('has no inline style of its own', () => {
    expect(render({ variant: 'header', content: 'x' }).getAttribute('style') ?? '').toBe('');
  });
});
