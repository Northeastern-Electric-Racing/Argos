import { Component, OnInit, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MapService } from '../../services/map.service';
import { DataValue } from 'src/utils/socket.utils';
import APIService from 'src/services/api.service';
import { getDataByDataTypeNameAndRunId } from 'src/api/data.api';
import { topics } from 'src/utils/topic.utils';
import Storage from 'src/services/storage.service';
import { Run } from 'src/utils/types.utils';

import { RunSelectorComponent } from '../graph-page/graph-caption/run-selector/run-selector.component';
import LoadingPageComponent from 'src/components/loading-page/loading-page.component';
import ErrorPageComponent from 'src/components/error-page/error-page.component';
import SidebarToggleComponent from 'src/components/sidebar-toggle/sidebar-toggle.component';

@Component({
  selector: 'map',
  host: { '(window:resize)': 'onResize()' },
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.css'],
  standalone: true,
  imports: [RunSelectorComponent, LoadingPageComponent, ErrorPageComponent, SidebarToggleComponent]
})
export default class MapComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private map = inject(MapService);
  private storage = inject(Storage);
  private apiService = inject(APIService);
  isLoading: boolean = false;
  isError: boolean = false;
  error?: Error;
  isMobile = window.innerWidth <= 768;

  ngOnInit() {
    setTimeout(() => {
      this.map.buildMap('map');
    }, 1);
  }

  onResize() {
    this.isMobile = window.innerWidth <= 768;
  }

  onRunSelected = (run: Run) => {
    if (run.id === this.storage.getCurrentRunId().value) {
      this.isLoading = false;
      setTimeout(() => {
        this.map.buildMap('map');
        this.map.addPolyline([]);
        this.storage
          .get(topics.gpsLocation())
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe((value) => {
            this.map.addCoordinateToPolyline(this.map.transformDataToCoordinate(value));
          });
      }, 100);
    } else {
      const queryResponse = this.apiService.query<DataValue[]>(() =>
        getDataByDataTypeNameAndRunId(topics.gpsLocation(), run.id)
      );
      queryResponse.data.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((points) => {
        if (points) {
          setTimeout(() => {
            this.map.buildMap('map');
            this.map.addPolyline(points.map(this.map.transformDataToCoordinate));
          }, 100);
        }
      });
      queryResponse.isLoading
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe((isLoading) => (this.isLoading = isLoading));
      queryResponse.isError.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((isError) => (this.isError = isError));
      queryResponse.error.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((error) => {
        if (error) {
          this.error = error;
        }
      });
    }
  };
}
