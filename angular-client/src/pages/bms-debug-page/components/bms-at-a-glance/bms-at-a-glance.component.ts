import { Component, inject, OnInit } from '@angular/core';
import { DataTypeEnum } from 'src/data-type.enum';
import Storage from 'src/services/storage.service';

// PACK_VOLTAGE
// PACK_TEMP
// STATE_OF_CHARGE
// PACK_CCL
// PACK_DCL

@Component({
  selector: 'bms-at-a-glance',
  templateUrl: './bms-at-a-glance.component.html',
  styleUrls: ['./bms-at-a-glance.component.css']
})
export class BmsAtAGlanceComponent implements OnInit {
  private storage = inject(Storage);
  voltage: number = 0;
  temperature: number = 0;
  chargeState: number = 0;
  ccl: number = 0;
  dcl: number = 0;

  ngOnInit(): void {
    this.storage.get(DataTypeEnum.PACK_VOLTAGE).subscribe((value) => {
      this.voltage = parseInt(value.values[0]);
    });

    this.storage.get(DataTypeEnum.PACK_TEMP).subscribe((value) => {
      this.temperature = parseInt(value.values[0]);
    });

    this.storage.get(DataTypeEnum.STATE_OF_CHARGE).subscribe((value) => {
      this.chargeState = parseInt(value.values[0]);
    });

    this.storage.get(DataTypeEnum.CHARGE_CURRENT_LIMIT).subscribe((value) => {
      this.ccl = parseInt(value.values[0]);
    });

    this.storage.get(DataTypeEnum.DISCHARGE_CURRENT_LIMIT).subscribe((value) => {
      this.dcl = parseInt(value.values[0]);
    });
  }

  getStatusColor = (): string => {
    let dotColor = '#808080';
    // We have to multiply by 125 cells to get the scaling right
    if (this.voltage <= 3 * 125) {
      dotColor = 'red';
    } else if (this.voltage <= 3.5 * 125) {
      dotColor = 'yellow';
    } else {
      dotColor = '#19ff30';
    }
    return dotColor;
  };
}
