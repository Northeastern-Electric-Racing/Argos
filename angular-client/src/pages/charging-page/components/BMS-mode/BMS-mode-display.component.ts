import { Component, OnInit, inject } from '@angular/core';
import Storage from 'src/services/storage.service';
import { DataTypeEnum } from 'src/data-type.enum';
import { floatPipe } from 'src/utils/pipes.utils';
import { InfoBackgroundComponent } from '../../../../components/info-background/info-background.component';
import TypographyComponent from 'src/components/typography/typography.component';
import VStackComponent from 'src/components/vstack/vstack.component';



enum BMSMODE {
  DEFAULT = 0,
  READY = 1,
  CHARGING = 2,
  FAULTED = 3
}

@Component({
    selector: 'BMS-mode-display',
    templateUrl: './BMS-mode-display.component.html',
    styleUrls: ['./BMS-mode-display.component.css'],
    standalone: true,
    imports: [InfoBackgroundComponent, TypographyComponent, VStackComponent,]
})
export default class BMSModeDisplayComponent implements OnInit {
  private storage = inject(Storage);
  bmsMode: BMSMODE = 1;

  // Mapping object for colors
  private colorMap: { [key in BMSMODE]: string } = {
    [BMSMODE.DEFAULT]: 'grey',
    [BMSMODE.READY]: 'blue',
    [BMSMODE.CHARGING]: 'green',
    [BMSMODE.FAULTED]: 'red'
  };

  ngOnInit() {
    this.storage.get(DataTypeEnum.BMS_MODE).subscribe((value) => {
      this.bmsMode = floatPipe(value.values[0]) as BMSMODE;
    });
  }

  getBMSModeString(): string {
    return BMSMODE[this.bmsMode];
  }

  getStatusColor(): string {
    return this.colorMap[this.bmsMode];
  }
}
