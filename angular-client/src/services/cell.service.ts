import { Injectable } from '@angular/core';
import { BMS_CONFIG } from 'src/utils/bms.config';
import { Chip, numToSegmentType, Segment } from 'src/utils/bms.utils';
import Storage from './storage.service';
import {
  allAlphaBurnValues,
  allAlphaThermValues,
  allAlphaVoltValues,
  allBetaBurnValues,
  allBetaThermValues,
  allBetaVoltValues,
  topics
} from 'src/utils/topic.utils';

export type CellReading = {
  chip: Chip;
  segment: Segment;
  temp: number | undefined;
  volt1: number | undefined;
  volt2: number | undefined;
  balancing1: boolean | undefined;
  balancing2: boolean | undefined;
  cellNumbers: [number, number] | undefined;
};

const createSegmentCells = (segment: number, chip: Chip, count: number): CellReading[] => {
  return Array.from(
    { length: count },
    (): CellReading => ({
      chip,
      segment,
      temp: undefined,
      volt1: undefined,
      volt2: undefined,
      balancing1: undefined,
      balancing2: undefined,
      cellNumbers: undefined
    })
  );
};

const createPerSegmentCells = (chip: Chip, cellsPerSegment: number): CellReading[][] => {
  return Array.from({ length: BMS_CONFIG.NUM_SEGMENTS }, (_, seg) => createSegmentCells(seg, chip, cellsPerSegment));
};

const startingPerSegmentAlphaCells: CellReading[][] = createPerSegmentCells(Chip.Alpha, BMS_CONFIG.ALPHA_THERM_COUNT);
const startingPerSegmentBetaCells: CellReading[][] = createPerSegmentCells(Chip.Beta, BMS_CONFIG.BETA_THERM_COUNT);

@Injectable({
  providedIn: 'root'
})
export class CellService {
  private storageService: Storage;
  private perSegmentAlphaCells: CellReading[][];
  private perSegmentBetaCells: CellReading[][];

  constructor(storageService: Storage) {
    this.storageService = storageService;
    this.perSegmentAlphaCells = startingPerSegmentAlphaCells;
    this.perSegmentBetaCells = startingPerSegmentBetaCells;
  }

  updateCellInfo = () => {
    this.subscribeToAlphaCellInfo();
    this.subscribeToBetaCellInfo();
  };

  private subscribeToAlphaCellInfo = () => {
    this.perSegmentAlphaCells.map((segmentAlphaCells, index) => {
      const segmentNumber = numToSegmentType(index);
      allAlphaThermValues.forEach((therm, index) => {
        this.storageService.get(topics.alphaTemp(segmentNumber, therm)).subscribe((data) => {
          const tempBtwnTwoCells = parseFloat(data.values[0]);
          const cellIndex = index;
          segmentAlphaCells[cellIndex].temp = tempBtwnTwoCells;
          segmentAlphaCells[cellIndex].cellNumbers = [cellIndex * 2, cellIndex * 2 + 1];
        });
      });

      allAlphaVoltValues.forEach((therm, index) => {
        const constIndex = index;
        const cellIndex = Math.floor(constIndex / 2);
        this.storageService.get(topics.alphaVolt(segmentNumber, therm)).subscribe((data) => {
          const voltage = parseFloat(data.values[0]);
          if (constIndex % 2 === 0) {
            segmentAlphaCells[cellIndex].cellNumbers = [cellIndex * 2, cellIndex * 2 + 1];
            segmentAlphaCells[cellIndex].volt1 = voltage;
          } else {
            segmentAlphaCells[cellIndex].volt2 = voltage;
          }
        });
      });

      allAlphaBurnValues.forEach((burn, index) => {
        const constIndex = index;
        const cellIndex = Math.floor(constIndex / 2);
        this.storageService.get(topics.alphaBurning(segmentNumber, burn)).subscribe((data) => {
          const balancing = parseInt(data.values[0]) === 1;
          segmentAlphaCells[cellIndex].cellNumbers = [cellIndex * 2, cellIndex * 2 + 1];
          if (constIndex % 2 === 0) {
            segmentAlphaCells[cellIndex].balancing1 = balancing;
          } else {
            segmentAlphaCells[cellIndex].balancing2 = balancing;
          }
        });
      });
    });
  };

  private subscribeToBetaCellInfo = () => {
    this.perSegmentBetaCells.map((segmentBetaCells, index) => {
      const segmentNumber = numToSegmentType(index);
      allBetaThermValues.map((therm, index) => {
        const constIndex = index;
        this.storageService.get(topics.betaTemp(segmentNumber, therm)).subscribe((data) => {
          const tempBtwnTwoCells = parseFloat(data.values[0]);
          segmentBetaCells[constIndex].cellNumbers = [
            constIndex * 2,
            Math.min(constIndex * 2 + 1, BMS_CONFIG.BETA_VOLT_COUNT - 1)
          ];

          segmentBetaCells[constIndex].temp = tempBtwnTwoCells;
        });
      });

      allBetaVoltValues.map((volt, index) => {
        const constIndex = index;
        const cellIndex = Math.floor(constIndex / 2);
        this.storageService.get(topics.betaVolt(segmentNumber, volt)).subscribe((data) => {
          const voltage = parseFloat(data.values[0]);
          segmentBetaCells[cellIndex].cellNumbers = [
            cellIndex * 2,
            Math.min(cellIndex * 2 + 1, BMS_CONFIG.BETA_VOLT_COUNT - 1)
          ];
          if (constIndex % 2 === 0) {
            segmentBetaCells[cellIndex].volt1 = voltage;
          } else {
            segmentBetaCells[cellIndex].volt2 = voltage;
          }
        });
      });

      allBetaBurnValues.map((burn, index) => {
        const constIndex = index;
        const cellIndex = Math.floor(constIndex / 2);
        this.storageService.get(topics.betaBurning(segmentNumber, burn)).subscribe((data) => {
          const balancing = parseInt(data.values[0]) === 1;
          segmentBetaCells[cellIndex].cellNumbers = [
            cellIndex * 2,
            Math.min(cellIndex * 2 + 1, BMS_CONFIG.BETA_VOLT_COUNT - 1)
          ];
          if (constIndex % 2 === 0) {
            segmentBetaCells[cellIndex].balancing1 = balancing;
          } else {
            segmentBetaCells[cellIndex].balancing2 = balancing;
          }
        });
      });
    });
  };

  getAllAlphaCells = (): Readonly<CellReading[][]> => {
    return this.perSegmentAlphaCells;
  };

  getAlphaCellsBySegment = (segment: number): Readonly<CellReading[]> => {
    return this.perSegmentAlphaCells[segment];
  };

  getAllBetaCells = (): Readonly<CellReading[][]> => {
    return this.perSegmentBetaCells;
  };

  getBetaCellsBySegment = (segment: number): Readonly<CellReading[]> => {
    return this.perSegmentBetaCells[segment];
  };
}
