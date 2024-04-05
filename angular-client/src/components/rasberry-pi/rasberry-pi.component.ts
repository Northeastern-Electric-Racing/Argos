import { Component } from '@angular/core';
import Storage from 'src/services/storage.service';
import { IdentifierDataType } from 'src/utils/enumerations/identifier-data-type';
import { floatPipe } from 'src/utils/pipes.utils';

@Component({
  selector: 'rasberry-pi',
  templateUrl: './rasberry-pi.component.html',
  styleUrls: ['./rasberry-pi.component.css']
})
export default class RasberryPi {
    cpuUsage: number = 0;
    cpuTemp: number = 0;
    ramUsage: number = 0;
    wifiRSSI: number = 0;
    mcs: number = 0;

    colorRed = '#FF0000';
    colorPurple = '#800080';

    constructor(private storage:Storage) {}

     ngOnInit() {
        this.storage.get(IdentifierDataType.CPU_USAGE).subscribe((value) => {
            this.cpuUsage = floatPipe(value.values[0]);
        });
        this.storage.get(IdentifierDataType.CPU_TEMP).subscribe((value) => {
            this.cpuTemp = floatPipe(value.values[0]);
        });
        this.storage.get(IdentifierDataType.RAM_USAGE).subscribe((value) => {
            this.ramUsage = floatPipe(value.values[0]);
        });
        this.storage.get(IdentifierDataType.WIFI_RSSI).subscribe((value) => {
            this.wifiRSSI = floatPipe(value.values[0]);
        });
        this.storage.get(IdentifierDataType.MCS).subscribe((value) => {
            this.mcs = floatPipe(value.values[0]);
        });
    } 
}
