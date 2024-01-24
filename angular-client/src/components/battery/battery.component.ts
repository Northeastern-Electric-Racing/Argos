import { Component, Input } from '@angular/core';
import Theme from 'src/services/theme.service';

@Component({
  selector: 'battery',
  templateUrl: 'battery.component.html',
  styleUrls: ['battery.component.css']
})
export class BatteryPercentageComponent {
  @Input() props!: { percentage: number; height: number; width: number };
  color: string = '';
  item!: {
    full: boolean;
    fillColor: string;
    backColor: string;
    height: string;
    width: string;
    batHeight: string;
    nubHeight: string;
    nubWidth: string;
    roundCorner: string;
  };

  // setting color and rendering
  ngOnInit() {
    if (this.props.percentage <= 20) {
      this.color = Theme.battteryLow;
    } else if (this.props.percentage <= 50) {
      this.color = Theme.battteryMed;
    } else {
      this.color = Theme.battteryHigh;
    }
    this.renderBattery();
  }

  // fills battery bar based on current percentage
  // note:
  renderBattery() {
    const batHeight = ((100 - this.props.percentage) / 100) * this.props.height + 'px';
    const nubHeight = this.props.height / 10 + 'px';
    const nubWidth = this.props.width / 2 + 'px';
    const roundCorner = this.props.width / 8 + 'px';
    this.item = {
      full: false,
      fillColor: this.color,
      backColor: Theme.batteryBack,
      height: this.props.height + 'px',
      width: this.props.width + 'px',
      batHeight,
      nubHeight,
      nubWidth,
      roundCorner
    };
  }
}
