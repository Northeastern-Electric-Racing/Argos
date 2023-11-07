import { Component, Input, OnInit } from '@angular/core';
import Storage from 'src/services/storage.service';
import { IdentifierDataType } from 'src/utils/enumerations/ImportantDataType';

@Component({
  selector: 'landing-page',
  styleUrls: ['./landing-page.component.css'],
  templateUrl: './landing-page.component.html'
})
export default class LandingPage implements OnInit {
  @Input() storage!: Storage;
  time = new Date();
  currentDriver!: string;
  currentLocation!: string;
  currentSystem!: string;

  ngOnInit() {
    this.currentDriver = (this.storage.get(IdentifierDataType.DRIVER)?.[0].value as string) ?? 'No Driver Selected';
    this.currentLocation = (this.storage.get(IdentifierDataType.LOCATION)?.[0].value as string) ?? 'No Location Selected';
    this.currentSystem = (this.storage.get(IdentifierDataType.SYSTEM)?.[0].value as string) ?? 'No System Selected';
    // Perform the query and subscribe to the result
    setInterval(() => {
      this.time = new Date();
    }, 1000);
  }
}
