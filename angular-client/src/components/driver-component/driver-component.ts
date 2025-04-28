import { Component, OnInit, inject } from '@angular/core';
import { getLatestRun } from 'src/api/run.api';
import { DataTypeEnum } from 'src/data-type.enum';
import APIService from 'src/services/api.service';
import Storage from 'src/services/storage.service';
import { Run } from 'src/utils/types.utils';

@Component({
  selector: 'driver-component',
  templateUrl: './driver-component.html',
  styleUrls: ['./driver-component.css']
})
export class DriverComponent implements OnInit {
  private storage = inject(Storage);
  driver: string = 'No Driver';
  apiService = inject(APIService);

  ngOnInit() {
    this.storage.get(DataTypeEnum.DRIVER).subscribe((value) => {
      [this.driver] = value.values || ['No Driver'];
    });
  }

  updateDriverName() {
    const latestRunQuery = this.apiService.query<Run>(() => getLatestRun());
    latestRunQuery.isLoading.subscribe((loading: boolean) => {
      if (loading) {
        // TODO
      }
    });
    latestRunQuery.error.subscribe((error) => {
      if (error) {
        // TODO
      }
    });
    latestRunQuery.data.subscribe((data) => {
      const latestRun = data;
      this.driver = latestRun?.driverName === undefined || latestRun?.driverName === '' ? 'No Driver' : latestRun.driverName;
    });
  }
}
