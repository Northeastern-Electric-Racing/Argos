import { Component, inject, OnInit } from '@angular/core';
import { DataTypeEnum } from 'src/data-type.enum';
import Storage from 'src/services/storage.service';

@Component({
  selector: 'crc',
  templateUrl: './crc.component.html',
  styleUrl: './crc.component.css'
})
export class CRCComponent implements OnInit {
  storage = inject(Storage);
  pecErrorChip: number | undefined = undefined;

  ngOnInit(): void {
    this.storage.get(DataTypeEnum.PER_CELL_CRC).subscribe((value) => {
      if (parseFloat(value.time) > Date.now() - 4000) {
        this.pecErrorChip = parseInt(value.values[0]);
      } else {
        this.pecErrorChip = undefined;
      }
    });
  }

  getStatusColor = (): string => {
    const dotColor = this.pecErrorChip === undefined ? '#19ff30' : 'red';
    return dotColor;
  };

  getStatusMessage = (): string => {
    return this.pecErrorChip === undefined ? 'Clear' : 'Warning!';
  };
}
