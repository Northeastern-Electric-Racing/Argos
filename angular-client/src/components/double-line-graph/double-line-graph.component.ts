import { Component, Input, OnInit } from '@angular/core';
import * as ApexCharts from 'apexcharts';
import {
  ApexAxisChartSeries,
  ApexXAxis,
  ApexYAxis,
  ApexDataLabels,
  ApexChart,
  ApexMarkers,
  ApexGrid,
  ApexTooltip,
  ApexFill,
  ApexStroke,
  ApexLegend
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
  legend: ApexLegend;
  colors: string[];
};

@Component({
  selector: 'double-line-graph',
  templateUrl: './double-line-graph.component.html',
  styleUrls: ['./double-line-graph.component.css'],
  providers: [DialogService]
})
export class DoubleLineGraphComponent implements OnInit {
  @Input() data1!: GraphData[];
  @Input() color1!: string; // Must be hex
  @Input() title1?: string;
  @Input() data2!: GraphData[];
  @Input() color2!: string; // Must be hex
  @Input() title2?: string;
  @Input() header?: string;
  @Input() graphContainerId!: string;
  @Input({ required: false }) timeRangeSec!: number;
  options!: ChartOptions;
  chart!: ApexCharts;
  series: ApexAxisChartSeries = [];
  timeDiffMs: number = 0;
  isSliding: boolean = false;
  timeRangeMs: number = 120000; // 2 minutes in ms

  constructor(public dialogService: DialogService) {}

  openDialog = () => {
    this.dialogService.open(GraphDialog, {
      header: this.header,
      data: {
        data: this.data1,
        color: this.color1,
        title: this.title1
      }
    });
  };

  updateChart = () => {
    this.series = [
      {
        name: this.title1,
        data: Array.from(this.data1)
      },
      {
        name: this.title2,
        data: Array.from(this.data2)
      }
    ];
    // temp fix, for now just basing change on data1 length...
    // even though probably should check data1 also
    if (!this.isSliding && this.data1.length > 2) {
      this.timeDiffMs = this.data1[this.data1.length - 1].x - this.data1[0].x;
    }

    if (!this.isSliding && this.timeDiffMs > this.timeRangeMs) {
      this.isSliding = true;
      this.chart.updateOptions({
        ...this.options,
        xaxis: {
          ...this.options.xaxis,
          range: this.timeRangeMs
        }
      });
    }

    this.chart.updateSeries(this.series);
    setTimeout(() => {
      this.updateChart();
    }, 800);
  };

  ngOnInit(): void {
    this.timeRangeMs = (this.timeRangeSec ?? 120) * 1000;

    this.series = [
      {
        name: this.title1,
        data: this.data1
      },
      {
        name: this.title2,
        data: this.data2
      }
    ];

    this.options = {
      series: this.series,
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
      colors: [this.color1, this.color2], // Set series colors here
      dataLabels: {
        enabled: false
      },
      stroke: {
        curve: 'straight',
        width: 2
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
          // format by hours and minutes and seconds
          format: 'M/d/yy, h:mm:ss'
        }
      },
      fill: {
        type: 'linear',
        gradient: {
          shadeIntensity: 1,
          opacityFrom: 1,
          opacityTo: 1,
          stops: [0, 100, 0, 100]
        }
      },
      grid: {
        show: false
      },
      legend: {
        labels: {
          colors: '#fffff4' // Set legend label color to black
        }
      }
    };

    // Delay rendering to ensure the container is available
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
