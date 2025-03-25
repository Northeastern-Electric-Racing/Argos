import { Component, effect, inject, input } from '@angular/core';
import Storage from 'src/services/storage.service';
import { dataTypes } from 'src/utils/topic.utils';
import { floatPipe } from 'src/utils/pipes.utils';
import { Segments } from 'src/utils/bms.utils';
import { Subscription } from 'rxjs';

// todo: implement below
// type AlphaCells = [number, number, number];

@Component({
  selector: 'cell-by-cell-heat-map',
  templateUrl: './cell-by-cell-heat-map.component.html',
  styleUrl: './cell-by-cell-heat-map.component.css'
})
export class CellByCellHeatMapComponent {
  private storage = inject(Storage);
  currentSegment = input.required<Segments>();
  alphaSubscriptions: Subscription[] = [];
  betaSubscriptions: Subscription[] = [];
  alphaCells = [
    { value: -1, color: 'grey' },
    { value: -1, color: 'grey' },
    { value: -1, color: 'grey' },
    { value: -1, color: 'grey' },
    { value: -1, color: 'grey' },
    { value: -1, color: 'grey' },
    { value: -1, color: 'grey' }
  ];
  betaCells = [
    { value: -1, color: 'grey' },
    { value: -1, color: 'grey' },
    { value: -1, color: 'grey' },
    { value: -1, color: 'grey' },
    { value: -1, color: 'grey' },
    { value: -1, color: 'grey' }
  ];

  constructor() {
    effect(() => {
      this.alphaCells = [
        { value: -1, color: 'grey' },
        { value: -1, color: 'grey' },
        { value: -1, color: 'grey' },
        { value: -1, color: 'grey' },
        { value: -1, color: 'grey' },
        { value: -1, color: 'grey' },
        { value: -1, color: 'grey' }
      ];
      this.betaCells = [
        { value: -1, color: 'grey' },
        { value: -1, color: 'grey' },
        { value: -1, color: 'grey' },
        { value: -1, color: 'grey' },
        { value: -1, color: 'grey' },
        { value: -1, color: 'grey' }
      ];

      this.alphaSubscriptions.forEach((sub) => sub.unsubscribe());
      this.betaSubscriptions.forEach((sub) => sub.unsubscribe());
      this.subscribeToAlphaChips(this.currentSegment() - 1);
      this.subscribeToBetaChips(this.currentSegment() - 1);
      console.log(this.betaCells[5].value);
      console.log('Current Segment:', this.currentSegment());
    });
  }

  subscribeToAlphaChips = (segment: number) => {
    if (segment === 0 || segment === 1 || segment === 2 || segment === 3 || segment === 4) {
      this.alphaSubscriptions.push(
        this.storage.get(dataTypes.alphaTemp(segment, 0)).subscribe((data) => {
          this.alphaCells[0].value = floatPipe(data.values[0]);
          this.alphaCells[0].color = this.getColor(this.alphaCells[0].value);
        }),
        this.storage.get(dataTypes.alphaTemp(segment, 1)).subscribe((data) => {
          this.alphaCells[1].value = floatPipe(data.values[0]);
          this.alphaCells[1].color = this.getColor(this.alphaCells[1].value);
        }),
        this.storage.get(dataTypes.alphaTemp(segment, 2)).subscribe((data) => {
          this.alphaCells[2].value = floatPipe(data.values[0]);
          this.alphaCells[2].color = this.getColor(this.alphaCells[2].value);
        }),
        this.storage.get(dataTypes.alphaTemp(segment, 3)).subscribe((data) => {
          this.alphaCells[3].value = floatPipe(data.values[0]);
          this.alphaCells[3].color = this.getColor(this.alphaCells[3].value);
          console.log(segment);
        }),
        this.storage.get(dataTypes.alphaTemp(segment, 4)).subscribe((data) => {
          this.alphaCells[4].value = floatPipe(data.values[0]);
          this.alphaCells[4].color = this.getColor(this.alphaCells[4].value);
        }),
        this.storage.get(dataTypes.alphaTemp(segment, 5)).subscribe((data) => {
          this.alphaCells[5].value = floatPipe(data.values[0]);
          this.alphaCells[5].color = this.getColor(this.alphaCells[5].value);
        }),
        this.storage.get(dataTypes.alphaTemp(segment, 6)).subscribe((data) => {
          this.alphaCells[6].value = floatPipe(data.values[0]);
          this.alphaCells[6].color = this.getColor(this.alphaCells[6].value);
        })
      );
    }
  };

  subscribeToBetaChips = (segment: number) => {
    if (segment === 0 || segment === 1 || segment === 2 || segment === 3 || segment === 4) {
      this.betaSubscriptions.push(
        this.storage.get(dataTypes.betaTemp(segment, 0)).subscribe((data) => {
          this.betaCells[0].value = floatPipe(data.values[0]);
          this.betaCells[0].color = this.getColor(this.betaCells[0].value);
          console.log(segment);
        }),
        this.storage.get(dataTypes.betaTemp(segment, 1)).subscribe((data) => {
          this.betaCells[1].value = floatPipe(data.values[0]);
          this.betaCells[1].color = this.getColor(this.betaCells[1].value);
          console.log(segment);
        }),
        this.storage.get(dataTypes.betaTemp(segment, 2)).subscribe((data) => {
          this.betaCells[2].value = floatPipe(data.values[0]);
          this.betaCells[2].color = this.getColor(this.betaCells[2].value);
          console.log(segment);
        }),
        this.storage.get(dataTypes.betaTemp(segment, 3)).subscribe((data) => {
          this.betaCells[3].value = floatPipe(data.values[0]);
          this.betaCells[3].color = this.getColor(this.betaCells[3].value);
          console.log(segment);
        }),
        this.storage.get(dataTypes.betaTemp(segment, 4)).subscribe((data) => {
          this.betaCells[4].value = floatPipe(data.values[0]);
          this.betaCells[4].color = this.getColor(this.betaCells[4].value);
          console.log(segment);
        }),
        this.storage.get(dataTypes.betaTemp(segment, 5)).subscribe((data) => {
          this.betaCells[5].value = floatPipe(data.values[0]);
          this.betaCells[5].color = this.getColor(this.betaCells[5].value);
          console.log(segment);
        })
      );
    }
  };

  getColor = (value: number) => {
    const hslMainValue = Math.min(Math.max(55 - value, 0) * 8, 120);

    return `hsl(${hslMainValue}, 100%, 50%)`;
  };
}
