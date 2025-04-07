import { Component, effect, HostListener, inject, input } from '@angular/core';
import { Subscription } from 'rxjs';
import { ConnectionDotConfig, ThermometerConfig } from 'src/components/info-value-dispaly/info-value-display.component';
import Storage from 'src/services/storage.service';
import { Chip, getConnectionDotStatusColor, Segment } from 'src/utils/bms.utils';
import { dataTypes } from 'src/utils/topic.utils';

@Component({
  selector: 'segment-at-a-glance',
  templateUrl: './segment-at-a-glance.component.html',
  styleUrl: './segment-at-a-glance.component.css'
})
export class SegmentAtAGlanceComponent {
  private storage = inject(Storage);
  segmentNumber = input.required<Segment>();
  voltage: number = 0;
  temperature: number = 0;
  alphaChipTemp: number = 0;
  betaChipTemp: number = 0;
  alphaCrc: number = 0;
  betaCrc: number = 0;
  thermometerConfigAlphaChip: ThermometerConfig = { type: 'thermometer-config', currentValue: 0, min: 0, max: 60 };
  thermometerConfigBetaChip: ThermometerConfig = { type: 'thermometer-config', currentValue: 0, min: 0, max: 60 };
  thermometerConfigSegment: ThermometerConfig = { type: 'thermometer-config', currentValue: 0, min: 0, max: 60 };
  valueSubscriptions: Subscription[] = [];

  enableWidgets = window.innerWidth >= 1000;
  @HostListener('window:resize', ['$event'])
  onResize() {
    this.enableWidgets = window.innerWidth >= 1000;
  }

  constructor() {
    effect(() => {
      this.valueSubscriptions.forEach((sub) => sub.unsubscribe());
      this.resetValues();
      this.subscribeToData(this.segmentNumber());
    });
  }

  resetValues() {
    this.voltage = 0;
    this.temperature = 0;
    this.alphaChipTemp = 0;
    this.betaChipTemp = 0;
    this.alphaCrc = 0;
  }

  subscribeToData = (segment: number) => {
    this.storage.get(dataTypes.segmentTemp(segment)).subscribe((value) => {
      this.temperature = parseFloat(value.values[0]);
      this.thermometerConfigSegment.currentValue = this.temperature;
    });
    this.storage.get(dataTypes.dieTemp(segment, Chip.Alpha)).subscribe((value) => {
      this.alphaChipTemp = parseFloat(value.values[0]);
      this.thermometerConfigAlphaChip.currentValue = this.alphaChipTemp;
    });
    this.storage.get(dataTypes.dieTemp(segment, Chip.Beta)).subscribe((value) => {
      this.betaChipTemp = parseFloat(value.values[0]);
      this.thermometerConfigBetaChip.currentValue = this.betaChipTemp;
    });
    this.storage.get(dataTypes.pecErrorChip()).subscribe((value) => {
      const chip = parseInt(value.values[0]);
      if (chip % 2 === 0) {
        this.alphaCrc = parseInt(value.values[0]);
      } else {
        this.betaCrc = parseInt(value.values[0]);
      }
    });
  };

  getAlphaCrcColor = (): string => {
    return this.alphaCrc === 0 ? 'green' : 'red';
  };

  getBetaCrcColor = (): string => {
    return this.betaCrc === 0 ? 'green' : 'red';
  };
  getStatusColor = (): string => {
    return getConnectionDotStatusColor(this.voltage);
  };
  connectionDotConfig: ConnectionDotConfig = {
    type: 'connection-dot-config',
    getStatusColor: this.getStatusColor
  };
}
