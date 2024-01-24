import { Component, Input } from '@angular/core';

@Component({
  selector: 'battery',
  templateUrl: 'battery.component.html',
  styleUrls: ['battery.component.css']
})
export class BatteryPercentageComponent {
  @Input() props!: { percentage: number; height: number; width: number };
  highColor: string = '#1ae824';
  lowColor: string = '#f50905';
  backColor: string = '#efefed';
  color: string = '';
  item: any;

  ngOnInit() {
    if (this.props.percentage < 35) {
      this.color = this.lowColor;
    } else {
      this.color = this.highColor;
    }
    this.renderBattery();
  }

  // fills battery bar based on current percentage
  renderBattery() {
    const batHeight = ((100 - this.props.percentage) / 100) * this.props.height + 'px';
    const nubHeight = this.props.height / 10 + 'px';
    const nubWidth = this.props.width / 2 + 'px';
    const roundCorner = this.props.width / 8 + 'px';
    if (this.props.percentage === 100) {
      this.item = {
        full: true,
        backColor: this.color,
        fillColor: this.backColor,
        height: this.props.height + 'px',
        width: this.props.width + 'px',
        batHeight,
        nubHeight,
        nubWidth,
        roundCorner
      };
    } else {
      this.item = {
        full: false,
        backColor: this.color,
        fillColor: this.backColor,
        height: this.props.height + 'px',
        width: this.props.width + 'px',
        batHeight,
        nubHeight,
        nubWidth,
        roundCorner
      };
    }
  }
}
