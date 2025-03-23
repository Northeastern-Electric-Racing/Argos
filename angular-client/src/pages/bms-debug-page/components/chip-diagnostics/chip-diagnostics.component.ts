import { Component, input, OnInit } from '@angular/core';

export enum Chips {
  Alpha = 0,
  Beta = 1
}

@Component({
  selector: 'chip-diagnostics',
  templateUrl: './chip-diagnostics.component.html',
  styleUrl: './chip-diagnostics.component.css'
})
export class ChipDiagnosticsComponent implements OnInit {
  chip = input.required<Chips>();
  title!: string;

  ngOnInit(): void {
    this.title = `Chip ${this.chip() === Chips.Alpha ? 'Alpha' : 'Beta'} Diagnostics`;
  }
}
