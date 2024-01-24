/**
 * This class is used to store the themes of the application.
 */
export default class Theme {
  /* Text Themes */
  static readonly font: string = 'font-family: "Roboto"; ';
  static readonly textColor: string = 'color: #EFEFEF; ';
  static readonly textStyle: string = this.font + this.textColor;
  static readonly boldedText: string = this.textStyle + 'font-weight: bold; ';
  static readonly HEADER: string = this.boldedText + 'fontSize: 20px;';
  static readonly SUBHEADER: string = this.textStyle + 'fontSize: 16px;';
  static readonly XXLARGEHEADER: string = this.boldedText + 'font-size: 7.5rem; padding-bottom: 60px;';
  static readonly LARGEHEADER: string = this.boldedText + 'font-size: xx-large;';
  static readonly battteryLow: string = '#f50905';
  static readonly battteryMed: string = '#FFEA00';
  static readonly battteryHigh: string = '#1ae824';
  static readonly batteryBack: string = '#efefed';
}
