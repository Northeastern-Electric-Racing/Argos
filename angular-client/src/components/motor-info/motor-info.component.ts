import { Component, OnInit, inject, DestroyRef, ChangeDetectionStrategy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import Storage from 'src/services/storage.service';
import { topics } from 'src/utils/topic.utils';
import { floatPipe } from 'src/utils/pipes.utils';
import { InfoBackgroundComponent } from '../info-background/info-background.component';

import { DividerComponent } from '../divider/divider';
import PieChartComponent from '../pie-chart/pie-chart.component';
import TypographyComponent from '../typography/typography.component';
import HStackComponent from '../hstack/hstack.component';
import VStackComponent from '../vstack/vstack.component';
import ThermometerComponent from '../thermometer/thermometer.component';
import { tw } from 'src/ui/recipes/tw';

@Component({
  selector: 'motor-info',
  templateUrl: './motor-info.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [
    InfoBackgroundComponent,
    DividerComponent,
    PieChartComponent,
    TypographyComponent,
    HStackComponent,
    VStackComponent,
    ThermometerComponent
  ]
})
export default class MotorInfoComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private storage = inject(Storage);
  motorUsage: number = 100;
  coolUsage: number = 0;
  motorTemp: number = 0;
  motorController: number = 0;
  lvBoards: number = 0;
  battboxFans: number = 0;
  pumps: number = 0;

  piechartData: { value: number; name: string }[] = [];

  /**
   * #909's row: the readings left, the usage pie pulled into the card's top-right corner. On phones the pie no
   * longer fits beside the readings (it widened the page by 243px), so the row wraps, the pie takes its own
   * line at the card's width, and the card grows to hold it.
   */
  protected readonly layout = {
    row: tw('flex h-37.5 w-full flex-row justify-between max-md:h-auto max-md:flex-wrap'),
    pie: tw('-mt-5 -mr-11.25 max-md:mt-2 max-md:mr-0 max-md:w-full')
  } as const;

  ngOnInit() {
    this.storage
      .get(topics.motorTemp())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        this.motorTemp = floatPipe(value.values[0]);
        this.updatePieChart();
      });
    this.storage
      .get(topics.motorUsage())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        this.motorUsage = floatPipe(value.values[0]);
        this.updatePieChart();
      });
    this.storage
      .get(topics.coolingUsage())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        this.coolUsage = floatPipe(value.values[0]);
        this.updatePieChart();
      });
    this.storage
      .get(topics.battboxFans())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        this.battboxFans = floatPipe(value.values[0]);
        this.updatePieChart();
      });
    this.storage
      .get(topics.pumps())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        this.pumps = floatPipe(value.values[0]);
        this.updatePieChart();
      });
    this.storage
      .get(topics.motorController())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        this.motorController = floatPipe(value.values[0]);
        this.updatePieChart();
      });
    this.storage
      .get(topics.lvBoards())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        this.lvBoards = floatPipe(value.values[0]);
        this.updatePieChart();
      });

    this.updatePieChart();
  }

  updatePieChart() {
    const totalUsed = this.motorController + this.battboxFans + this.pumps + this.lvBoards;
    const remainingUnused = Math.max(0, 20 - totalUsed);

    this.piechartData = [
      { value: this.motorController, name: 'Motor Controller' },
      { value: this.battboxFans, name: 'Battbox Fans' },
      { value: this.pumps, name: 'Pumps' },
      { value: this.lvBoards, name: 'LV Boards' },
      { value: remainingUnused, name: 'None' }
    ];
  }

  getTotalUsage(values: number[]) {
    return values.reduce((acc, value) => acc + value, 0);
  }
}
