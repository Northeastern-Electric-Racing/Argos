import { Component, Input } from '@angular/core';

@Component({
  selector: 'battery',
  templateUrl: 'battery.component.html',
  styleUrls: ['battery.component.css']
})
export class BatteryPercentageComponent {
  @Input() percentage!: number;
  highColor: string = '#AFE1AF';
  lowColor: string = '#b31015';
  color: string = '';
  arrayColor: any[] = [];
  numBars: number = 5;
  barColor: string = '#efefed';

  ngOnInit() {
    if (this.percentage < 35) {
      this.color = this.lowColor;
    } else {
      this.color = this.highColor;
    }
    this.renderArrayColor();
    console.log(this.arrayColor);
  }

  // renders array of bars, filled according to input percentage with input color
  // currently width of bars / size of battery is hard coded to 5 bars of width 7px
  renderArrayColor() {
    const part = 100 / this.numBars;
    let currentLevel = 100 - part;
    // for each bar, fills it if percentage greater, otherwise fills it to percentage and leaves
    // rest empty
    for (let i = 0; i < this.numBars; i++) {
      if (this.percentage <= currentLevel) {
        this.arrayColor.push({ full: true, backColor: this.barColor, height: '14px' });
        currentLevel -= part;
      } else {
        const newHeight = ((currentLevel - this.percentage + part) / 20) * 14;
        this.arrayColor.push({ full: false, backColor: this.color, fillColor: this.barColor, height: newHeight + 'px' });
        for (let j = i + 1; j < this.numBars; j++) {
          this.arrayColor.push({ full: true, backColor: this.color, height: '14px' });
        }
        break;
      }
    }
    console.log(this.arrayColor);
  }
}
