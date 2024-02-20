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
  static readonly XXLARGEHEADER: string = this.boldedText + 'font-size: 7.5rem; margin: 0; padding: 0;';
  static readonly LARGEHEADER: string = this.boldedText + 'font-size: xx-large;';
  static readonly INFOTITLE: string = this.textStyle + 'fontSize: 20px; font-weight: normal; margin: 0;';
  static readonly INFOSUBTITLE: string = this.font + 'fontSize: 16px; color: #cacaca; margin: 0;';
  static readonly battteryLow: string = '#f50905';
  static readonly battteryMed: string = '#FFEA00';
  static readonly battteryHigh: string = '#1ae824';
  static readonly batteryBack: string = '#efefed';
}
