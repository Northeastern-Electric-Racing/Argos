import { Component, effect, inject, input, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import Storage from 'src/services/storage.service';
import { Chip } from 'src/utils/bms.utils';
import { dataTypes } from 'src/utils/topic.utils';

@Component({
  selector: 'chip-diagnostics',
  templateUrl: './chip-diagnostics.component.html',
  styleUrl: './chip-diagnostics.component.css'
})
export class ChipDiagnosticsComponent implements OnInit {
  private storage = inject(Storage);
  chip = input.required<Chip>();
  segment = input.required<number>();
  title!: string;
  vRef: number | undefined;
  vRes: number | undefined;
  vAnalog: number | undefined;
  vDigital: number | undefined;
  boardTemp: number | undefined;
  valueSubscriptions: Subscription[] = [];
  constructor() {
    effect(() => {
      this.valueSubscriptions.forEach((sub) => sub.unsubscribe());
      this.resetValues();
      this.subscribeToData(this.segment());
    });
  }

  ngOnInit(): void {
    // Simply formats: Chip (Alpha/Beta) Diagnostics
    this.title = `Chip ${Chip[this.chip()]} Diagnostics`;
  }

  resetValues() {
    this.vRef = undefined;
    this.vRes = undefined;
    this.vAnalog = undefined;
    this.vDigital = undefined;
    this.boardTemp = undefined;
  }

  subscribeToData(segment: number) {
    this.valueSubscriptions.push(
      this.storage.get(dataTypes.vref(segment, this.chip())).subscribe((data) => {
        this.vRef = parseFloat(data.values[0]);
      }),
      this.storage.get(dataTypes.vres(segment, this.chip())).subscribe((data) => {
        this.vRes = parseFloat(data.values[0]);
      }),
      this.storage.get(dataTypes.vAnalog(segment, this.chip())).subscribe((data) => {
        this.vAnalog = parseFloat(data.values[0]);
      }),
      this.storage.get(dataTypes.vDigital(segment, this.chip())).subscribe((data) => {
        this.vDigital = parseFloat(data.values[0]);
      }),
      this.storage.get(dataTypes.boardTemp(segment, this.chip())).subscribe((data) => {
        this.boardTemp = parseFloat(data.values[0]);
      })
    );
  }
}
