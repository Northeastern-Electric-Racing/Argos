import { Component, Input, OnInit } from '@angular/core';
import * as ApexCharts from 'apexcharts';
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
import { BehaviorSubject } from 'rxjs';
import { GraphData } from 'src/utils/types.utils';

type ChartOptions = {
  series: ApexAxisChartSeries;
  chart: ApexChart;
  xaxis: ApexXAxis;
  dataLabels: ApexDataLabels;
  markers: ApexMarkers;
  grid: ApexGrid;
  tooltip: ApexTooltip;
  fill: ApexFill;
  stroke: ApexStroke;
};

@Component({
  selector: 'graph',
  templateUrl: './graph.component.html',
  styleUrls: ['./graph.component.css']
})
export default class Graph implements OnInit {
  @Input() valuesSubject!: BehaviorSubject<GraphData[]>;
  options!: ChartOptions;
  chart!: ApexCharts;
  previousDataLength: number = 0;
  series: ApexAxisChartSeries = [
    {
      name: 'Data Series',
      data: []
    }
  ];

  updateChart = () => {
    if (this.previousDataLength !== this.series[0].data.length) {
      this.previousDataLength = this.series[0].data.length;
      this.chart.updateSeries(this.series);
    }
    setTimeout(() => {
      this.updateChart();
    }, 1000);
  };

  ngOnInit(): void {
    this.valuesSubject.subscribe((values: GraphData[]) => {
      const mappedValues = values.map((value: GraphData) => [value.x, value.y]);
      const newSeries = [
        {
          name: 'Data Series',
          data: mappedValues
        }
      ];
      this.series = newSeries;
    });

    const chartContainer = document.getElementById('chart-container');
    if (!chartContainer) {
      console.log('Something went very wrong');
      return;
    }

    this.options = {
      series: [],
      chart: {
        id: 'graph',
        type: 'line',
        height: '100%',
        zoom: {
          autoScaleYaxis: true
        },
        animations: {
          enabled: true,
          easing: 'linear',
          dynamicAnimation: {
            speed: 1000
          }
        }
      },
      dataLabels: {
        enabled: false
      },
      stroke: {
        curve: 'straight'
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
        type: 'linear',
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

    //Weird rendering stuff with apex charts, view link to see why https://github.com/apexcharts/react-apexcharts/issues/187
    setTimeout(() => {
      this.chart = new ApexCharts(chartContainer, this.options);

      this.chart.render();
      this.updateChart();
    }, 0);
  }
}
