import { Component, input, OnInit } from '@angular/core';
import { Chip } from 'src/utils/bms.utils';

@Component({
  selector: 'chip-diagnostics',
  templateUrl: './chip-diagnostics.component.html',
  styleUrl: './chip-diagnostics.component.css'
})
export class ChipDiagnosticsComponent implements OnInit {
  chip = input.required<Chip>();
  title!: string;

  ngOnInit(): void {
    // Simply formats: Chip (Alpha/Beta) Diagnostics
    this.title = `Chip ${Chip[this.chip()]} Diagnostics`;
  }
}
