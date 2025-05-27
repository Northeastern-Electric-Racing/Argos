import { Component, ElementRef, Input, Renderer2, OnInit, inject, input } from '@angular/core';
import { ApexNonAxisChartSeries, ApexPlotOptions, ApexChart, ApexFill, NgApexchartsModule } from 'ng-apexcharts';
import Theme from 'src/services/theme.service';

export type ChartOptions = {
  series: ApexNonAxisChartSeries;
  chart: ApexChart;
  labels: string[];
  plotOptions: ApexPlotOptions;
  fill: ApexFill;
  title: ApexTitleSubtitle;
};

@Component({
  selector: 'pie-chart',
  templateUrl: 'pie-chart.component.html',
  styleUrls: ['pie-chart.component.css'],
  standalone: true,
  imports: [NgApexchartsModule]
})
export default class PieChartComponent implements OnInit {
  private renderer = inject(Renderer2);
  private el = inject(ElementRef);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public chartOptions!: Partial<ChartOptions> | any;
  @Input() data: { value: number; name: string }[] = [];
  @Input() backgroundColor: string = Theme.infoBackground;
  title = input<string>('Pie Chart');
  currentWidth: number = 0;

  ngOnInit() {
    this.setChartWidth();
    setInterval(() => {
      this.setChartOptions();
    }, 2000);
  }

  setChartOptions() {
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
      colors: ['#ce2727', '#2799ce', '#3cba40', '#ba3cb4', '#808080'],
      chart: {
        width: '100%',
        type: 'pie',
        background: this.backgroundColor,
        redrawOnParentResize: true,
        foreColor: '#ffffff',
        animations: {
          enabled: false
        }
      },
      dataLabels: {
        style: {
          offset: -10
        }
      },
      labels,
      legend: {
        offsetX: 10
      },
      title: {
        text: this.title()
      }
    };
  }

  private setChartWidth() {
    const containerWidth = this.el.nativeElement.offsetWidth;
    this.renderer.setStyle(this.el.nativeElement.querySelector('apx-chart'), 'width', containerWidth + 'px');
  }
}
