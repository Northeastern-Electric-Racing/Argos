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
  selector: 'graphcomponent',
  templateUrl: './graph.component.html',
  styleUrls: ['./graph.component.css'],
})
export class GraphComponent implements OnInit {
  @Input() data!: [number, number][];
  @Input() icon!: string;
  @Input() title!: string;
  @Input() onClick!: () => void;
  @Input() color!: string;
  options!: ChartOptions;
  chart!: ApexCharts;
  series: ApexAxisChartSeries = [
    {
      name: 'Data Series',
      data: [],
    }
  ];

  constructor() { }

  updateChart = () => {
    this.chart.updateSeries(this.series); 
    setTimeout(() => {
      this.updateChart();
    }, 1000);
  };

  ngOnInit(): void {

    this.series = [
      {
        name: 'Data Series',
        data: this.data,
      }
    ]

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
        },
        toolbar: {
          show: false,
        },
        background: "#5A5A5A"
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
          style: {
            colors: "#FFFFFF"
          },
          formatter: function(value, timestamp) {
            return "" + new Date(value).getHours() + ":" 
              + new Date(value).getMinutes() + ":"
              + new Date(value).getSeconds();
          }
        },
        axisBorder: {
          show: false,
        },
        axisTicks: {
          show: false,
        }
      },
      yaxis: {
        tickAmount: 2,
        labels: {
          style: {
            colors: "#FFFFFF"
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
        },
      },
      grid: {
        show: false
      }
    }

    //Weird rendering stuff with apex charts, view link to see why https://github.com/apexcharts/react-apexcharts/issues/187
    setTimeout(() => {
      this.chart = new ApexCharts(chartContainer, this.options);

      this.chart.render();
      this.updateChart();
    }, 0);

  }


}
