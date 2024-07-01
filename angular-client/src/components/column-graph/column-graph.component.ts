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
import { DialogService } from 'primeng/dynamicdialog';
import { GraphDialog } from '../graph-dialog/graph-dialog.component';
import { GraphData } from 'src/utils/types.utils';

type ChartOptions = {
  series: ApexAxisChartSeries;
  chart: ApexChart;
};

@Component({
  selector: 'column-graph-component',
  templateUrl: './column-graph.component.html',
  styleUrls: ['./column-graph.component.css'],
  providers: [DialogService]
})
export class ColumnGraphComponent implements OnInit {
  @Input() data!: GraphData[];
  @Input() color!: string; // Must be hex
  @Input() title?: string;
  @Input() colGraphContainerId!: string;
  options!: ChartOptions;
  chart!: ApexCharts;
  series: ApexAxisChartSeries = [
    {
      name: this.title,
      data: []
    }
  ];

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
    this.series[0].data = this.data;
    this.chart.updateSeries(this.series);
    setTimeout(() => {
      this.updateChart();
    }, 1000);
  };

  ngOnInit(): void {
    this.series = [
      {
        name: this.title,
        data: this.data
      }
    ];

    this.options = {
      chart: {
        type: 'bar',
        animations: {
          enabled: false
        }
      },
      series: []
    };

    //Weird rendering stuff with apex charts, view link to see why https://github.com/apexcharts/react-apexcharts/issues/187
    setTimeout(() => {
      const chartContainer = document.getElementById(this.colGraphContainerId);
      if (!chartContainer) {
        console.log('Container with id ' + this.colGraphContainerId + ' not found');
        return;
      }

      this.chart = new ApexCharts(chartContainer, this.options);

      this.chart.render();
      this.updateChart();
    }, 100);
  }
}
