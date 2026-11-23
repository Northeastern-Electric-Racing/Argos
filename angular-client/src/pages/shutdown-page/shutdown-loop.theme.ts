/**
 * Theme colours for code that cannot use Tailwind utilities (three.js materials, canvas). Every colour on the
 * Shutdown page is a theme token from src/styles/theme.css: Tailwind views use its utilities (`bg-danger`), and
 * three.js reads the same token's value through these helpers, so 2D and 3D never drift.
 *
 * Reserved colours on this page:
 *   --color-danger   the cause, and nothing else (3D HV parts use --color-secondary-border)
 *   --color-fault    the banner's LOOP OPEN fill only
 *   --color-warn     TS ON and the mismatch / intermittent warnings
 *   --color-fg       the selected ring, in 2D and 3D
 *   --color-focus    the focus ring
 *   --color-accent   (NER red) never a state colour
 * 3D frame and surface colours come from neutral tokens (--color-surface-3, --color-border-strong, --color-page).
 * State colours come from readStateColours (shutdown-loop.display.ts).
 */
export type ThemeColourToken = `--color-${string}`;

/** Reads a custom property; a test injects a fake. */
export type CssVarReader = (token: ThemeColourToken) => string;

/** Reads tokens from the computed style of `root`, e.g. `cssVarReader(inject(DOCUMENT).documentElement)`. */
export const cssVarReader =
  (root: Element): CssVarReader =>
  (token) =>
    getComputedStyle(root).getPropertyValue(token).trim();

/** Used only if a token resolves empty (jsdom, a missing token); warns once. The one hex value in shutdown code. */
export const MISSING_THEME_COLOUR = '#808080';

const warned = new Set<ThemeColourToken>();

/** The token's colour as `read` resolves it, or MISSING_THEME_COLOUR (with one warning per token) if it is empty. */
export function readThemeColour(token: ThemeColourToken, read: CssVarReader): string {
  const value = read(token).trim();
  if (value) return value;
  if (!warned.has(token)) {
    warned.add(token);
    console.warn(`Shutdown page: theme token ${token} is empty; using ${MISSING_THEME_COLOUR}.`);
  }
  return MISSING_THEME_COLOUR;
}
