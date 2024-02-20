import { Component, OnInit } from '@angular/core';
import Storage from 'src/services/storage.service';
import { IdentifierDataType } from 'src/utils/enumerations/ImportantDataType';

/**
 * Container for the landing page, obtains data from the storage service.
 */
@Component({
  selector: 'landing-page',
  styleUrls: ['./landing-page.component.css'],
  templateUrl: './landing-page.component.html'
})
export default class LandingPage implements OnInit {
  currentDriver!: string;
  currentLocation!: string;
  currentSystem!: string;

  constructor(private storage: Storage) {}

  ngOnInit() {
    this.currentDriver = (this.storage.get(IdentifierDataType.DRIVER)?.getValue().value as string) ?? 'No Driver Selected';
    this.currentLocation =
      (this.storage.get(IdentifierDataType.LOCATION)?.getValue().value as string) ?? 'No Location Selected';
    this.currentSystem = (this.storage.get(IdentifierDataType.SYSTEM)?.getValue().value as string) ?? 'No System Selected';
  }
}
