import { cssVarReader, CssVarReader, MISSING_THEME_COLOUR, readThemeColour, ThemeColourToken } from './shutdown-loop.theme';

describe('shutdown loop theme colours', () => {
  const fake =
    (values: Record<string, string>): CssVarReader =>
    (token) =>
      values[token] ?? '';

  it('reads a token through the reader, trimmed', () => {
    expect(readThemeColour('--color-danger', fake({ '--color-danger': ' #fb923c ' }))).toBe('#fb923c');
  });

  it('falls back to the missing colour, warning once per token', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const token: ThemeColourToken = '--color-spec-missing-token';
    expect(readThemeColour(token, fake({}))).toBe(MISSING_THEME_COLOUR);
    expect(readThemeColour(token, fake({}))).toBe(MISSING_THEME_COLOUR);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toContain(token);
  });

  it('reads custom properties from an element’s computed style', () => {
    const root = document.createElement('div');
    root.style.setProperty('--color-spec-probe', ' #123456 ');
    document.body.appendChild(root);
    try {
      expect(cssVarReader(root)('--color-spec-probe')).toBe('#123456');
      expect(cssVarReader(root)('--color-spec-unset')).toBe('');
    } finally {
      root.remove();
    }
  });
});
