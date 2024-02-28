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
import { DialogService, DynamicDialogConfig } from 'primeng/dynamicdialog';

type ChartOptions = {
  series: ApexAxisChartSeries;
  chart: ApexChart;
  subtitle: ApexTitleSubtitle;
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
  selector: 'graphdialog',
  templateUrl: './graphDialog.component.html',
  providers: [DialogService]
})
export class GraphDialog implements OnInit {
  @Input() data!: [number, number][];
  @Input() color!: string;
  @Input() title!: string;
  @Input() subTitle?: string;
  options!: ChartOptions;
  chart!: ApexCharts;

  constructor(
    public dialogService: DialogService,
    public config: DynamicDialogConfig
  ) {}

  series: ApexAxisChartSeries = [
    {
      name: this.config.data.title,
      data: []
    }
  ];

  updateChart = () => {
    this.chart.updateSeries(this.series);
    setTimeout(() => {
      this.updateChart();
    }, 1000);
  };

  ngOnInit(): void {
    this.series = [
      {
        name: this.config.data.title,
        data: this.config.data.data
      }
    ];

    const chartContainer = document.getElementById('chart-dialog-container');
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
        },
        toolbar: {
          show: false
        },
        background: '#5A5A5A'
      },
      subtitle: {
        text: this.config.data.subTitle,
        offsetX: 10,
        offsetY: 5
      },
      dataLabels: {
        enabled: false
      },
      stroke: {
        curve: 'straight',
        colors: [this.config.data.color]
      },
      markers: {
        size: 0
      },
      xaxis: {
        type: 'category',
        tickAmount: 2,
        labels: {
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
