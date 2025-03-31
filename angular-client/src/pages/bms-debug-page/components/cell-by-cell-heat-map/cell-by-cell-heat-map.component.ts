import { Component, effect, inject, input } from '@angular/core';
import Storage from 'src/services/storage.service';
import { allAlphaThermValues, allBetaThermValues, dataTypes } from 'src/utils/topic.utils';
import { floatPipe } from 'src/utils/pipes.utils';
import { numToSegmentType, Segment } from 'src/utils/bms.utils';
import { Subscription } from 'rxjs';

// todo: implement below
// type AlphaCells = [number, number, number];
export type Cell = {
  value: number;
  color: string;
};
// 7 beta cells
export type AlphaCells = [Cell, Cell, Cell, Cell, Cell, Cell, Cell];
// 6 alpha cells
export type BetaCells = [Cell, Cell, Cell, Cell, Cell, Cell];

@Component({
  selector: 'cell-by-cell-heat-map',
  templateUrl: './cell-by-cell-heat-map.component.html',
  styleUrl: './cell-by-cell-heat-map.component.css'
})
export class CellByCellHeatMapComponent {
  private storage = inject(Storage);
  currentSegment = input.required<Segment>();
  alphaSubscriptions: Subscription[] = [];
  betaSubscriptions: Subscription[] = [];
  alphaCells: AlphaCells = [
    { value: -1, color: 'grey' },
    { value: -1, color: 'grey' },
    { value: -1, color: 'grey' },
    { value: -1, color: 'grey' },
    { value: -1, color: 'grey' },
    { value: -1, color: 'grey' },
    { value: -1, color: 'grey' }
  ];
  betaCells: BetaCells = [
    { value: -1, color: 'grey' },
    { value: -1, color: 'grey' },
    { value: -1, color: 'grey' },
    { value: -1, color: 'grey' },
    { value: -1, color: 'grey' },
    { value: -1, color: 'grey' }
  ];

  constructor() {
    this.resetCells();
    effect(() => {
      this.alphaSubscriptions.forEach((sub) => sub.unsubscribe());
      this.betaSubscriptions.forEach((sub) => sub.unsubscribe());
      this.subscribeToAlphaChips(this.currentSegment());
      this.subscribeToBetaChips(this.currentSegment());
      console.log(this.betaCells[5].value);
      console.log('Current Segment:', this.currentSegment());
    });
  }

  resetCells = () => {
    this.betaCells.map((cell) => {
      cell.value = -1;
      cell.color = 'grey';
    });
    this.alphaCells.map((cell) => {
      cell.value = -1;
      cell.color = 'grey';
    });
  };

  subscribeToAlphaChips = (segment: number) => {
    const segmentNumber = numToSegmentType(segment);
    allAlphaThermValues.map((therm) =>
      this.alphaSubscriptions.push(
        this.storage.get(dataTypes.alphaTemp(segmentNumber, therm)).subscribe((data) => {
          this.alphaCells[0].value = floatPipe(data.values[0]);
          this.alphaCells[0].color = this.getColor(this.alphaCells[0].value);
        })
      )
    );
    this.alphaSubscriptions.push();
  };

  subscribeToBetaChips = (segment: number) => {
    const segmentNumber = numToSegmentType(segment);
    allBetaThermValues.map((therm) =>
      this.betaSubscriptions.push(
        this.storage.get(dataTypes.betaTemp(segmentNumber, therm)).subscribe((data) => {
          this.betaCells[0].value = floatPipe(data.values[0]);
          this.betaCells[0].color = this.getColor(this.betaCells[0].value);
        })
      )
    );
  };

  getColor = (value: number) => {
    const hslMainValue = Math.min(Math.max(55 - value, 0) * 8, 120);

    return `hsl(${hslMainValue}, 100%, 50%)`;
  };
}
