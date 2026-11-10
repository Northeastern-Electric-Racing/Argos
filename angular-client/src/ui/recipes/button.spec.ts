import {
  BUTTON_SIZES,
  BUTTON_VARIANTS,
  buttonBaseClass,
  buttonClass,
  buttonSizeClasses,
  buttonVariantClasses,
  ICON_BUTTON_SIZES,
  iconButtonClass
} from './button';

// jsdom runs without Tailwind, so these specs check the recipe's shape: every variant and size maps to a
// complete, literal class list built on the design tokens. How it looks is checked by the audit kit.
describe('button recipe', () => {
  it('has a non-empty class list for every variant and every size', () => {
    for (const v of BUTTON_VARIANTS) expect(buttonVariantClasses[v].trim().length).toBeGreaterThan(0);
    for (const s of BUTTON_SIZES) expect(buttonSizeClasses[s].trim().length).toBeGreaterThan(0);
    expect(Object.keys(buttonVariantClasses).sort()).toEqual([...BUTTON_VARIANTS].sort());
    expect(Object.keys(buttonSizeClasses).sort()).toEqual([...BUTTON_SIZES].sort());
  });

  it.each([
    ['primary', 'bg-accent-strong'],
    ['secondary', 'bg-secondary'],
    ['tonal', 'bg-secondary-soft'],
    ['neutral', 'bg-surface-3'],
    ['text', 'bg-transparent'],
    ['success', 'bg-success'],
    ['warn', 'bg-warn'],
    ['danger', 'text-danger'],
    ['danger-text', 'text-danger']
  ] as const)('builds %s on its token (%s)', (variant, token) => {
    expect(buttonVariantClasses[variant].split(/\s+/)).toContain(token);
  });

  it('never fills a destructive button', () => {
    for (const v of ['danger', 'danger-text'] as const)
      expect(buttonVariantClasses[v].split(/\s+/)).toContain('bg-transparent');
  });

  it('styles the tonal toggle from aria-pressed, as a solid secondary fill', () => {
    expect(buttonVariantClasses.tonal).toContain('aria-pressed:bg-secondary');
  });

  it('gives lg a 44px touch target on phones and every button a keyboard-only focus ring', () => {
    expect(buttonSizeClasses.lg).toMatch(/max-md:min-h-/);
    expect(buttonClass('primary', 'md')).toContain('focus-visible:focus-ring');
  });

  it('keeps lg at the legacy 140x45 footprint at every width, 44px tall on phones, with no hooks', () => {
    const lg = buttonSizeClasses.lg.split(/\s+/);
    expect(lg).toEqual(expect.arrayContaining(['min-h-11.25', 'min-w-35', 'max-md:min-h-11']));
    // pages laid out around the 140px minimum (the lap timer's hero) keep it on phones
    expect(lg.filter((c) => c.startsWith('max-md:min-w') || c.startsWith('max-md:px'))).toEqual([]);
    // the size owns its footprint: no custom-property hook (the legacy button's are gone with its stylesheet)
    for (const s of BUTTON_SIZES) expect(buttonSizeClasses[s]).not.toMatch(/var\(--/);
  });

  it('has an lg-fluid size: lg on wide screens, as wide as its label on phones', () => {
    const fluid = buttonSizeClasses['lg-fluid'].split(/\s+/);
    expect(fluid).toEqual(
      expect.arrayContaining(['min-h-11.25', 'min-w-35', 'max-md:min-h-11', 'max-md:min-w-0', 'max-md:px-3'])
    );
  });

  it('composes the shared base, the variant and the size', () => {
    const c = buttonClass('neutral', 'sm');
    expect(c).toContain(buttonVariantClasses.neutral);
    expect(c).toContain(buttonSizeClasses.sm);
  });

  it('has an icon button for every size, muted until hovered', () => {
    for (const s of ICON_BUTTON_SIZES) expect(iconButtonClass(s)).toContain('text-fg-muted');
    expect(iconButtonClass('sm')).not.toBe(iconButtonClass('md'));
  });

  it('uses no palette colours, arbitrary colours or opacity on text (only theme tokens)', () => {
    const all = [...Object.values(buttonVariantClasses), ...Object.values(buttonSizeClasses), iconButtonClass('md')].join(
      ' '
    );
    expect(all).not.toMatch(/(^|\s)[a-z:-]*(gray|zinc|neutral-\d|red-\d|blue-\d|white|black)\b/);
    expect(all).not.toMatch(/-\[#/);
    expect(all).not.toMatch(/(^|\s|:)text-[a-z-]+\/\d+/);
  });

  it('leaves the footprint to the size, so a consumer can compose the base and a variant with its own size', () => {
    const footprint = /^(gap|min-h|h|w|min-w|p|px|py|rounded|text-(xs|sm|ctrl|ctrl-sm|ctrl-lg|\[))(-|$)/;
    expect(buttonBaseClass.split(/\s+/).filter((c) => footprint.test(c))).toEqual([]);
    for (const s of BUTTON_SIZES) expect(buttonSizeClasses[s].split(/\s+/)).toContain('gap-2');
  });
});
