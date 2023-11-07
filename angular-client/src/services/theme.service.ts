/**
 * This class is used to store the themes of the application.
 */
export default class Theme {
  /* Text Themes */
  static readonly font: string = 'font-family: "Roboto"; ';
  static readonly textColor: string = 'color: #EFEFEF; ';
  static readonly textStyle: string = this.font + this.textColor;
  static readonly HEADER: string = this.textStyle + 'fontSize: 20px; fontWeight: bold;';
  static readonly SUBHEADER: string = this.textStyle + 'fontSize: 16px;';
  static readonly XXLARGEHEADER: string = this.textStyle + 'font-size: 7.5rem; padding-bottom: 60px;';
  static readonly LARGEHEADER: string = this.textStyle + 'font-size: xx-large;';
}
