import { Component, Input } from '@angular/core';
import Storage from 'src/services/storage.service';

@Component({
  selector: 'rasberry-pi',
  templateUrl: './rasberry-pi.component.html',
  styleUrls: ['./rasberry-pi.component.css']
})
export default class RasberryPi {
    cpuUsage!: number;

    constructor(private storage:Storage) {}

    /* ngOnInit() {
        this.storage.getIdentifierData('cpuUsage').subscribe((value) => {
            [this.cpuUsage] = value.values;
        });
    } */
}
