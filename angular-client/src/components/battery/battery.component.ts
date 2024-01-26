import { Component, Input } from '@angular/core';
import Theme from 'src/services/theme.service';
import { trigger, state, style, animate, transition } from '@angular/animations';

@Component({
  selector: 'battery',
  templateUrl: 'battery.component.html',
  styleUrls: ['battery.component.css'],
  animations: [
    // metadata array
    trigger('toggleClick', [
      // trigger block
      state(
        'true',
        style({
          // final CSS following animation
          backgroundColor: 'yellow'
        })
      ),
      state(
        'false',
        style({
          backgroundColor: 'purple'
        })
      ),
      transition('true => false', animate('1000ms linear')), // animation timing
      transition('false => true', animate('1000ms linear'))
    ])
  ]
})
export class BatteryPercentageComponent {
  @Input() percentage!: number;
  @Input() height!: number;
  @Input() width!: number;
  heightpx!: string;
  widthpx!: string;
  color: string = '';
  clicked: boolean = false;
  full!: boolean;
  fillColor!: string;
  backColor: string = Theme.batteryBack;
  batHeight!: string;
  nubHeight!: string;
  nubWidth!: string;
  roundCorner!: string;

  // setting color and rendering
  ngOnInit() {
    if (this.percentage === 100) {
      this.full = true;
    } else {
      this.full = false;
    }
    if (this.percentage <= 20) {
      this.color = Theme.battteryLow;
    } else if (this.percentage <= 50) {
      this.color = Theme.battteryMed;
    } else {
      this.color = Theme.battteryHigh;
    }
    this.renderBattery();
  }

  // fills battery bar based on current percentage
  renderBattery() {
    this.batHeight = ((100 - this.percentage) / 100) * this.height + 'px';
    this.nubHeight = this.height / 10 + 'px';
    this.nubWidth = this.width / 2 + 'px';
    this.roundCorner = this.width / 8 + 'px';
    this.fillColor = this.color;
    this.heightpx = this.height + 'px';
    this.widthpx = this.width + 'px';
  }

  toggleIsCorrect() {
    this.clicked = !this.clicked; // change in data-bound value
  }
}
