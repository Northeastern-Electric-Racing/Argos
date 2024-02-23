import { Component, OnInit } from '@angular/core';
import Storage from 'src/services/storage.service';
import { IdentifierDataType } from 'src/utils/enumerations/identifier-data-type';
import { floatPipe } from 'src/utils/pipes.utils';

/**
 * Container for the landing page, obtains data from the storage service.
 */
@Component({
  selector: 'landing-page',
  styleUrls: ['./landing-page.component.css'],
  templateUrl: './landing-page.component.html'
})
export default class LandingPage implements OnInit {
  currentDriver: string = 'No Driver Selected';
  currentLocation: string = 'No Location Selected';
  currentSystem: string = 'No System Selected';
  packTemp: number = 0;
  motorTemp: number = 0;
  stateOfCharge: number = 0;

  constructor(private storage: Storage) {}

  ngOnInit() {
    this.storage.get(IdentifierDataType.DRIVER).subscribe((value) => {
      [this.currentDriver] = value.values;
    });
    this.storage.get(IdentifierDataType.LOCATION).subscribe((value) => {
      [this.currentLocation] = value.values;
    });
    this.storage.get(IdentifierDataType.SYSTEM).subscribe((value) => {
      [this.currentSystem] = value.values;
    });

    this.storage.get(IdentifierDataType.PACK_TEMP).subscribe((value) => {
      this.packTemp = floatPipe(value.values[0]);
    });
    this.storage.get(IdentifierDataType.MOTOR_TEMP).subscribe((value) => {
      this.motorTemp = floatPipe(value.values[0]);
    });
    this.storage.get(IdentifierDataType.STATE_OF_CHARGE).subscribe((value) => {
      this.stateOfCharge = floatPipe(value.values[0]);
    });
  }
}
