import ArgosPreset from './argos-preset';

interface FocusRingTokens {
  semantic: { focusRing: { color: string; width: string } };
  components: { button: { colorScheme: { dark: { root: { primary: { focusRing: { color: string } } } } } } };
}

// Aura rings focus in the primary red, which is 2.89:1 on the #2c2c2c nav bar and cards (WCAG 1.4.11 needs 3:1)
describe('ArgosPreset focus ring', () => {
  const preset = ArgosPreset as unknown as FocusRingTokens;

  it('is a light neutral that stands out on every dark surface and beside the red pressed pills', () => {
    expect(preset.semantic.focusRing.color).toBe('{surface.200}');
  });

  it('is also what primary buttons use, instead of their own red', () => {
    expect(preset.components.button.colorScheme.dark.root.primary.focusRing.color).toBe('{focus.ring.color}');
  });
});
