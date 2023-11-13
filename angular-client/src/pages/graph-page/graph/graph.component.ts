import { Component, Input, OnInit } from '@angular/core';
import {
  ApexAxisChartSeries,
  ApexXAxis,
  ApexDataLabels,
  ApexChart,
  ApexMarkers,
  ApexGrid,
  ApexTooltip,
  ApexFill
} from 'ng-apexcharts';
import { Subject } from 'rxjs';
import { DataValue } from 'src/utils/socket.utils';

type ChartOptions = {
  series: ApexAxisChartSeries;
  chart: ApexChart;
  xaxis: ApexXAxis;
  dataLabels: ApexDataLabels;
  markers: ApexMarkers;
  grid: ApexGrid;
  tooltip: ApexTooltip;
  fill: ApexFill;
};

@Component({
  selector: 'graph',
  templateUrl: './graph.component.html',
  styleUrls: ['./graph.component.css']
})
export default class Graph implements OnInit {
  @Input() valuesSubject!: Subject<DataValue[]>;
  options!: ChartOptions;

  updateChart(values: DataValue[]) {
    console.log(values);
    const mappedValues = values.map((value: DataValue) => [+value.time, +value.value]);

    this.options.series = [
      {
        name: 'My-series',
        data: mappedValues
      }
    ];
  }

  ngOnInit(): void {
    this.valuesSubject.subscribe((values: DataValue[]) => {
      this.updateChart(values);
    });

    this.options = {
      series: [],
      chart: {
        id: 'graph',
        type: 'area',
        width: '100%',
        zoom: {
          autoScaleYaxis: true
        }
      },
      dataLabels: {
        enabled: false
      },
      markers: {
        size: 0
      },
      xaxis: {
        type: 'datetime',
        tickAmount: 6
      },
      tooltip: {
        x: {
          //format by hours and minutes and seconds
          format: 'M/d/yy, h:mm:ss'
        }
      },
      fill: {
        type: 'gradient',
        gradient: {
          shadeIntensity: 1,
          opacityFrom: 0.7,
          opacityTo: 0.9,
          stops: [0, 100]
        }
      },
      grid: {
        show: false
      }
    };
  }
}
