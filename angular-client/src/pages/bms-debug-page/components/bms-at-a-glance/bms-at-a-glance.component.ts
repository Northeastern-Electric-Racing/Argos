import { Component, HostListener, inject, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import Storage from 'src/services/storage.service';
import { Chip, chipToString, getConnectionDotStatusColor } from 'src/utils/bms.utils';
import { topics } from 'src/utils/topic.utils';
import { InfoPanelComponent } from '../../../../components/info-panel/info-panel.component';
import {
  StatDisplayListComponent,
  StatDisplayListConfig
} from '../../../../components/stat-display-list/stat-display-list.component';

@Component({
  selector: 'bms-at-a-glance',
  templateUrl: './bms-at-a-glance.component.html',
  styleUrl: './bms-at-a-glance.component.css',
  standalone: true,
  imports: [InfoPanelComponent, StatDisplayListComponent]
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

  get statDisplayConfigs(): StatDisplayListConfig[] {
    return [
      {
        key: 'pack-voltage',
        value: this.voltage,
        unit: 'V',
        subtitle: 'Pack Voltage',
        widget: { type: 'connection-dot', getStatusColor: this.getStatusColor }
      },
      {
        key: 'pack-temp',
        value: this.temperature,
        unit: 'C',
        subtitle: 'Average Temp.',
        unitBelow: true,
        widget: { type: 'thermometer', value: this.temperature, min: -15, max: 30 }
      },
      {
        key: 'charge-state',
        value: this.chargeState,
        unit: '%',
        subtitle: 'Charge State',
        unitBelow: true,
        widget: { type: 'battery-level-indicator', value: this.chargeState }
      },
      {
        key: 'ccl',
        value: this.ccl,
        unit: 'A',
        subtitle: 'CCL'
      },
      {
        key: 'dcl',
        value: this.dcl,
        unit: 'A',
        subtitle: 'DCL'
      },
      {
        key: 'high-voltage',
        value: this.highVoltage,
        unit: 'V',
        precision: 3,
        subtitle: 'High Voltage',
        headerLabel: this.getCellChipLabel(this.highVoltageCell, this.highVoltageChip),
        headerIcon: 'battery'
      },
      {
        key: 'low-voltage',
        value: this.lowVoltage,
        unit: 'V',
        precision: 3,
        subtitle: 'Low Voltage',
        headerLabel: this.getCellChipLabel(this.lowVoltageCell, this.lowVoltageChip),
        headerIcon: 'battery'
      },
      {
        key: 'high-temp',
        value: this.highTemp,
        unit: 'C',
        precision: 2,
        subtitle: 'High Temp.',
        unitBelow: true,
        headerLabel: this.getCellChipLabel(this.highTempCell, this.highTempChip),
        headerIcon: 'battery'
      }
    ];
  }

  enableWidgets = window.innerWidth >= 1000;
  @HostListener('window:resize')
  onResize() {
    this.enableWidgets = window.innerWidth >= 1000;
  }

  ngOnInit(): void {
    this.subscriptions.push(
      this.storage.get(topics.packVoltage()).subscribe((value) => {
        this.voltage = parseFloat(value.values[0]);
      }),
      this.storage.get(topics.packTemp()).subscribe((value) => {
        this.temperature = parseInt(value.values[0]);
      }),
      this.storage.get(topics.stateOfCharge()).subscribe((value) => {
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
