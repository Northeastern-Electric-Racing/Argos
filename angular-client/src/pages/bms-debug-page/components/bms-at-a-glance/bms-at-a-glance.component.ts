import { Component, HostListener, inject, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { DataTypeEnum } from 'src/data-type.enum';
import Storage from 'src/services/storage.service';
import { Chip, chipToString, getConnectionDotStatusColor } from 'src/utils/bms.utils';
import { topics } from 'src/utils/topic.utils';
import { InfoPanelComponent } from '../../../../components/info-panel/info-panel.component';
import { StatDisplayComponent } from '../../../../components/stat-display/stat-display.component';
import { ConnectionDotWithMessageComponent } from '../../../../components/connection-dot-with-message/connection-dot-with-message.component';
import { BatteryLevelIndicatorComponent } from '../../../../components/battery-level-indicator/battery-level-indicator.component';
import { GlanceThermometerComponent } from '../../../../components/glance-thermometer/glance-thermometer.component';

@Component({
  selector: 'bms-at-a-glance',
  templateUrl: './bms-at-a-glance.component.html',
  styleUrl: './bms-at-a-glance.component.css',
  standalone: true,
  imports: [
    InfoPanelComponent,
    StatDisplayComponent,
    ConnectionDotWithMessageComponent,
    BatteryLevelIndicatorComponent,
    GlanceThermometerComponent
  ]
})
export class BmsAtAGlanceComponent implements OnInit, OnDestroy {
  private storage = inject(Storage);
  private subscriptions: Subscription[] = [];
  voltage: number = 0;
  temperature: number = 0;
  chargeState: number = 0;
  ccl: number = 0;
  dcl: number = 0;
  highVoltage: number | undefined = undefined;
  highVoltageChip: Chip | undefined = undefined;
  highVoltageCell: number | undefined = undefined;
  lowVoltage: number | undefined = undefined;
  lowVoltageChip: Chip | undefined = undefined;
  lowVoltageCell: number | undefined = undefined;
  highTemp: number | undefined = undefined;
  highTempChip: Chip | undefined = undefined;
  highTempCell: number | undefined = undefined;
  getStatusColor = (): string => {
    return getConnectionDotStatusColor(this.voltage);
  };
  enableWidgets = window.innerWidth >= 1000;
  @HostListener('window:resize')
  onResize() {
    this.enableWidgets = window.innerWidth >= 1000;
  }

  ngOnInit(): void {
    this.subscriptions.push(
      this.storage.get(DataTypeEnum.PACK_VOLTAGE).subscribe((value) => {
        this.voltage = parseInt(value.values[0]);
      }),
      this.storage.get(DataTypeEnum.PACK_TEMP).subscribe((value) => {
        this.temperature = parseInt(value.values[0]);
      }),
      this.storage.get(DataTypeEnum.STATE_OF_CHARGE).subscribe((value) => {
        this.chargeState = parseInt(value.values[0]);
      }),
      this.storage.get(topics.accCCL()).subscribe((value) => {
        this.ccl = parseInt(value.values[0]);
      }),
      this.storage.get(topics.accDCL()).subscribe((value) => {
        this.dcl = parseInt(value.values[0]);
      }),
      this.storage.get(topics.highVoltsValue()).subscribe((value) => {
        this.highVoltage = parseFloat(value.values[0]);
      }),
      this.storage.get(topics.highVoltsChip()).subscribe((value) => {
        this.highVoltageChip = this.getChipFromTopicValue(parseInt(value.values[0]));
      }),
      this.storage.get(topics.highVoltsCell()).subscribe((value) => {
        this.highVoltageCell = parseInt(value.values[0]);
      }),
      this.storage.get(topics.lowVoltsValue()).subscribe((value) => {
        this.lowVoltage = parseFloat(value.values[0]);
      }),
      this.storage.get(topics.lowVoltsChip()).subscribe((value) => {
        this.lowVoltageChip = this.getChipFromTopicValue(parseInt(value.values[0]));
      }),
      this.storage.get(topics.lowVoltsCell()).subscribe((value) => {
        this.lowVoltageCell = parseInt(value.values[0]);
      }),
      this.storage.get(topics.highTempValue()).subscribe((value) => {
        this.highTemp = parseFloat(value.values[0]);
      }),
      this.storage.get(topics.highTempChip()).subscribe((value) => {
        this.highTempChip = this.getChipFromTopicValue(parseInt(value.values[0]));
      }),
      this.storage.get(topics.highTempCell()).subscribe((value) => {
        this.highTempCell = parseInt(value.values[0]);
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }

  getCellChipLabel = (cell: number | undefined, chip: Chip | undefined): string => {
    const cellLabel = cell !== undefined ? `Cell: ${cell}` : 'No Cell';
    const chipLabel = chip !== undefined ? `Chip: ${chipToString(chip, true)}` : 'No Chip';
    return `${cellLabel} | ${chipLabel}`;
  };

  private getChipFromTopicValue = (chipValue: number): Chip => {
    return chipValue % 2 === 0 ? Chip.Alpha : Chip.Beta;
  };
}
