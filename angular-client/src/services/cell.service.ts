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
  voltage: number | undefined;
  balancing: boolean | undefined;
  cellNumber: number;
};

const createSegmentCells = (segment: number, chip: Chip, count: number): CellReading[] => {
  return Array.from(
    { length: count },
    (_, i): CellReading => ({
      chip,
      segment,
      temp: undefined,
      voltage: undefined,
      balancing: undefined,
      cellNumber: i
    })
  );
};

const createPerSegmentCells = (chip: Chip, cellsPerSegment: number): CellReading[][] => {
  return Array.from({ length: BMS_CONFIG.NUM_SEGMENTS }, (_, seg) => createSegmentCells(seg, chip, cellsPerSegment));
};

const startingPerSegmentAlphaCells: CellReading[][] = createPerSegmentCells(Chip.Alpha, BMS_CONFIG.ALPHA_VOLT_COUNT);
const startingPerSegmentBetaCells: CellReading[][] = createPerSegmentCells(Chip.Beta, BMS_CONFIG.BETA_VOLT_COUNT);

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

      // Therms: each therm covers two adjacent cells
      allAlphaThermValues.forEach((therm, thermIndex) => {
        this.storageService.get(topics.alphaTemp(segmentNumber, therm)).subscribe((data) => {
          const temp = parseFloat(data.values[0]);
          const cellA = thermIndex * 2;
          const cellB = thermIndex * 2 + 1;
          segmentAlphaCells[cellA].temp = temp;
          if (cellB < segmentAlphaCells.length) {
            segmentAlphaCells[cellB].temp = temp;
          }
        });
      });

      // Volts: one per cell
      allAlphaVoltValues.forEach((volt, voltIndex) => {
        this.storageService.get(topics.alphaVolt(segmentNumber, volt)).subscribe((data) => {
          segmentAlphaCells[voltIndex].voltage = parseFloat(data.values[0]);
        });
      });

      // Burns: one per cell
      allAlphaBurnValues.forEach((burn, burnIndex) => {
        this.storageService.get(topics.alphaBurning(segmentNumber, burn)).subscribe((data) => {
          segmentAlphaCells[burnIndex].balancing = parseInt(data.values[0]) === 1;
        });
      });
    });
  };

  private subscribeToBetaCellInfo = () => {
    this.perSegmentBetaCells.map((segmentBetaCells, index) => {
      const segmentNumber = numToSegmentType(index);

      // Therms: each therm covers two adjacent cells
      allBetaThermValues.map((therm, thermIndex) => {
        this.storageService.get(topics.betaTemp(segmentNumber, therm)).subscribe((data) => {
          const temp = parseFloat(data.values[0]);
          const cellA = thermIndex * 2;
          const cellB = thermIndex * 2 + 1;
          segmentBetaCells[cellA].temp = temp;
          if (cellB < segmentBetaCells.length) {
            segmentBetaCells[cellB].temp = temp;
          }
        });
      });

      // Volts: one per cell
      allBetaVoltValues.map((volt, voltIndex) => {
        this.storageService.get(topics.betaVolt(segmentNumber, volt)).subscribe((data) => {
          segmentBetaCells[voltIndex].voltage = parseFloat(data.values[0]);
        });
      });

      // Burns: one per cell
      allBetaBurnValues.map((burn, burnIndex) => {
        this.storageService.get(topics.betaBurning(segmentNumber, burn)).subscribe((data) => {
          segmentBetaCells[burnIndex].balancing = parseInt(data.values[0]) === 1;
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
