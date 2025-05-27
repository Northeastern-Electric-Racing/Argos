import { Component, Input, OnInit } from '@angular/core';
import Theme from 'src/services/theme.service';
import { InfoBackgroundComponent } from '../info-background/info-background.component';
import TypographyComponent from '../typography/typography.component';

/**
 * Component that displays a percentage using a ring that is colored
 * a percentage of the way according to what percentage is passed
 */

@Component({
  selector: 'circular-percentage',
  templateUrl: './circular-percentage.component.html',
  styleUrls: ['./circular-percentage.component.css'],
  standalone: true,
  imports: [InfoBackgroundComponent, TypographyComponent]
})
export class CircularPercentageComponent implements OnInit {
  @Input() dimension!: number;
  @Input() ringColor!: string;
  @Input() percentage!: number;
  @Input() spacing!: number;

  //values needed for styling and scaling
  backgroundColor: string = Theme.infoBackground;
  innerCircleDimension: number = 0;
  emptyAngle: number = 360;
  percentageFontSize: number = 0;
  percentageSignFontSize: number = 0;
  percentageSignOffset: number = 0;

  //assigns values needed for styling and scaling
  ngOnInit() {
    this.innerCircleDimension = this.dimension * 0.87;
    this.percentageFontSize = this.dimension * 0.39;
    this.percentageSignFontSize = this.dimension * 0.17;
    this.percentageSignOffset = this.dimension * 0.02;
  }

  getFilledAngle(percentage: number): number {
    return (percentage / 100) * 360;
  }
}
