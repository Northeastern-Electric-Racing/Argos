import { Component, input } from '@angular/core';

@Component({
  selector: 'cell-tile',
  templateUrl: './cell-tile.component.html',
  styleUrl: './cell-tile.component.css'
})
export class CellTileComponent {
  value = input.required<number>();
  color = input.required<string>();
}
