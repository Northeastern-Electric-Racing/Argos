import { Component, Input } from '@angular/core';
import Theme from 'src/services/theme.service';
import { trigger, state, style, animate, transition } from '@angular/animations';

@Component({
  selector: 'battery',
  templateUrl: 'battery.component.html',
  styleUrls: ['battery.component.css'],
  // TO DO: this is just a dumb animation that changes the color of the nub, would like to make something actually
  // cool or interesting in the future
  animations: [
    // metadata array
    trigger('toggleClick', [
      // trigger block
      state(
        'true',
        style({
          // final CSS following animation
          backgroundColor: 'grey'
        })
      ),
      state(
        'false',
        style({
          backgroundColor: Theme.batteryBack
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
  adjustedTopCorner!: string;
  adjustedBotCorner!: string;

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
    this.batHeight = (this.percentage / 100) * this.height + 'px';
    this.nubHeight = this.height / 10 + 'px';
    this.nubWidth = this.width / 2 + 'px';
    const minDim = Math.min(this.width, this.height);
    this.roundCorner = minDim * 0.05 + 'px';
    this.fillColor = this.color;
    this.heightpx = this.height + 'px';
    this.widthpx = this.width + 'px';
    this.adjustedTopCorner = '0px';
    this.adjustedBotCorner = this.roundCorner;
    if (this.percentage >= 95) {
      this.adjustedTopCorner = this.roundCorner;
    }
    if (this.percentage <= 5 && this.percentage > 0) {
      this.adjustedBotCorner = (this.height * this.percentage) / 100 + 'px';
    }
  }

  toggleIsCorrect() {
    this.clicked = !this.clicked; // change in data-bound value
  }
}
