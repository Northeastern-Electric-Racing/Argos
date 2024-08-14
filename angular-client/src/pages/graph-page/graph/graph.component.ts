import { Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import * as ApexCharts from 'apexcharts';
import { ApexXAxis, ApexDataLabels, ApexChart, ApexMarkers, ApexGrid, ApexTooltip, ApexFill } from 'ng-apexcharts';
import { BehaviorSubject } from 'rxjs';
import { convertUTCtoLocal } from 'src/utils/pipes.utils';
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
  selector: 'graph',
  templateUrl: './graph.component.html',
  styleUrls: ['./graph.component.css']
})
export default class Graph implements OnChanges {
  @Input() valuesSubject!: BehaviorSubject<GraphData[]>;
  options!: ChartOptions;
  chart!: ApexCharts;
  previousDataLength: number = 0;
  data!: Map<number, number>;
  timeDiffMs: number = 0;
  isSliding: boolean = false;

  updateChart = () => {
    if (this.previousDataLength !== Array.from(this.data).length) {
      this.previousDataLength = Array.from(this.data).length;
      this.chart.updateSeries([
        {
          name: 'Data Series',
          data: Array.from(this.data)
        }
      ]);

      if (!this.isSliding && this.timeDiffMs > 120000) {
        this.isSliding = true;
        this.chart.updateOptions({
          ...this.options,
          xaxis: {
            ...this.options.xaxis,
            range: 120000
          }
        });
      }
    }
    setTimeout(() => {
      this.updateChart();
    }, 800);
  };

  ngOnInit(): void {
    this.data = new Map();
    this.valuesSubject.subscribe((values: GraphData[]) => {
      values.forEach((value) => {
        if (!this.data.has(convertUTCtoLocal(value.x))) {
          this.data.set(convertUTCtoLocal(value.x), +value.y.toFixed(3));
        }
      });

      if (!this.isSliding) {
        const times = Array.from(this.data.keys());
        this.timeDiffMs = times[times.length - 1] - times[0];
      }
    });

    const chartContainer = document.getElementById('chart-container');
    if (!chartContainer) {
      console.log('Something went very wrong');
      return;
    }

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
        }
      },
      dataLabels: {
        enabled: false
      },
      stroke: {
        curve: 'straight'
      },
      markers: {
        size: 0
      },
      xaxis: {
        type: 'datetime',
        tickAmount: 6,
        labels: {
          style: {
            colors: '#fff'
          }
        }
      },
      yaxis: {
        labels: {
          style: {
            colors: '#fff'
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

    // Weird rendering stuff with apex charts, view link to see why https://github.com/apexcharts/react-apexcharts/issues/187
    setTimeout(() => {
      this.chart = new ApexCharts(chartContainer, { series: [{ data: [] }], ...this.options });

      this.chart.render();
      this.updateChart();
    }, 0);
  }

  ngOnChanges(changes: SimpleChanges) {
    this.data = new Map();
    this.isSliding = false;

    this.valuesSubject.subscribe((values: GraphData[]) => {
      values.forEach((value) => {
        if (!this.data.has(convertUTCtoLocal(value.x))) {
          this.data.set(convertUTCtoLocal(value.x), +value.y.toFixed(3));
        }
      });

      if (!this.isSliding) {
        const times = Array.from(this.data.keys());
        this.timeDiffMs = times[times.length - 1] - times[0];
      }
    });
  }
}
