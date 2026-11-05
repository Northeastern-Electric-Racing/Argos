/**
 * Colour constants for code that paints from TypeScript (backgrounds, battery levels). They match the theme
 * tokens in src/styles/theme.css. Text styles live in the typography recipe (components/typography).
 */
export default class Theme {
  static readonly battteryLow: string = '#f50905';
  static readonly battteryMed: string = '#FFEA00';
  static readonly battteryHigh: string = '#1ae824';
  static readonly batteryBack: string = '#efefed';
  static readonly infoBackground: string = '#2C2C2C';
}
