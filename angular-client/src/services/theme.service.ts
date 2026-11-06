/**
 * Colour constants for code that paints from TypeScript (backgrounds, battery levels). They match the theme
 * tokens in src/styles/theme.css (src/styles/stylesheets.spec.ts checks it); markup uses the tokens' utilities.
 * Text styles live in the typography recipe (src/ui/recipes/typography.ts).
 */
export default class Theme {
  static readonly battteryLow: string = '#f50905';
  static readonly battteryHigh: string = '#1ae824';
  static readonly infoBackground: string = '#2C2C2C';
}
