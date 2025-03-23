import { Component, input, OnInit } from '@angular/core';
import { Chips } from 'src/utils/bms.utils';

@Component({
  selector: 'chip-faults',
  templateUrl: './chip-faults.component.html',
  styleUrl: './chip-faults.component.css'
})
export class ChipFaultsComponent implements OnInit {
  chip = input.required<Chips>();
  title!: string;

  ngOnInit(): void {
    // Simply formats: Chip (Alpha/Beta) Faults
    this.title = `Chip ${Chips[this.chip()]} Faults`;
  }
}
