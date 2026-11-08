import { ICON_SIZES, iconClasses } from './icon';
import { spinnerClass } from './spinner';

describe('spinner and icon recipes', () => {
  it('draws the spinner arc in the accent token and spins it', () => {
    expect(spinnerClass.split(/\s+/)).toEqual(expect.arrayContaining(['animate-spin', 'border-t-accent']));
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
