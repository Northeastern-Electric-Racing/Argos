import { Component, input, OnInit } from '@angular/core';
import { Chip } from 'src/utils/bms.utils';

@Component({
  selector: 'chip-faults',
  templateUrl: './chip-faults.component.html',
  styleUrl: './chip-faults.component.css'
})
export class ChipFaultsComponent implements OnInit {
  chip = input.required<Chip>();
  title!: string;

  ngOnInit(): void {
    // Simply formats: Chip (Alpha/Beta) Faults
    this.title = `Chip ${Chip[this.chip()]} Faults`;
  }
}
