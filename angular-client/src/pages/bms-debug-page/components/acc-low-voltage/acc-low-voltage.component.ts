import { Component, inject, OnInit } from '@angular/core';
import { DataTypeEnum } from 'src/data-type.enum';
import Storage from 'src/services/storage.service';

@Component({
  selector: 'acc-low-voltage',
  templateUrl: './acc-low-voltage.component.html',
  styleUrl: './acc-low-voltage.component.css'
})
export class AccLowVoltageComponent implements OnInit {
  storage = inject(Storage);
  voltsLowValue: number | undefined = undefined;

  ngOnInit(): void {
    this.storage.get(DataTypeEnum.CELL_VOLTS_LOW).subscribe((value) => {
      this.voltsLowValue = parseFloat(value.values[0]);
    });
  }
}
