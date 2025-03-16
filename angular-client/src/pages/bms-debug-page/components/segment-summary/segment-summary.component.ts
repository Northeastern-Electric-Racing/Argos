import { Component, inject, input, OnInit } from '@angular/core';
import { DataTypeEnum } from 'src/data-type.enum';
import Storage from 'src/services/storage.service';

export enum SegmentSummarys {
  Segment1 = 1,
  Segment2 = 2,
  Segment3 = 3,
  Segment4 = 4,
  Segment5 = 5
}

@Component({
  selector: 'segment-summary',
  templateUrl: './segment-summary.component.html',
  styleUrl: './segment-summary.component.css'
})
export class SegmentSummaryComponent implements OnInit {
  private storage = inject(Storage);
  segmentNumber = input.required<SegmentSummarys>();
  temperature!: number;
  alphaChipTemp!: number;
  betaChipTemp!: number;
  voltage!: number;

  ngOnInit(): void {
    this.subscribeAndUpdateTemperature();
  }

  subscribeAndUpdateTemperature = () => {
    const [segmentTempKey, alphaChipTempKey, betaChipTempKey, voltageKey] = this.getRelevantKeys();

    this.storage.get(segmentTempKey).subscribe((value) => {
      this.temperature = parseFloat(value.values[0]);
    });
    this.storage.get(alphaChipTempKey).subscribe((value) => {
      this.alphaChipTemp = parseFloat(value.values[0]);
    });
    this.storage.get(betaChipTempKey).subscribe((value) => {
      this.betaChipTemp = parseFloat(value.values[0]);
    });
    this.storage.get(voltageKey).subscribe((value) => {
      this.voltage = parseFloat(value.values[0]);
    });
  };

  openSegmentPage = () => {
    // Open the segment page with the segment number
    console.log('TODO: Opening segment page for segment: ', this.segmentNumber());
  };

  getRelevantKeys = (): [DataTypeEnum, DataTypeEnum, DataTypeEnum, DataTypeEnum] => {
    let segmentTempKey!: DataTypeEnum;
    let alphaChipTempKey!: DataTypeEnum;
    let betaChipTempKey!: DataTypeEnum;
    let voltageKey!: DataTypeEnum;

    switch (this.segmentNumber()) {
      case SegmentSummarys.Segment1:
        segmentTempKey = DataTypeEnum.Segment_Temp_1;
        alphaChipTempKey = DataTypeEnum.PER_CELL_ALPHA_DIE_TEMP_0;
        betaChipTempKey = DataTypeEnum.PER_CELL_BETA_DIE_TEMP_0;
        voltageKey = DataTypeEnum.Segment_Voltage_1;
        break;
      case SegmentSummarys.Segment2:
        segmentTempKey = DataTypeEnum.Segment_Temp_2;
        alphaChipTempKey = DataTypeEnum.PER_CELL_ALPHA_DIE_TEMP_1;
        betaChipTempKey = DataTypeEnum.PER_CELL_BETA_DIE_TEMP_1;
        voltageKey = DataTypeEnum.Segment_Voltage_2;
        break;
      case SegmentSummarys.Segment3:
        segmentTempKey = DataTypeEnum.Segment_Temp_3;
        alphaChipTempKey = DataTypeEnum.PER_CELL_ALPHA_DIE_TEMP_2;
        betaChipTempKey = DataTypeEnum.PER_CELL_BETA_DIE_TEMP_2;
        voltageKey = DataTypeEnum.Segment_Voltage_3;
        break;
      case SegmentSummarys.Segment4:
        segmentTempKey = DataTypeEnum.Segment_Temp_4;
        alphaChipTempKey = DataTypeEnum.PER_CELL_ALPHA_DIE_TEMP_3;
        betaChipTempKey = DataTypeEnum.PER_CELL_BETA_DIE_TEMP_3;
        voltageKey = DataTypeEnum.Segment_Voltage_4;
        break;
      case SegmentSummarys.Segment5:
        segmentTempKey = DataTypeEnum.Segment_Temp_5;
        alphaChipTempKey = DataTypeEnum.PER_CELL_ALPHA_DIE_TEMP_4;
        betaChipTempKey = DataTypeEnum.PER_CELL_BETA_DIE_TEMP_4;
        voltageKey = DataTypeEnum.Segment_Voltage_5;
        break;
    }
    return [segmentTempKey, alphaChipTempKey, betaChipTempKey, voltageKey];
  };
}
