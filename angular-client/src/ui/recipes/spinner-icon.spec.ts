import { ICON_SIZES, iconClasses } from './icon';
import { SPINNER_SIZES, spinnerClass } from './spinner';

describe('spinner and icon recipes', () => {
  it('draws the spinner arc in the accent token and spins it, at every size', () => {
    for (const s of SPINNER_SIZES)
      expect(spinnerClass(s).split(/\s+/)).toEqual(expect.arrayContaining(['animate-spin', 'border-t-accent']));
  });

  it("sizes the page spinner at develop's 100px and the table mask's at 32px, as PrimeNG's table loader", () => {
    expect(spinnerClass().split(/\s+/)).toContain('size-25');
    expect(spinnerClass('sm').split(/\s+/)).toContain('size-8');
  });

  it('sizes every icon box and font with plain utilities (ui-icon is ours, so no important modifier)', () => {
    for (const s of ICON_SIZES.filter((size) => size !== 'inline')) {
      const c = iconClasses[s].split(/\s+/);
      expect(c.some((x) => /^size-[\d.]+$/.test(x))).toBe(true);
      expect(c.some((x) => /^text-\[\d+px\]$/.test(x))).toBe(true);
    }
    expect(Object.values(iconClasses).join(' ')).not.toContain('!');
  });
});
