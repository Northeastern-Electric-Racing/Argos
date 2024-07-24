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
import { DialogService } from 'primeng/dynamicdialog';
import { GraphDialog } from '../graph-dialog/graph-dialog.component';
import { GraphData } from 'src/utils/types.utils';

type ChartOptions = {
  series: ApexAxisChartSeries;
  chart: ApexChart;
  xaxis: ApexXAxis;
  yaxis: ApexYAxis;
  dataLabels: ApexDataLabels;
  markers: ApexMarkers;
  grid: ApexGrid;
  tooltip: ApexTooltip;
  fill: ApexFill;
  stroke: ApexStroke;
};

@Component({
  selector: 'graph-component',
  templateUrl: './graph.component.html',
  styleUrls: ['./graph.component.css'],
  providers: [DialogService]
})
export class GraphComponent implements OnInit {
  @Input() data!: GraphData[];
  @Input() color!: string; // Must be hex
  @Input() title?: string;
  @Input() graphContainerId!: string;
  options!: ChartOptions;
  chart!: ApexCharts;
  series: ApexAxisChartSeries = [
    {
      name: this.title,
      data: []
    }
  ];

  constructor(public dialogService: DialogService) {}

  openDialog = () => {
    this.dialogService.open(GraphDialog, {
      header: this.title,
      data: {
        data: this.data,
        color: this.color,
        title: this.title
      }
    });
  };

  updateChart = () => {
    this.series[0].data = this.data;
    this.chart.updateSeries(this.series);
    setTimeout(() => {
      this.updateChart();
    }, 1000);
  };

  ngOnInit(): void {
    this.series = [
      {
        name: this.title,
        data: this.data
      }
    ];

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
        },
        toolbar: {
          show: false
        }
        // background: '#5A5A5A'
      },
      dataLabels: {
        enabled: false
      },
      stroke: {
        curve: 'straight',
        colors: [this.color]
      },
      markers: {
        size: 0
      },
      xaxis: {
        type: 'category',
        tickAmount: 2,
        labels: {
          show: true,
          style: {
            colors: '#FFFFFF'
          },
          formatter: (value) => {
            return '' + new Date(value).getHours() + ':' + new Date(value).getMinutes() + ':' + new Date(value).getSeconds();
          }
        },
        axisBorder: {
          show: false
        },
        axisTicks: {
          show: false
        }
      },
      yaxis: {
        tickAmount: 2,
        labels: {
          style: {
            colors: '#FFFFFF'
          }
        }
      },
      tooltip: {
        theme: 'dark',
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
      const chartContainer = document.getElementById(this.graphContainerId);
      if (!chartContainer) {
        console.log('Container with id ' + this.graphContainerId + ' not found');
        return;
      }

      this.chart = new ApexCharts(chartContainer, this.options);

      this.chart.render();
      this.updateChart();
    }, 100);
  }
}
