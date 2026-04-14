import { Component, effect, HostListener, inject, input, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { ConnectionDotConfig, ThermometerConfig } from 'src/components/info-value-dispaly/info-value-display.component';
import Storage from 'src/services/storage.service';
import { Chip, getCellVoltageStatusColor, Segment } from 'src/utils/bms.utils';
import { topics } from 'src/utils/topic.utils';
import { InfoBackgroundComponent } from '../../../../components/info-background/info-background.component';

import { InfoValueDisplayComponent } from '../../../../components/info-value-dispaly/info-value-display.component';
import { ConnectionDotWithMessageComponent } from '../../../../components/connection-dot-with-message/connection-dot-with-message.component';
import TypographyComponent from 'src/components/typography/typography.component';
import VStackComponent from 'src/components/vstack/vstack.component';
import HStackComponent from 'src/components/hstack/hstack.component';

@Component({
  selector: 'segment-at-a-glance',
  templateUrl: './segment-at-a-glance.component.html',
  styleUrl: './segment-at-a-glance.component.css',
  imports: [
    InfoBackgroundComponent,
    InfoValueDisplayComponent,
    ConnectionDotWithMessageComponent,
    TypographyComponent,
    VStackComponent,
    HStackComponent
  ]
})
export class SegmentAtAGlanceComponent implements OnDestroy {
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
  @HostListener('window:resize')
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
    this.valueSubscriptions.push(
      this.storage.get(topics.segmentVoltage(segment)).subscribe((value) => {
        this.voltage = parseFloat(value.values[0]);
      }),
      this.storage.get(topics.segmentTemp(segment)).subscribe((value) => {
        this.temperature = parseFloat(value.values[0]);
        this.thermometerConfigSegment.currentValue = this.temperature;
      }),
      this.storage.get(topics.dieTemp(segment, Chip.Alpha)).subscribe((value) => {
        this.alphaChipTemp = parseFloat(value.values[0]);
        this.thermometerConfigAlphaChip.currentValue = this.alphaChipTemp;
      }),
      this.storage.get(topics.dieTemp(segment, Chip.Beta)).subscribe((value) => {
        this.betaChipTemp = parseFloat(value.values[0]);
        this.thermometerConfigBetaChip.currentValue = this.betaChipTemp;
      }),
      this.storage.get(topics.pecErrorChip()).subscribe((value) => {
        const chip = parseInt(value.values[0]);
        if (chip % 2 === 0) {
          this.alphaCrc = parseInt(value.values[0]);
        } else {
          this.betaCrc = parseInt(value.values[0]);
        }
      })
    );
  };

  getAlphaCrcColor = (): string => {
    return this.alphaCrc === 0 ? 'green' : 'red';
  };

  getBetaCrcColor = (): string => {
    return this.betaCrc === 0 ? 'green' : 'red';
  };
  getStatusColor = (): string => {
    return getCellVoltageStatusColor(this.voltage);
  };
  connectionDotConfig: ConnectionDotConfig = {
    type: 'connection-dot-config',
    getStatusColor: this.getStatusColor
  };

  ngOnDestroy(): void {
    this.valueSubscriptions.forEach((sub) => sub.unsubscribe());
  }
}
