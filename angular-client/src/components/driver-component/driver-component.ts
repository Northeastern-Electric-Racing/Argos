import { Component } from '@angular/core';
import Storage from 'src/services/storage.service';
import { IdentifierDataType } from 'src/utils/enumerations/identifier-data-type';

@Component({
  selector: 'driver-component',
  templateUrl: './driver-component.html',
  styleUrls: ['./driver-component.css']
})
export class DriverComponent {

    driver: string = '';

    constructor(private storage: Storage) {}
    ngOnInit() {
        this.storage.get(IdentifierDataType.DRIVER).subscribe((value) => {
            [this.driver] = value.values;
        });
    }
}
