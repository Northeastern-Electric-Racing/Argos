/**
 * This class is used to store the themes of the application.
 */
export default class Theme {
  /* Text Themes */
  static readonly font: string = 'font-family: "Roboto"; ';
  static readonly textColor: string = 'color: #EFEFEF; ';
  static readonly textStyle: string = this.font + this.textColor;
  static readonly boldedText: string = this.textStyle + 'font-weight: bold; ';
  static readonly header: string = this.boldedText + 'fontSize: 20px;';
  static readonly secondaryHeader: string = this.font + 'font-weight: bold; fontSize: 20px; color: #808080; ';
  static readonly subheader: string = this.textStyle + 'fontSize: 16px;';
  static readonly xLargeHeader: string = this.boldedText + 'font-size: 2.5rem; margin: 0; padding: 0;';
  static readonly xxLargeHeader: string = this.boldedText + 'font-size: 7.5rem; margin: 0; padding: 0;';
  static readonly largeSecondaryHeader: string = this.font + 'font-weight: bold; font-size: xx-large; color: #808080; ';
  static readonly largeHeader: string = this.boldedText + 'font-size: xx-large;';
  static readonly infoTitle: string = this.textStyle + 'fontSize: 20px; font-weight: normal; margin: 0;';
  static readonly infoSubtitle: string = this.font + 'fontSize: 16px; color: #cacaca; margin: 0; text-align: center;';
  static readonly value: string = this.boldedText + 'fontSize: 85px; margin: 0; padding: 0;';
  static readonly infoValue: string = this.boldedText + 'fontSize: 50px; margin: 0; align-self: center;';
  static readonly infoValueMobile: string = this.boldedText + 'fontSize: 25px; margin: 0; align-self: center;';
  static readonly infoUnit: string = this.textStyle + 'font-size: 24px; color: gray; padding-top: 22px;';
  static readonly sidebarLabel: string = this.font + 'font-size: 16px; margin: 0;';

  static readonly battteryLow: string = '#f50905';
  static readonly battteryMed: string = '#FFEA00';
  static readonly battteryHigh: string = '#1ae824';
  static readonly batteryBack: string = '#efefed';
  static readonly infoBackground: string = '#2C2C2C';
}
