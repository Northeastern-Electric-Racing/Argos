import { Component, inject, OnInit } from '@angular/core';
import { DataTypeEnum } from 'src/data-type.enum';
import Storage from 'src/services/storage.service';

@Component({
  selector: 'acc-high-voltage',
  templateUrl: './acc-high-voltage.component.html',
  styleUrl: './acc-high-voltage.component.css'
})
export class AccHighVoltageComponent implements OnInit {
  storage = inject(Storage);
  voltsHighValue: number | undefined = undefined;

  ngOnInit(): void {
    this.storage.get(DataTypeEnum.CELL_VOLTS_HIGH).subscribe((value) => {
      this.voltsHighValue = parseFloat(value.values[0]);
    });
  }
}
