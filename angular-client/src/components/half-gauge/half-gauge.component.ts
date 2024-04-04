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
  selector: 'half-gauge',
  templateUrl: 'half-gauge.component.html',
  styleUrls: ['half-gauge.component.css']
})
export default class HalfGauge {
  public chartOptions!: Partial<ChartOptions> | any;
  @Input() current: number = 50;
  @Input() min: number = 0;
  @Input() max: number = 100;
  @Input() unit: string = 'm/s';
  @Input() color: string = '#ff0000';
  @Input() size: number = 200;

  widthpx: string = '200px';
  heightpx: string = '200px';
  paddingTop: string = '20px';
  label: string = 'm/s';
  percentage: number = 50;
  fontsize: string = '50px';

  ngOnInit() {
    this.widthpx = this.size + 'px';
    this.heightpx = this.size * 0.5 + 'px';
    this.paddingTop = '';
    this.label = this.current + this.unit;
    this.percentage = ((this.current - this.min) / (this.max - this.min)) * 100;
    this.fontsize = this.size / 10 + 'px';

    // apex radial charts are hard coded to work with percentages, so converting to percentage to
    // accurately represent min and max in chart and then using actual value and unit as label
    this.chartOptions = {
      series: [this.percentage],
      chart: {
        type: 'radialBar',
        foreColor: '#eeeeee', // text color
        redrawOnParentResize: true,
        offsetY: -100
      },
      plotOptions: {
        radialBar: {
          startAngle: -90,
          endAngle: 90,
          offsetY: 100,
          hollow: {
            margin: 10,
            size: '60%'
          },
          track: {
            background: '#1d1d1d',
            strokeWidth: '97%',
            margin: 5, // margin is in pixels
            dropShadow: {
              enabled: false,
              top: 2,
              left: 0,
              opacity: 0,
              blur: 2
            }
          },
          dataLabels: {
            name: {
              show: true,
              color: '#fafafa',
              fontSize: this.fontsize,
              fontFamily: undefined,
              fontWeight: 300,
              offsetY: -5
            },
            value: {
              show: false
            }
          }
        }
      },
      fill: {
        type: 'solid',
        colors: [this.color]
      },
      labels: [this.label]
    };
  }
}
