import { Component, OnInit, inject } from '@angular/core';
import Storage from 'src/services/storage.service';
import { DataTypeEnum } from 'src/data-type.enum';
import { floatPipe } from 'src/utils/pipes.utils';
import { InfoBackgroundComponent } from '../info-background/info-background.component';
import TypographyComponent from '../typography/typography.component';

/**
 * Component that displays a percentage using a ring that is colored
 * a percentage of the way according to what percentage is passed
 */

@Component({
  selector: 'steering-angle-display',
  templateUrl: './steering-angle-display.component.html',
  styleUrls: ['./steering-angle-display.component.css'],
  standalone: true,
  imports: [InfoBackgroundComponent, TypographyComponent]
})
export class SteeringAngleDisplayComponent implements OnInit {
  private storage = inject(Storage);
  steeringAngle: number = 0;

  ngOnInit() {
    this.storage.get(DataTypeEnum.STEERING_ANGLE).subscribe((value) => {
      this.steeringAngle = floatPipe(value.values[0]);
    });
  }
}
