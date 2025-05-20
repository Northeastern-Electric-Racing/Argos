import { Component, inject } from '@angular/core';
import { take } from 'rxjs';
import Storage from 'src/services/storage.service';
import { DataTypeEnum } from 'src/data-type.enum';
import { floatPipe } from 'src/utils/pipes.utils';
import { InfoBackgroundComponent } from '../../../../components/info-background/info-background.component';
import TypographyComponent from 'src/components/typography/typography.component';



@Component({
    selector: 'starting-soc-timer',
    templateUrl: './starting-soc-timer.component.html',
    styleUrls: ['./starting-soc-timer.component.css'],
    standalone: true,
    imports: [InfoBackgroundComponent, TypographyComponent]
})
export default class StartingSocTimerComponent {
  private storage = inject(Storage);
  startingSoc: number = 0;
  constructor() {
    this.storage
      .get(DataTypeEnum.STATE_OF_CHARGE)
      .pipe(take(1))
      .subscribe((value) => {
        this.startingSoc = floatPipe(value.values[0]);
      });
  }
}
