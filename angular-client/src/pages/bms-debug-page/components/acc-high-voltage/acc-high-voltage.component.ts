import { Component, inject, OnInit } from '@angular/core';
import Storage from 'src/services/storage.service';
import { Chip, chipToString } from 'src/utils/bms.utils';
import { dataTypes } from 'src/utils/topic.utils';

@Component({
  selector: 'acc-high-voltage',
  templateUrl: './acc-high-voltage.component.html',
  styleUrl: './acc-high-voltage.component.css'
})
export class AccHighVoltageComponent implements OnInit {
  storage = inject(Storage);
  voltsHighValue: number | undefined = undefined;
  voltsHighChip: Chip | undefined = undefined;
  voltsHighCell: number | undefined = undefined;

  ngOnInit(): void {
    this.storage.get(dataTypes.highVoltsValue()).subscribe((value) => {
      this.voltsHighValue = parseFloat(value.values[0]);
    });
    this.storage.get(dataTypes.highVoltsChip()).subscribe((value) => {
      const chipValue = parseInt(value.values[0]);
      if (chipValue % 2 === 0) {
        this.voltsHighChip = Chip.Alpha;
      } else {
        this.voltsHighChip = Chip.Beta;
      }
    });
    this.storage.get(dataTypes.highVoltsCell()).subscribe((value) => {
      this.voltsHighCell = parseInt(value.values[0]);
    });
  }

  getInfoBackgroundTitle = () => {
    const cellTitle = this.voltsHighCell !== undefined ? `Cell: ${this.voltsHighCell}` : 'No Cell';
    const chipTitle = this.voltsHighChip !== undefined ? `Chip: ${chipToString(this.voltsHighChip, true)}` : 'No Chip';
    return `${cellTitle} | ${chipTitle}`;
  };
}
