import { Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';

import { ApexNonAxisChartSeries, ApexPlotOptions, ApexChart, ApexFill, NgApexchartsModule } from 'ng-apexcharts';
import { NgStyle } from '@angular/common';

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
  styleUrls: ['half-gauge.component.css'],
  standalone: true,
  imports: [NgStyle, NgApexchartsModule]
})
export default class HalfGaugeComponent implements OnInit, OnChanges {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public chartOptions!: Partial<ChartOptions> | any;
  @Input() current: number = 50;
  @Input() min: number = 0;
  @Input() max: number = 100;
  @Input() unit: string = 'm/s';
  @Input() color: string = '#ff0000';
  @Input() size: number = 200;

  widthpx: string = '200px';
  heightpx: string = '200px';
  label: string = 'm/s';
  percentage: number = 50;
  fontsize: string = '50px';

  ngOnInit() {
    this.rebuildChart();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (!this.chartOptions) return; // ngOnInit handles the first build
    if (changes['size']) {
      this.widthpx = this.size + 'px';
      this.heightpx = this.size * 0.5 + 'px';
      this.fontsize = this.size / 10 + 'px';
    }
    if (changes['current'] || changes['min'] || changes['max']) {
      this.percentage = ((this.current - this.min) / (this.max - this.min)) * 100;
      this.label = formatGaugeValue(this.current) + this.unit;
      // New object so ng-apexcharts diffs and re-renders.
      this.chartOptions = {
        ...this.chartOptions,
        series: [this.percentage],
        labels: [this.label]
      };
    } else if (changes['unit']) {
      this.label = formatGaugeValue(this.current) + this.unit;
      this.chartOptions = { ...this.chartOptions, labels: [this.label] };
    }
    if (changes['color']) {
      this.chartOptions = { ...this.chartOptions, fill: { ...this.chartOptions.fill, colors: [this.color] } };
    }
  }

  private rebuildChart(): void {
    this.widthpx = this.size + 'px';
    this.heightpx = this.size * 0.5 + 'px';
    this.label = formatGaugeValue(this.current) + this.unit;
    this.percentage = ((this.current - this.min) / (this.max - this.min)) * 100;
    this.fontsize = this.size / 10 + 'px';

    // radialBar takes percentages; raw value goes in the label.
    this.chartOptions = {
      series: [this.percentage],
      chart: {
        type: 'radialBar',
        foreColor: '#eeeeee',
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
            margin: 5,
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

function formatGaugeValue(n: number): string {
  return (Math.round(n * 100) / 100).toFixed(2);
}
