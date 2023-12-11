import { Component, Input } from '@angular/core';

@Component({
  selector: 'battery',
  templateUrl: 'battery.component.html',
  styleUrls: ['battery.component.css']
})
export class BatteryPercentageComponent {
  @Input() percentage!: number;
  highColor: string = '#1ae824';
  lowColor: string = '#f50905';
  color: string = '';
  arrayColor: any[] = [];
  item: any;
  backColor: string = '#efefed';

  ngOnInit() {
    if (this.percentage < 35) {
      this.color = this.lowColor;
    } else {
      this.color = this.highColor;
    }
    this.renderBattery();
  }

  // fills battery bar based on current percentage
  renderBattery() {
    const batHeight = ((100 - this.percentage) / 100) * 70;
    if (this.percentage === 100) {
      this.item = { full: true, backColor: this.color, fillColor: this.backColor, height: batHeight + 'px' };
    }
    this.item = { full: false, backColor: this.color, fillColor: this.backColor, height: batHeight + 'px' };
  }
}
