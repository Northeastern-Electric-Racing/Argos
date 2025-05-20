import { Component, inject, OnInit } from '@angular/core';
import {} from 'src/data-type.enum';
import Storage from 'src/services/storage.service';
import { Chip, chipToString } from 'src/utils/bms.utils';
import { topics } from 'src/utils/topic.utils';
import { InfoBackgroundComponent } from '../../../../components/info-background/info-background.component';
import { InfoValueDisplayComponent } from '../../../../components/info-value-dispaly/info-value-display.component';

@Component({
    selector: 'acc-high-temp',
    templateUrl: './acc-high-temp.component.html',
    styleUrl: './acc-high-temp.component.css',
    standalone: true,
    imports: [InfoBackgroundComponent, InfoValueDisplayComponent]
})
export class AccHighTempComponent implements OnInit {
  storage = inject(Storage);
  highTemp: number | undefined = undefined;
  highTempCell: number | undefined = undefined;
  highTempChip: Chip | undefined = undefined;

  ngOnInit(): void {
    this.storage.get(topics.highTempValue()).subscribe((value) => {
      this.highTemp = parseFloat(value.values[0]);
    });
    this.storage.get(topics.highTempChip()).subscribe((value) => {
      const chipValue = parseInt(value.values[0]);
      if (chipValue % 2 === 0) {
        this.highTempChip = Chip.Alpha;
      } else {
        this.highTempChip = Chip.Beta;
      }
    });
    this.storage.get(topics.highTempCell()).subscribe((value) => {
      this.highTempCell = parseInt(value.values[0]);
    });
  }

  getInfoBackgroundTitle = () => {
    // ASK JACK
    const cellTitle = this.highTempCell !== undefined ? `Cell: ${this.highTempCell}` : 'No Cell';
    const chipTitle = this.highTempChip !== undefined ? `Chip: ${chipToString(this.highTempChip, true)}` : 'No Chip';
    return `${cellTitle} | ${chipTitle}`;
  };
}
