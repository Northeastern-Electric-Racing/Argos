import { Component, ElementRef, OnInit, Renderer2, computed, inject, input } from '@angular/core';
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
  data = input.required<{ value: number; name: string }[]>();
  backgroundColor = input<string>(Theme.infoBackground);
  title = input<string>('Pie Chart');
  // Values change every tick; bound on their own so apx-chart only updates the series.
  series = computed(() => this.data().map((item) => item.value));
  // Labels keep their identity while names are unchanged, so chartOptions isn't rebuilt per tick.
  private labels = computed(() => this.data().map((item) => item.name), {
    equal: (a, b) => a.length === b.length && a.every((name, i) => name === b[i])
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public chartOptions = computed<Partial<ChartOptions> | any>(() => {
    const labels = this.labels();

    if (labels.length === 0) {
      return {};
    }
    return {
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
        background: this.backgroundColor(),
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
  });
  currentWidth: number = 0;

  ngOnInit() {
    this.setChartWidth();
  }

  private setChartWidth() {
    const containerWidth = this.el.nativeElement.offsetWidth;
    this.renderer.setStyle(this.el.nativeElement.querySelector('apx-chart'), 'width', containerWidth + 'px');
  }
}
