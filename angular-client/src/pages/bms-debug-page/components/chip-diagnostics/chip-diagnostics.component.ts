import { Component, input, OnInit } from '@angular/core';
import { Chips } from 'src/utils/bms.utils';

@Component({
  selector: 'chip-diagnostics',
  templateUrl: './chip-diagnostics.component.html',
  styleUrl: './chip-diagnostics.component.css'
})
export class ChipDiagnosticsComponent implements OnInit {
  chip = input.required<Chips>();
  title!: string;

  ngOnInit(): void {
    // Simply formats: Chip (Alpha/Beta) Diagnostics
    this.title = `Chip ${Chips[this.chip()]} Diagnostics`;
  }
}
