export default class Theme {
  static readonly font: string = 'font-family: "Roboto"; ';
  static readonly textColor: string = 'color: #EFEFEF; ';
  static readonly textStyle: string = this.font + this.textColor;
  static readonly HEADER: string = this.textStyle + 'fontSize: 20px; fontWeight: bold;';
}
