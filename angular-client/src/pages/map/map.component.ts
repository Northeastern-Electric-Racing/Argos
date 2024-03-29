import { Component, OnInit } from '@angular/core';
import { MapService } from '../../services/map.service';
import { DataValue } from 'src/utils/socket.utils';
import APIService from 'src/services/api.service';
import { getDataByDataTypeNameAndRunId } from 'src/api/data.api';
import { ActivatedRoute } from '@angular/router';
import { IdentifierDataType } from 'src/utils/enumerations/identifier-data-type';
import Storage from 'src/services/storage.service';
import { Coordinate } from 'src/utils/types.utils';

@Component({
  selector: 'map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.css']
})
export default class Map implements OnInit {
  realTime: boolean = false;
  runId!: number;
  isLoading: boolean = true;
  isError: boolean = false;
  error?: Error;

  constructor(
    private map: MapService,
    private storage: Storage,
    private apiService: APIService,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.parseParams();
    if (this.realTime) {
      this.isLoading = false;
      //Allow page to render before building map
      setTimeout(() => {
        this.map.buildMap();
        this.map.addPolyline([]);
        this.storage.get(IdentifierDataType.POINTS).subscribe((value) => {
          this.map.addCoordinateToPolyline(this.transformDataToCoordinate(value));
        });
      }, 100);
    } else {
      const queryResponse = this.apiService.query<DataValue[]>(() =>
        getDataByDataTypeNameAndRunId(IdentifierDataType.POINTS, this.runId)
      );
      queryResponse.data.subscribe((points) => {
        this.isLoading = false;
        //Allow page to render before building map
        setTimeout(() => {
          this.map.buildMap();
          this.map.addPolyline(points.map(this.transformDataToCoordinate));
        }, 100);
      });
      queryResponse.isLoading.subscribe((isLoading) => (this.isLoading = isLoading));
      queryResponse.isError.subscribe((isError) => (this.isError = isError));
      queryResponse.error.subscribe((error) => (this.error = error));
    }
  }

  private transformDataToCoordinate(data: DataValue): Coordinate {
    return { lat: parseFloat(data.values[1]), lng: parseFloat(data.values[0]) };
  }

  private parseParams() {
    const realTime = this.route.snapshot.paramMap.get('realTime');
    if (realTime) this.realTime = realTime === 'true';
    else {
      this.error = new Error('No real time value provided');
      this.isError = true;
      return;
    }
    const runId = this.route.snapshot.paramMap.get('runId');
    if (runId) {
      if (runId === 'undefined' && this.realTime) {
        this.error = new Error('No Real Time Data Available');
        this.isError = true;
        return;
      }
      this.runId = parseInt(runId);
      if (isNaN(this.runId)) {
        this.error = new Error('Run Id must be a number');
        this.isError = true;
        return;
      }
    } else {
      this.error = new Error('No run id provided');
      this.isError = true;
      return;
    }
  }
}
