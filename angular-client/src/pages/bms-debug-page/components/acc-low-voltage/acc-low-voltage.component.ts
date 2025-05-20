import { Component, inject, OnInit } from '@angular/core';
import Storage from 'src/services/storage.service';
import { Chip, chipToString } from 'src/utils/bms.utils';
import { topics } from 'src/utils/topic.utils';
import { InfoBackgroundComponent } from '../../../../components/info-background/info-background.component';
import { InfoValueDisplayComponent } from '../../../../components/info-value-dispaly/info-value-display.component';

@Component({
    selector: 'acc-low-voltage',
    templateUrl: './acc-low-voltage.component.html',
    styleUrl: './acc-low-voltage.component.css',
    standalone: true,
    imports: [InfoBackgroundComponent, InfoValueDisplayComponent]
})
export class AccLowVoltageComponent implements OnInit {
  storage = inject(Storage);
  voltsLowValue: number | undefined = undefined;
  voltsLowChip: Chip | undefined = undefined;
  voltsLowCell: number | undefined = undefined;

  ngOnInit(): void {
    this.storage.get(topics.lowVoltsValue()).subscribe((value) => {
      this.voltsLowValue = parseFloat(value.values[0]);
    });
    this.storage.get(topics.lowVoltsChip()).subscribe((value) => {
      const chipValue = parseInt(value.values[0]);
      if (chipValue % 2 === 0) {
        this.voltsLowChip = Chip.Alpha;
      } else {
        this.voltsLowChip = Chip.Beta;
      }
    });
    this.storage.get(topics.lowVoltsCell()).subscribe((value) => {
      this.voltsLowCell = parseInt(value.values[0]);
    });
  }

  getInfoBackgroundTitle = () => {
    const cellTitle = this.voltsLowCell !== undefined ? `Cell: ${this.voltsLowCell}` : 'No Cell';
    const chipTitle = this.voltsLowChip !== undefined ? `Chip: ${chipToString(this.voltsLowChip, true)}` : 'No Chip';
    return `${cellTitle} | ${chipTitle}`;
  };
}
