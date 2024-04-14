import { Component, Input } from '@angular/core';

import { ApexNonAxisChartSeries, ApexPlotOptions, ApexChart, ApexFill } from 'ng-apexcharts';

export type ChartOptions = {
  series: ApexNonAxisChartSeries;
  chart: ApexChart;
  labels: string[];
  plotOptions: ApexPlotOptions;
  fill: ApexFill;
};

@Component({
  selector: 'pie-chart',
  templateUrl: 'pie-chart.component.html',
  styleUrls: ['pie-chart.component.css']
})
export default class PieChart {
  public chartOptions!: Partial<ChartOptions> | any;
  @Input() data: { value: number; name: string }[] = [
    { value: 24, name: 'Motor' },
    { value: 58, name: 'Cooling' },
    { value: 93, name: 'Bungus' }
  ];
  // valid sizes range from like 200 to 1000, anything smaller or bigger is kind of ridiculous
  @Input() size: number = 300;
  @Input() backgroundColor: string = '#414141';

  ngOnInit() {
    const labels = this.data.map((item) => {
      return item.name;
    });
    const series = this.data.map((item) => {
      return item.value;
    });

    this.chartOptions = {
      series,
      plotOptions: {
        pie: {
          dataLabels: {
            offset: -10
          }
        }
      },
      colors: ['#ce2727', '#2799ce', '#3cba40', '#ba3cb4', '#efce29'],
      chart: {
        width: this.size,
        type: 'pie',
        background: this.backgroundColor,
        redrawOnParentResize: true,
        foreColor: '#ffffff'
      },
      dataLabels: {
        style: {
          offset: -10,
          fontSize: this.size / 20 + 'px'
        }
      },
      labels,
      legend: {
        offsetX: 10
      },
      responsive: [
        {
          breakpoint: 480,
          options: {
            chart: {
              width: 200
            },
            legend: {
              position: 'bottom'
            }
          }
        }
      ]
    };
  }
}
