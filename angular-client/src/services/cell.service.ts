import { Injectable } from '@angular/core';
import { Chip, numToSegmentType, Segment } from 'src/utils/bms.utils';
import Storage from './storage.service';
import {
  allAlphaBurnValues,
  allAlphaThermValues,
  allAlphaVoltValues,
  allBetaBurnValues,
  allBetaThermValues,
  allBetaVoltValues,
  dataTypes
} from 'src/utils/topic.utils';
import { floatPipe } from 'src/utils/pipes.utils';

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

/* 7 alpha cell reading (for 14 cells) (if we only record data for every other CellReading, or anything like that, adjacents will contain the same data for field) */
export type AlphaCells = [CellReading, CellReading, CellReading, CellReading, CellReading, CellReading, CellReading];
export type PerSegmentAlphaCells = [AlphaCells, AlphaCells, AlphaCells, AlphaCells, AlphaCells];
const createSegmentAlphaCells = (segment: number): AlphaCells => {
  return Array.from(
    { length: 7 },
    (): CellReading => ({
      chip: Chip.Alpha,
      segment,
      temp: undefined,
      volt1: undefined,
      volt2: undefined,
      balancing1: undefined,
      balancing2: undefined,
      cellNumbers: undefined
    })
  ) as AlphaCells; // Type assertion here is safe due to length enforcement
};
const startingPerSegmentAlphaCells: PerSegmentAlphaCells = [
  createSegmentAlphaCells(0),
  createSegmentAlphaCells(1),
  createSegmentAlphaCells(2),
  createSegmentAlphaCells(3),
  createSegmentAlphaCells(4)
];

/* 11 beta cells (if we only record data for every other CellReading, or anything like that, adjacents will contain the same data for field) */
// Explicit tuple types
export type BetaCells = [CellReading, CellReading, CellReading, CellReading, CellReading, CellReading];

export type PerSegmentBetaCells = [BetaCells, BetaCells, BetaCells, BetaCells, BetaCells];

// Utility function to create a BetaCells array for a specific segment
const createSegmentBetaCells = (segment: number): BetaCells => {
  return Array.from(
    { length: 6 },
    (): CellReading => ({
      chip: Chip.Beta,
      segment,
      temp: undefined,
      volt1: undefined,
      volt2: undefined,
      balancing1: undefined,
      balancing2: undefined,
      cellNumbers: undefined
    })
  ) as BetaCells;
};

// Create the main structure
const startingPerSegmentBetaCells: PerSegmentBetaCells = [
  createSegmentBetaCells(0),
  createSegmentBetaCells(1),
  createSegmentBetaCells(2),
  createSegmentBetaCells(3),
  createSegmentBetaCells(4)
];

@Injectable({
  providedIn: 'root'
})
export class CellService {
  private storageService: Storage;
  private perSegmentAlphaCells: PerSegmentAlphaCells;
  private perSegmentBetaCells: PerSegmentBetaCells;

  constructor(storageService: Storage) {
    this.storageService = storageService;
    this.perSegmentAlphaCells = startingPerSegmentAlphaCells;
    this.perSegmentBetaCells = startingPerSegmentBetaCells;
  }

  updateCellInfo = () => {
    this.subscribeToAlphaCellInfo();
    this.subscribeToBetaCellInfo();
    console.log(this.perSegmentAlphaCells);
  };

  private subscribeToAlphaCellInfo = () => {
    this.perSegmentAlphaCells.map((segmentAlphaCells, index) => {
      const segmentNumber = numToSegmentType(index);
      allAlphaThermValues.forEach((therm, index) => {
        this.storageService.get(dataTypes.alphaTemp(segmentNumber, therm)).subscribe((data) => {
          const tempBtwnTwoCells = floatPipe(data.values[0]);
          const cellIndex = index;
          segmentAlphaCells[cellIndex].temp = tempBtwnTwoCells;
          segmentAlphaCells[cellIndex].cellNumbers = [cellIndex * 2, cellIndex * 2 + 1];
        });
      });

      allAlphaVoltValues.forEach((therm, index) => {
        const constIndex = index;
        const cellIndex = Math.floor(constIndex / 2);
        this.storageService.get(dataTypes.alphaVolt(segmentNumber, therm)).subscribe((data) => {
          const voltage = floatPipe(data.values[0]);
          segmentAlphaCells[cellIndex].cellNumbers = [cellIndex * 2, cellIndex * 2 + 1];
          if (constIndex % 2 === 0) {
            segmentAlphaCells[cellIndex].volt1 = voltage;
          } else {
            segmentAlphaCells[cellIndex].volt2 = voltage;
          }
        });
      });

      allAlphaBurnValues.forEach((burn, index) => {
        const constIndex = index;
        const cellIndex = Math.floor(constIndex / 2);
        this.storageService.get(dataTypes.alphaBurning(segmentNumber, burn)).subscribe((data) => {
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
        this.storageService.get(dataTypes.betaTemp(segmentNumber, therm)).subscribe((data) => {
          const tempBtwnTwoCells = floatPipe(data.values[0]);
          segmentBetaCells[constIndex].cellNumbers = [constIndex * 2, Math.min(constIndex * 2 + 1, 10)];

          segmentBetaCells[constIndex].temp = tempBtwnTwoCells;
        });
      });

      allBetaVoltValues.map((volt, index) => {
        const constIndex = index;
        const cellIndex = Math.floor(constIndex / 2);
        this.storageService.get(dataTypes.betaVolt(segmentNumber, volt)).subscribe((data) => {
          const voltage = floatPipe(data.values[0]);
          segmentBetaCells[cellIndex].cellNumbers = [cellIndex * 2, Math.min(cellIndex * 2 + 1, 10)];
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
        this.storageService.get(dataTypes.betaBurning(segmentNumber, burn)).subscribe((data) => {
          const balancing = parseInt(data.values[0]) === 1;
          segmentBetaCells[cellIndex].cellNumbers = [cellIndex * 2, Math.min(cellIndex * 2 + 1, 10)];
          if (constIndex % 2 === 0) {
            segmentBetaCells[cellIndex].balancing1 = balancing;
          } else {
            segmentBetaCells[cellIndex].balancing2 = balancing;
          }
        });
      });
    });
  };

  getAllAlphaCells = (): Readonly<PerSegmentAlphaCells> => {
    return this.perSegmentAlphaCells;
  };

  // 0 2 4 6 8 10 12
  getAlphaCellsBySegment = (segment: number): Readonly<AlphaCells> => {
    return this.perSegmentAlphaCells[segment];
  };

  getAllBetaCells = (): Readonly<PerSegmentBetaCells> => {
    return this.perSegmentBetaCells;
  };

  // 0 2 4 6 8 10
  getBetaCellsBySegment = (segment: number): Readonly<BetaCells> => {
    return this.perSegmentBetaCells[segment];
  };
}
