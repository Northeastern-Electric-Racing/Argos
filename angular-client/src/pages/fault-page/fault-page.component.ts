import { Component, HostListener, OnInit } from '@angular/core';
import Storage from 'src/services/storage.service';
import { IdentifierDataType } from 'src/utils/enumerations/identifier-data-type';

/**
 * Container for the charge page, obtains data from the storage service.
 */
@Component({
  selector: 'fault-page',
  styleUrls: ['./fault-page.component.css'],
  templateUrl: './fault-page.component.html'
})
export default class FaultPage implements OnInit {
  time = new Date();
  constructor(private storage: Storage) {}
  mobileThreshold = 1000;
  isMobile = window.innerWidth < this.mobileThreshold;

  hwFailFault: string = '';
  overTempFault: string = '';
  voltageWrongFault: string = '';
  wrongBatteryConnectionFault: string = '';
  commTimeoutFault: string = '';
  bmsFault: string = '';

  ngOnInit() {
    //this.storage.get(IdentifierDataType.HW_FAIL_FAULT).subscribe((value) => {
    //TODO: add logic here to query and display DCL data
    //[this.hwFailFault] = value.values || [''];
    //});
  }

  @HostListener('window:resize', ['$event'])
  onResize() {
    this.isMobile = window.innerWidth <= this.mobileThreshold;
  }
}
