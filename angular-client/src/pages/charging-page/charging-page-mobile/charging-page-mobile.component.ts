import { Component, HostListener, Input } from '@angular/core';
import Storage from 'src/services/storage.service';
import { IdentifierDataType } from 'src/utils/enumerations/identifier-data-type';

@Component({
  selector: 'charging-page-mobile',
  templateUrl: './charging-page-mobile.component.html',
  styleUrls: ['./charging-page-mobile.component.css']
})
export default class ChargingPageMobile {
  @Input() time = new Date();
  location: string = 'No Location Set';
  constructor(private storage: Storage) {}
  mobileThreshold = 1000;
  isMobile = window.innerWidth < this.mobileThreshold;

  ngOnInit() {
    setInterval(() => {
      this.time = new Date();
    }, 1000);

    this.storage.get(IdentifierDataType.LOCATION).subscribe((value) => {
      [this.location] = value.values || ['No Location Set'];
    });
  }

  @HostListener('window:resize', ['$event'])
  onResize() {
    this.isMobile = window.innerWidth <= this.mobileThreshold;
  }
}
