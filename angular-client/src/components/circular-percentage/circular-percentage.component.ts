import { Component, Input } from '@angular/core';
import Theme from 'src/services/theme.service';

/**
 * Component that displays a percentage using a ring that is colored
 * a percentage of the way according to what percentage is passed
 */

@Component({
  selector: 'circular-percentage',
  templateUrl: './circular-percentage.component.html',
  styleUrls: ['./circular-percentage.component.css']
})
export class CircularPercentageComponent {
  @Input() dimension!: number;
  @Input() ringColor!: string;
  @Input() percentage!: number;
  @Input() spacing!: number;

  //values needed for styling and scaling
  backgroundColor: string = Theme.infoBackground;
  innerCircleDimension: number = 0;
  filledAngle: number = 0;
  emptyAngle: number = 360;
  percentageFontSize: number = 0;
  percentageSignFontSize: number = 0;
  percentageSignOffset: number = 0;

  //assigns values needed for styling and scaling
  ngOnInit() {
    this.innerCircleDimension = this.dimension * 0.87;
    this.filledAngle = (this.percentage / 100) * 360;
    this.emptyAngle = 360 - this.filledAngle;
    this.percentageFontSize = this.dimension * 0.39;
    this.percentageSignFontSize = this.dimension * 0.17;
    this.percentageSignOffset = this.dimension * 0.02;
  }
}
