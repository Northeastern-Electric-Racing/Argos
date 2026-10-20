import { Component, OnDestroy, OnInit, computed, inject, input, ChangeDetectionStrategy } from '@angular/core';
import ApexCharts from 'apexcharts';
import { MatDialog } from '@angular/material/dialog';
import { GraphDialogComponent } from '../graph-dialog/graph-dialog.component';
import { GraphData } from 'src/utils/types.utils';

// Typed from apexcharts itself: these charts are built with new ApexCharts(), and ng-apexcharts' type copies drift from it
type ApexOptions = Required<ApexCharts.ApexOptions>;
type ChartOptions = Pick<
  ApexOptions,
  'chart' | 'xaxis' | 'dataLabels' | 'markers' | 'grid' | 'tooltip' | 'fill' | 'stroke'
> & {
  yaxis: Exclude<ApexOptions['yaxis'], unknown[]>;
};

@Component({
  selector: 'graph-component',
  templateUrl: './graph.component.html',
  styleUrls: ['./graph.component.css'],
  changeDetection: ChangeDetectionStrategy.Eager
})
export class GraphComponent implements OnInit, OnDestroy {
  private dialog = inject(MatDialog);
  data = input.required<GraphData[]>();
  color = input.required<string>(); // Must be hex
  title = input<string | undefined>(undefined);
  graphContainerId = input.required<string>();
  timeRangeSec = input<number | undefined>(undefined);
  // Applied only at chart creation; a later color change isn't pushed to the live chart.
  options = computed<ChartOptions>(() => ({
    chart: {
      id: 'graph',
      type: 'line',
      height: '100%',
      zoom: {
        autoScaleYaxis: true
      },
      animations: {
        enabled: false,
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
      colors: [this.color()]
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
  }));
  chart!: ApexCharts;
  timeDiffMs: number = 0;
  isSliding: boolean = false;
  timeRangeMs = computed(() => (this.timeRangeSec() ?? 120) * 1000); // defaults to 2 minutes
  timeOuts: NodeJS.Timeout[] = [];
  openDialog = () => {
    this.dialog.open(GraphDialogComponent, {
      data: {
        header: this.title(),
        data: this.data(),
        color: this.color(),
        title: this.title(),
        graphContainerId: this.graphContainerId() + 'big'
      }
    });
  };

  updateChart = () => {
    // updateOptions, not updateSeries: apexcharts 5's updateSeries fast path replots the line without redrawing the axes
    this.chart.updateOptions({
      series: [
        {
          name: this.title(),
          data: Array.from(this.data())
        }
      ]
    });

    if (!this.isSliding && this.data().length > 2) {
      this.timeDiffMs = this.data()[this.data().length - 1].x - this.data()[0].x;
    }

    if (!this.isSliding && this.timeDiffMs > this.timeRangeMs()) {
      this.isSliding = true;
      this.chart.updateOptions({
        ...this.options(),
        xaxis: {
          ...this.options().xaxis,
          range: this.timeRangeMs()
        }
      });
    }

    this.timeOuts.push(
      setTimeout(() => {
        this.updateChart();
      }, 800)
    );
  };

  ngOnInit(): void {
    //Weird rendering stuff with apex charts, view link to see why https://github.com/apexcharts/react-apexcharts/issues/187
    this.timeOuts.push(
      setTimeout(() => {
        const chartContainer = document.getElementById(this.graphContainerId());
        if (!chartContainer) {
          return;
        }

        this.chart = new ApexCharts(chartContainer, {
          series: [{ data: [] }],
          ...this.options()
        });

        this.chart.render();
        this.updateChart();
      }, 100)
    );
  }

  ngOnDestroy(): void {
    this.chart.destroy();
    this.timeOuts.forEach((timeout) => {
      clearTimeout(timeout);
    });
  }
}
