import { Component, Input, OnInit } from '@angular/core';
import * as ApexCharts from 'apexcharts';
import { ApexXAxis, ApexDataLabels, ApexChart, ApexMarkers, ApexGrid, ApexTooltip, ApexFill } from 'ng-apexcharts';
import { DialogService } from 'primeng/dynamicdialog';
import { GraphDialog } from '../graph-dialog/graph-dialog.component';
import { GraphData } from 'src/utils/types.utils';

type ChartOptions = {
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
  @Input({ required: false }) timeRangeSec!: number;
  options!: ChartOptions;
  chart!: ApexCharts;
  timeDiffMs: number = 0;
  isSliding: boolean = false;
  timeRangeMs: number = 120000; // 2 minutes in ms

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
    this.chart.updateSeries([
      {
        name: this.title,
        data: Array.from(this.data)
      }
    ]);

    if (!this.isSliding && this.data.length > 2) {
      this.timeDiffMs = this.data[this.data.length - 1].x - this.data[0].x;
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

    setTimeout(() => {
      this.updateChart();
    }, 800);
  };

  ngOnInit(): void {
    this.timeRangeMs = (this.timeRangeSec ?? 120) * 1000;

    this.options = {
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
            return (
              '' +
              new Date(value).getHours() +
              ':' +
              ((new Date(value).getMinutes() < 10 ? '0' : '') + new Date(value).getMinutes()) +
              ':' +
              ((new Date(value).getSeconds() < 10 ? '0' : '') + new Date(value).getSeconds())
            );
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

      this.chart = new ApexCharts(chartContainer, { series: [{ data: [] }], ...this.options });

      this.chart.render();
      this.updateChart();
    }, 100);
  }
}
