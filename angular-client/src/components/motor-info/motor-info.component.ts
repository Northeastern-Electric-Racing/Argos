import { Component, OnInit, inject } from '@angular/core';
import Storage from 'src/services/storage.service';
import { DataTypeEnum } from 'src/data-type.enum';
import { floatPipe } from 'src/utils/pipes.utils';

// need access motor temp, motor consumption, and motor cooling

@Component({
  selector: 'motor-info',
  templateUrl: './motor-info.component.html',
  styleUrls: ['./motor-info.component.css']
})
export default class MotorInfoComponent implements OnInit {
  private storage = inject(Storage);
  motorUsage: number = 100;
  coolUsage: number = 0;
  motorTemp: number = 0;
  motorController: number = 25;
  lvBoards: number = 25;
  battboxFans : number = 25;
  pumps : number = 25;


  piechartData: { value: number; name: string }[] = [];

  ngOnInit() {
    this.storage.get(DataTypeEnum.MOTOR_TEMP).subscribe((value) => {
      this.motorTemp = floatPipe(value.values[0]);
      this.updatePieChart();
    });
    this.storage.get(DataTypeEnum.MOTOR_USAGE).subscribe((value) => {
      this.motorUsage = floatPipe(value.values[0]);
      this.updatePieChart();
    });
    this.storage.get(DataTypeEnum.COOL_USAGE).subscribe((value) => {
      this.coolUsage = floatPipe(value.values[0]);
      this.updatePieChart();
    });
    this.storage.get(DataTypeEnum.BATTBOX_FANS).subscribe((value) => {
      this.battboxFans = floatPipe(value.values[0]);
      this.updatePieChart();
    })
    this.storage.get(DataTypeEnum.PUMPS).subscribe((value) => {
      this.pumps = floatPipe(value.values[0]);
      this.updatePieChart();
    })
    this.storage.get(DataTypeEnum.MOTOR_CONTROLLER).subscribe((value) => {
      this.motorController = floatPipe(value.values[0]);
      this.updatePieChart();
      console.log(this.piechartData);
    })
    this.storage.get(DataTypeEnum.LV_BOARDS).subscribe((value) => {
      this.lvBoards = floatPipe(value.values[0]);
      this.updatePieChart();
      console.log(this.piechartData);
    });

    this.piechartData = [
      { value: this.motorController, name: 'Motor Controller' },
      { value: this.battboxFans, name: 'Battbox Fans' },
      { value: this.pumps, name: 'Pumps' } ,
      { value: this.lvBoards, name: 'LV Boards' } 
    ];
  }

  updatePieChart() {
    this.piechartData = [
      { value: this.motorController, name: 'Motor Controller' },
      { value: this.battboxFans, name: 'Battbox Fans' },
      { value: this.pumps, name: 'Pumps' } ,
      { value: this.lvBoards, name: 'LV Boards' } 
    ];
  }

  getTotalUsage(values: number[]) {
    return values.reduce((acc, value) => acc + value, 0);
  }
}
