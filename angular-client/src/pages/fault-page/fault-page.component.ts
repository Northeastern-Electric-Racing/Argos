import { Component, HostListener, OnInit } from '@angular/core';
import { getDataByDatetime } from 'src/api/data.api';
import APIService from 'src/services/api.service';
import Storage from 'src/services/storage.service';
import { IdentifierDataType } from 'src/utils/enumerations/identifier-data-type';
import { DataValue } from 'src/utils/socket.utils';

/**
 * Container for the Fault page, obtains data from the storage service.
 */
@Component({
  selector: 'fault-page',
  styleUrls: ['./fault-page.component.css'],
  templateUrl: './fault-page.component.html'
})
export default class FaultPage implements OnInit {
  time = new Date();
  location: string = 'No Location Set';
  constructor(
    private storage: Storage,
    private serverService: APIService
  ) {}
  mobileThreshold = 1070;
  isMobile = window.innerWidth < this.mobileThreshold;
  selectedFaultDataValuesIsLoading = false;
  selectedFaultDataValuesIsError = false;
  selectedFaultDataValuesError?: Error;
  currentData!: DataValue[];

  ngOnInit() {
    this.currentData = [];

    setInterval(() => {
      this.time = new Date();
    }, 1000);

    this.setSelectedFault = (fault: { type: string; name: string; time: string; displayTime: string }) => {
      console.log(fault);
      const dataQueryResponse = this.serverService.query<DataValue[]>(() => getDataByDatetime(fault.time));
      dataQueryResponse.isLoading.subscribe((isLoading: boolean) => {
        this.selectedFaultDataValuesIsLoading = isLoading;
      });
      dataQueryResponse.error.subscribe((error: Error) => {
        this.selectedFaultDataValuesError = error;
        this.selectedFaultDataValuesIsError = true;
      });
      dataQueryResponse.data.subscribe((data: DataValue[]) => {
        console.log(data);
        this.currentData = data;
      });
    };

    this.storage.get(IdentifierDataType.LOCATION).subscribe((value) => {
      [this.location] = value.values || ['No Location Set'];
    });
  }

  @HostListener('window:resize', ['$event'])
  onResize() {
    this.isMobile = window.innerWidth <= this.mobileThreshold;
  }

  onSelectDataType() {}

  /**
   * Sets the selected data type.
   * @param dataType The data type to set.
   */
  setSelectedFault!: (fault: { type: string; name: string; time: string; displayTime: string }) => void;
}
