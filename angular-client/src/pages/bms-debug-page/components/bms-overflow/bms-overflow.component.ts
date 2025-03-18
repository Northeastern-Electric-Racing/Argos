import { Component, inject, OnInit } from '@angular/core';
import { DataTypeEnum } from 'src/data-type.enum';
import Storage from 'src/services/storage.service';

@Component({
  selector: 'bms-overflow',
  templateUrl: './bms-overflow.component.html',
  styleUrl: './bms-overflow.component.css'
})
export class BmsOverflowComponent implements OnInit {
  storage = inject(Storage);
  overflowID: number | undefined = undefined;

  ngOnInit(): void {
    this.storage.get(DataTypeEnum.PER_CELL_OVERFLOWID).subscribe((value) => {
      if (parseFloat(value.time) > Date.now() - 4000) {
        this.overflowID = parseInt(value.values[0]);
      } else {
        this.overflowID = undefined;
      }
    });
  }

  getStatusColor = (): string => {
    const dotColor = this.overflowID === undefined ? '#19ff30' : 'red';
    return dotColor;
  };

  getStatusMessage = (): string => {
    return this.overflowID === undefined ? 'Clear' : 'Warning!';
  };
}
