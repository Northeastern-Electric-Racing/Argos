import { Injectable, inject } from '@angular/core';
import { Subscription } from 'rxjs';
import { ALPHA_THERM_CELL_MAP, BETA_THERM_CELL_MAP, BMS_CONFIG } from 'src/utils/bms.config';
import { Chip, numToSegmentType, Segment } from 'src/utils/bms.utils';
import Storage from './storage.service';
import {
  allAlphaBurnValues,
  allAlphaCvsValues,
  allAlphaOwValues,
  allAlphaSVoltValues,
  allAlphaThermValues,
  allAlphaVoltValues,
  allBetaBurnValues,
  allBetaCvsValues,
  allBetaOwValues,
  allBetaSVoltValues,
  allBetaThermValues,
  allBetaVoltValues,
  topics
} from 'src/utils/topic.utils';

export type CellReading = {
  chip: Chip;
  segment: Segment;
  temp: number | undefined;
  voltage: number | undefined;
  svolts: number | undefined;
  balancing: boolean | undefined;
  cvs: boolean | undefined;
  ow: boolean | undefined;
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
      svolts: undefined,
      balancing: undefined,
      cvs: undefined,
      ow: undefined,
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
  private storageService = inject(Storage);
  private perSegmentAlphaCells: CellReading[][] = startingPerSegmentAlphaCells;
  private perSegmentBetaCells: CellReading[][] = startingPerSegmentBetaCells;

  private subscriptions = new Subscription();
  private readers = 0;

  /**
   * Keeps the ~720 BMS cell topics subscribed until the returned release is called, so a
   * client reads them only while something shows cell data. The first reader subscribes them
   * (Storage replays each topic's latest value, so a quick page switch keeps the readings); the
   * last release drops them and clears the readings, which would otherwise go stale.
   */
  retain = (): (() => void) => {
    if (this.readers++ === 0) {
      this.subscribeToAlphaCellInfo();
      this.subscribeToBetaCellInfo();
    }
    let released = false;
    return () => {
      if (released) return;
      released = true;
      if (--this.readers > 0) return;
      this.subscriptions.unsubscribe();
      this.subscriptions = new Subscription();
      this.clearReadings();
    };
  };

  /** Applies each value of a topic to the cells while retained. */
  private read = (topic: string, apply: (value: string) => void) => {
    this.subscriptions.add(this.storageService.get(topic).subscribe((data) => apply(data.values[0])));
  };

  private clearReadings = () => {
    for (const cell of [...this.perSegmentAlphaCells, ...this.perSegmentBetaCells].flat()) {
      cell.temp = cell.voltage = cell.svolts = undefined;
      cell.balancing = cell.cvs = cell.ow = undefined;
    }
  };

  private subscribeToAlphaCellInfo = () => {
    this.perSegmentAlphaCells.forEach((segmentAlphaCells, index) => {
      const segmentNumber = numToSegmentType(index);

      // Therms: apply temperature to cells defined in ALPHA_THERM_CELL_MAP
      allAlphaThermValues.forEach((therm, thermIndex) => {
        this.read(topics.alphaTemp(segmentNumber, therm), (value) => {
          const temp = parseFloat(value);
          const cellIndices = ALPHA_THERM_CELL_MAP[thermIndex] ?? [];
          for (const cellIdx of cellIndices) {
            if (cellIdx < segmentAlphaCells.length) {
              segmentAlphaCells[cellIdx].temp = temp;
            }
          }
        });
      });

      // Volts: one per cell (C-ADC voltage)
      allAlphaVoltValues.forEach((volt, voltIndex) => {
        this.read(topics.alphaVolt(segmentNumber, volt), (value) => {
          segmentAlphaCells[voltIndex].voltage = parseFloat(value);
        });
      });

      // S Volts: one per cell (S-ADC voltage, mirrors Volts)
      allAlphaSVoltValues.forEach((sVolt, sVoltIndex) => {
        this.read(topics.alphaSVolt(segmentNumber, sVolt), (value) => {
          segmentAlphaCells[sVoltIndex].svolts = parseFloat(value);
        });
      });

      // Burns: one per cell
      allAlphaBurnValues.forEach((burn, burnIndex) => {
        this.read(topics.alphaBurning(segmentNumber, burn), (value) => {
          segmentAlphaCells[burnIndex].balancing = parseInt(value) === 1;
        });
      });

      // CvS: one per cell
      allAlphaCvsValues.forEach((cvs, cvsIndex) => {
        this.read(topics.alphaCvs(segmentNumber, cvs), (value) => {
          segmentAlphaCells[cvsIndex].cvs = parseInt(value) === 1;
        });
      });

      // Open Wire: one per cell (mirrors CvS)
      allAlphaOwValues.forEach((ow, owIndex) => {
        this.read(topics.alphaOw(segmentNumber, ow), (value) => {
          segmentAlphaCells[owIndex].ow = parseInt(value) === 1;
        });
      });
    });
  };

  private subscribeToBetaCellInfo = () => {
    this.perSegmentBetaCells.forEach((segmentBetaCells, index) => {
      const segmentNumber = numToSegmentType(index);

      // Therms: apply temperature to cells defined in BETA_THERM_CELL_MAP
      allBetaThermValues.forEach((therm, thermIndex) => {
        this.read(topics.betaTemp(segmentNumber, therm), (value) => {
          const temp = parseFloat(value);
          const cellIndices = BETA_THERM_CELL_MAP[thermIndex] ?? [];
          for (const cellIdx of cellIndices) {
            if (cellIdx < segmentBetaCells.length) {
              segmentBetaCells[cellIdx].temp = temp;
            }
          }
        });
      });

      // Volts: one per cell (C-ADC voltage)
      allBetaVoltValues.forEach((volt, voltIndex) => {
        this.read(topics.betaVolt(segmentNumber, volt), (value) => {
          segmentBetaCells[voltIndex].voltage = parseFloat(value);
        });
      });

      // S Volts: one per cell (S-ADC voltage, mirrors Volts)
      allBetaSVoltValues.forEach((sVolt, sVoltIndex) => {
        this.read(topics.betaSVolt(segmentNumber, sVolt), (value) => {
          segmentBetaCells[sVoltIndex].svolts = parseFloat(value);
        });
      });

      // Burns: one per cell
      allBetaBurnValues.forEach((burn, burnIndex) => {
        this.read(topics.betaBurning(segmentNumber, burn), (value) => {
          segmentBetaCells[burnIndex].balancing = parseInt(value) === 1;
        });
      });

      // CvS: one per cell
      allBetaCvsValues.forEach((cvs, cvsIndex) => {
        this.read(topics.betaCvs(segmentNumber, cvs), (value) => {
          segmentBetaCells[cvsIndex].cvs = parseInt(value) === 1;
        });
      });

      // Open Wire: one per cell (mirrors CvS)
      allBetaOwValues.forEach((ow, owIndex) => {
        this.read(topics.betaOw(segmentNumber, ow), (value) => {
          segmentBetaCells[owIndex].ow = parseInt(value) === 1;
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
