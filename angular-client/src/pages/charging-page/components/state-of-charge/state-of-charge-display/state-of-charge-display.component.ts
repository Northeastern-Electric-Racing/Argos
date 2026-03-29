import { Component, OnInit, inject } from '@angular/core';
import Storage from 'src/services/storage.service';
import { topics } from 'src/utils/topic.utils';
import { floatPipe } from 'src/utils/pipes.utils';
import { InfoBackgroundComponent } from '../../../../../components/info-background/info-background.component';
import { BatteryPercentageComponent } from '../../../../../components/battery-percentage/battery-percentage.component';
import TypographyComponent from 'src/components/typography/typography.component';
import HStackComponent from 'src/components/hstack/hstack.component';

@Component({
  selector: 'state-of-charge-display',
  templateUrl: './state-of-charge-display.component.html',
  styleUrls: ['./state-of-charge-display.component.css'],
  standalone: true,
  imports: [InfoBackgroundComponent, BatteryPercentageComponent, TypographyComponent, HStackComponent]
})
export default class StateOfChargeDisplayComponent implements OnInit {
  private storage = inject(Storage);
  stateOfCharge: number = 0;

  ngOnInit() {
    this.storage.get(topics.stateOfCharge()).subscribe((value) => {
      this.stateOfCharge = floatPipe(value.values[0]);
    });
  }
}
