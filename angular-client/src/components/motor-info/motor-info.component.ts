import { Component, OnInit, inject } from '@angular/core';
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

// need access motor temp, motor consumption, and motor cooling

@Component({
    selector: 'motor-info',
    templateUrl: './motor-info.component.html',
    styleUrls: ['./motor-info.component.css'],
    standalone: true,
    imports: [InfoBackgroundComponent, DividerComponent, PieChartComponent, TypographyComponent, HStackComponent,VStackComponent, ThermometerComponent]
})
export default class MotorInfoComponent implements OnInit {
  private storage = inject(Storage);
  motorUsage: number = 100;
  coolUsage: number = 0;
  motorTemp: number = 0;

  piechartData: { value: number; name: string }[] = [];

  ngOnInit() {
    this.storage.get(DataTypeEnum.MOTOR_TEMP).subscribe((value) => {
      this.motorTemp = floatPipe(value.values[0]);
    });
    this.storage.get(DataTypeEnum.MOTOR_USAGE).subscribe((value) => {
      this.motorUsage = floatPipe(value.values[0]);
    });
    this.storage.get(DataTypeEnum.COOL_USAGE).subscribe((value) => {
      this.coolUsage = floatPipe(value.values[0]);
    });
    this.piechartData = [
      { value: this.motorUsage, name: 'Motor' },
      { value: this.coolUsage, name: 'Cooling' }
    ];
  }

  getTotalUsage(values: number[]) {
    return values.reduce((acc, value) => acc + value, 0);
  }
}
