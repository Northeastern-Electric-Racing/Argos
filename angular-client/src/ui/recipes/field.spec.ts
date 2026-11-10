import { fieldClasses, INPUT_SIZES, inputClass } from './field';

describe('field recipe', () => {
  it('has a non-empty input class list for every size, on the surface and the 3:1 control edge tokens', () => {
    for (const s of INPUT_SIZES) {
      const c = inputClass(s).split(/\s+/);
      expect(c).toContain('bg-surface-1');
      // the hairline border-border measured 1.24 to 1.86 against the surfaces (WCAG 1.4.11 wants 3:1)
      expect(c).toEqual(expect.arrayContaining(['border-control-border', 'hover:border-control-border-hover']));
      expect(c).not.toContain('border-border');
    }
    expect(inputClass('sm')).not.toBe(inputClass('md'));
  });

  it("types at develop's 16px at both sizes (PrimeNG's inputs; under 16px iOS Safari zooms in on focus)", () => {
    for (const s of INPUT_SIZES) expect(inputClass(s).split(/\s+/)).toContain('text-base');
  });

  it('marks invalid fields from aria-invalid and from touched invalid forms, in the danger token', () => {
    expect(inputClass('md')).toContain('aria-invalid:border-danger');
    expect(inputClass('md')).toContain('[&.ng-invalid.ng-touched]:border-danger');
  });

  it('shows the neutral focus edge, never a red one', () => {
    expect(inputClass('md')).toContain('focus:border-focus');
  });

  it('draws focus as a solid outline outside the border, like ui-select, not a box-shadow ring', () => {
    for (const s of INPUT_SIZES) {
      const c = inputClass(s).split(/\s+/);
      expect(c).toEqual(expect.arrayContaining(['focus:outline-1', 'focus:outline-focus']));
      expect(c.filter((x) => /(^|:)ring-/.test(x))).toEqual([]);
      // outline-none would zero the outline style that outline-1 relies on (lesson: outline-none + outline-1)
      expect(c).not.toContain('focus:outline-none');
    }
    expect(inputClass('md')).toContain('aria-invalid:focus:outline-danger');
  });

  // Tailwind emits utilities in its own order, not the order of `class`, so a base px-3 and a size px-2 on one
  // element is decided by the stylesheet (px-3 won, giving sm 12px). Each size sets every padding, height and
  // radius itself, and the base none.
  it('sets one padding, height and radius class per element, from the size', () => {
    const one = (c: string[], re: RegExp) => c.filter((x) => re.test(x));
    for (const s of INPUT_SIZES) {
      for (const el of ['input', 'textarea'] as const) {
        const c = inputClass(s, el).split(/\s+/);
        expect(one(c, /^p[xlr]?-/), `${s} ${el} padding-x`).toHaveLength(1);
        expect(one(c, /^h-/), `${s} ${el} height`).toHaveLength(1);
        expect(one(c, /^rounded/), `${s} ${el} radius`).toHaveLength(1);
      }
    }
    expect(inputClass('sm').split(/\s+/)).toContain('px-2');
    expect(inputClass('md').split(/\s+/)).toContain('px-3');
  });

  it('lets a textarea grow instead of holding the control height', () => {
    expect(inputClass('md', 'textarea')).toContain('h-auto');
    expect(inputClass('md', 'input')).not.toContain('h-auto');
  });

  it('has literal classes for the label, field, form, hint, error, required mark and action row', () => {
    for (const [, c] of Object.entries(fieldClasses)) expect(c.trim().length).toBeGreaterThan(0);
    expect(fieldClasses.label).toContain('text-fg-label');
    expect(fieldClasses.error).toContain('text-danger');
    expect(fieldClasses.hint).toContain('text-fg-muted');
  });
});
