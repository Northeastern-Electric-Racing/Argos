import { Component, inject, OnInit } from '@angular/core';
import { DataTypeEnum } from 'src/data-type.enum';
import Storage from 'src/services/storage.service';

@Component({
  selector: 'acc-high-temp',

  templateUrl: './acc-high-temp.component.html',
  styleUrl: './acc-high-temp.component.css'
})
export class AccHighTempComponent implements OnInit {
  storage = inject(Storage);
  highTemp: number | undefined = undefined;

  ngOnInit(): void {
    this.storage.get(DataTypeEnum.CELL_TEMP_HIGH).subscribe((value) => {
      this.highTemp = parseFloat(value.values[0]);
    });
  }
}
