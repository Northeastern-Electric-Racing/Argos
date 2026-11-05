import { fieldClasses, INPUT_SIZES, inputClass } from './field';

describe('field recipe', () => {
  it('has a non-empty input class list for every size, on the surface and hairline tokens', () => {
    for (const s of INPUT_SIZES) {
      const c = inputClass(s).split(/\s+/);
      expect(c).toContain('bg-surface-1');
      expect(c).toContain('border-border');
    }
    expect(inputClass('sm')).not.toBe(inputClass('md'));
  });

  it('marks invalid fields from aria-invalid and from touched invalid forms, in the danger token', () => {
    expect(inputClass('md')).toContain('aria-invalid:border-danger');
    expect(inputClass('md')).toContain('[&.ng-invalid.ng-touched]:border-danger');
  });

  it('shows the neutral focus edge, never a red one', () => {
    expect(inputClass('md')).toContain('focus:border-focus');
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
