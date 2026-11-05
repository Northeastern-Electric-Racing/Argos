import { StyleVariant } from 'src/utils/style-variant';
import { TYPOGRAPHY_VARIANTS, typographyClass } from './typography';

const classSet = (classes: string) => new Set(classes.split(' ').filter(Boolean));

describe('typographyClass', () => {
  it('maps every variant to a complete class list on the font and token colours', () => {
    for (const variant of TYPOGRAPHY_VARIANTS) {
      const classes = classSet(typographyClass(variant));
      expect(classes.has('font-sans'), variant).toBe(true);
      expect(classes.has('select-none'), variant).toBe(true);
      expect(
        [...classes].some((c) => /^text-/.test(c)),
        variant
      ).toBe(true);
    }
  });

  it('keeps the weights and colours the 814 build renders, on the type scale', () => {
    const expected: Partial<Record<StyleVariant, string[]>> = {
      header: ['text-lg', 'font-bold', 'text-fg', 'my-[1em]'],
      'info-subtitle': ['text-ctrl', 'text-fg-label', 'text-center', 'm-0'],
      'info-value': ['text-2xl', 'font-bold', 'text-fg', 'm-0'],
      'info-unit': ['text-title', 'text-fg-muted', 'pt-5.5'],
      'large-header': ['text-xl', 'font-bold', 'text-fg'],
      subheader: ['text-base', 'text-fg', 'my-[1em]']
    };
    for (const [variant, classes] of Object.entries(expected)) {
      const actual = classSet(typographyClass(variant as StyleVariant));
      for (const c of classes) expect(actual.has(c), `${variant} has ${c}`).toBe(true);
    }
  });

  it('sizes every variant from a type token, never an arbitrary value', () => {
    for (const variant of TYPOGRAPHY_VARIANTS)
      expect(
        [...classSet(typographyClass(variant))].filter((c) => /^text-\[/.test(c)),
        variant
      ).toEqual([]);
  });

  it('still recognises an arbitrary size in extra classes as a size override', () => {
    expect(classSet(typographyClass('header', 'text-[36px]')).has('text-lg')).toBe(false);
  });

  it('gives muted headers the muted text token, never a grey below AA', () => {
    expect(classSet(typographyClass('secondary-header')).has('text-fg-muted')).toBe(true);
    expect(classSet(typographyClass('large-secondary-header')).has('text-fg-muted')).toBe(true);
  });

  it('leaves the colour to the parent for sidebar labels', () => {
    expect([...classSet(typographyClass('sidebar-label'))].filter((c) => /^text-(fg|accent)/.test(c))).toEqual([]);
  });

  it('lets extra classes replace the variant classes they override, and keeps the rest', () => {
    const classes = classSet(typographyClass('header', 'text-xl text-inherit m-0 text-left'));
    expect(classes.has('text-lg')).toBe(false);
    expect(classes.has('text-fg')).toBe(false);
    expect(classes.has('my-[1em]')).toBe(false);
    expect(classes.has('font-bold')).toBe(true);
    for (const c of ['text-xl', 'text-inherit', 'm-0', 'text-left']) expect(classes.has(c)).toBe(true);
  });

  it('treats the readout step as a size, so it replaces the variant size (the nav clock and "Run #N")', () => {
    const classes = classSet(typographyClass('large-header', 'text-readout'));
    expect(classes.has('text-xl')).toBe(false);
    expect(classes.has('text-readout')).toBe(true);
    expect(classes.has('text-fg')).toBe(true);
  });

  it('keeps variant classes when extra classes only add a responsive or state variant', () => {
    const classes = classSet(typographyClass('info-value', 'max-md:text-lg'));
    expect(classes.has('text-2xl')).toBe(true);
    expect(classes.has('max-md:text-lg')).toBe(true);
  });
});
