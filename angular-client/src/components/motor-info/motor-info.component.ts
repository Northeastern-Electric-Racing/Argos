import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import Storage from 'src/services/storage.service';
import { DataTypeEnum } from 'src/data-type.enum';
import { floatPipe } from 'src/utils/pipes.utils';
import { InfoBackgroundComponent } from '../info-background/info-background.component';

import { DividerComponent } from '../divider/divider';
import PieChartComponent from '../pie-chart/pie-chart.component';
import TypographyComponent from '../typography/typography.component';
import HStackComponent from '../hstack/hstack.component';
import VStackComponent from '../vstack/vstack.component';
import ThermometerComponent from '../thermometer/thermometer.component';
import { Subscription } from 'rxjs';

@Component({
  selector: 'motor-info',
  templateUrl: './motor-info.component.html',
  styleUrls: ['./motor-info.component.css'],
  standalone: true,
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
export default class MotorInfoComponent implements OnInit, OnDestroy {
  private storage = inject(Storage);
  motorUsage: number = 100;
  coolUsage: number = 0;
  motorTemp: number = 0;
  motorController: number = 25;
  lvBoards: number = 25;
  battboxFans: number = 25;
  pumps: number = 25;
  private subscriptions: Subscription[] = [];

  piechartData: { value: number; name: string }[] = [];

  ngOnInit() {
    this.subscriptions.push(
      this.storage.get(DataTypeEnum.MOTOR_TEMP).subscribe((value) => {
        this.motorTemp = floatPipe(value.values[0]);
        this.updatePieChart();
      }),
      this.storage.get(DataTypeEnum.MOTOR_USAGE).subscribe((value) => {
        this.motorUsage = floatPipe(value.values[0]);
        this.updatePieChart();
      }),
      this.storage.get(DataTypeEnum.COOL_USAGE).subscribe((value) => {
        this.coolUsage = floatPipe(value.values[0]);
        this.updatePieChart();
      }),
      this.storage.get(DataTypeEnum.BATTBOX_FANS).subscribe((value) => {
        this.battboxFans = floatPipe(value.values[0]);
        this.updatePieChart();
      }),
      this.storage.get(DataTypeEnum.PUMPS).subscribe((value) => {
        this.pumps = floatPipe(value.values[0]);
        this.updatePieChart();
      }),
      this.storage.get(DataTypeEnum.MOTOR_CONTROLLER).subscribe((value) => {
        this.motorController = floatPipe(value.values[0]);
        this.updatePieChart();
      }),
      this.storage.get(DataTypeEnum.LV_BOARDS).subscribe((value) => {
        this.lvBoards = floatPipe(value.values[0]);
        this.updatePieChart();
      })
    );

    // Calculate total usage of the four components
    const totalUsed = this.motorController + this.battboxFans + this.pumps + this.lvBoards;
    // Calculate the remaining unused portion out of 20
    const remainingUnused = Math.max(0, 20 - totalUsed);

    this.piechartData = [
      { value: this.motorController, name: 'Motor Controller' },
      { value: this.battboxFans, name: 'Battbox Fans' },
      { value: this.pumps, name: 'Pumps' },
      { value: this.lvBoards, name: 'LV Boards' },
      { value: remainingUnused, name: 'None' }
    ];
  }

  updatePieChart() {
    // Calculate total usage of the four components
    const totalUsed = this.motorController + this.battboxFans + this.pumps + this.lvBoards;
    // Calculate the remaining unused portion out of 20
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

  ngOnDestroy(): void {
    this.subscriptions.forEach((subscription) => {
      subscription.unsubscribe();
    });
    this.subscriptions = [];
  }
}
