import { Component, Input } from '@angular/core';

@Component({
  selector: 'battery',
  templateUrl: 'battery.component.html',
  styleUrls: ['battery.component.css']
})
export class BatteryPercentageComponent {
  @Input() percentage!: number;
  @Input() color!: string;
  arrayColor: any[] = [];
  numBars: number = 5;
  barColor: string = '#efefed';

  ngOnInit() {
    this.renderArrayColor();
    console.log(this.arrayColor);
  }

  // renders array of bars, filled according to input percentage with input color
  // currently width of bars / size of battery is hard coded to 5 bars of width 7px
  renderArrayColor() {
    const part = 100 / this.numBars;
    let currentLevel = 0 + part;
    // for each bar, fills it if percentage greater, otherwise fills it to percentage and leaves
    // rest empty
    for (let i = 0; i < this.numBars; i++) {
      if (this.percentage >= currentLevel) {
        this.arrayColor.push({ full: true, color: this.color, width: '14px' });
        currentLevel += part;
      } else {
        // 16 percent / 20 percent bar
        const newWidth = ((part - (currentLevel - this.percentage)) / 20) * 14;
        this.arrayColor.push({ full: false, color: this.barColor, width: newWidth + 'px' });
        for (let j = i + 1; j < this.numBars; j++) {
          this.arrayColor.push({ full: true, color: this.barColor, width: '14px' });
        }
        break;
      }
    }
    console.log(this.arrayColor);
  }
}
