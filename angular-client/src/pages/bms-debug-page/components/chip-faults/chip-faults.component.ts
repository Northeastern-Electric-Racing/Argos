import { Component, input, OnInit } from '@angular/core';
import { Chips } from '../chip-diagnostics/chip-diagnostics.component';

@Component({
  selector: 'chip-faults',
  templateUrl: './chip-faults.component.html',
  styleUrl: './chip-faults.component.css'
})
export class ChipFaultsComponent implements OnInit {
  chip = input.required<Chips>();
  title!: string;

  ngOnInit(): void {
    this.title = `Chip ${this.chip() === Chips.Alpha ? 'Alpha' : 'Beta'} Faults`;
  }
}
