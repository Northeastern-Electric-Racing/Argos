import { ICON_SIZES, iconClasses } from './icon';
import { spinnerClass } from './spinner';

describe('spinner and icon recipes', () => {
  it('draws the spinner arc in the accent token and spins it', () => {
    expect(spinnerClass.split(/\s+/)).toEqual(expect.arrayContaining(['animate-spin', 'border-t-accent']));
  });

  it('sizes every icon box and font with the important modifier, the only place it is allowed', () => {
    for (const s of ICON_SIZES) {
      const c = iconClasses[s].split(/\s+/);
      expect(c.some((x) => x.startsWith('size-') && x.endsWith('!'))).toBe(true);
      expect(c.some((x) => x.startsWith('text-') && x.endsWith('!'))).toBe(true);
    }
  });
});
