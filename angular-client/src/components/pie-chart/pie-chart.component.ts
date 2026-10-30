import { Component, computed, input } from '@angular/core';
import { ArcElement, ChartData, ChartOptions, Legend, PieController, Title, Tooltip, TooltipItem } from 'chart.js';
import { BaseChartDirective, provideCharts } from 'ng2-charts';
import Theme from 'src/services/theme.service';

const SLICE_COLORS = ['#ce2727', '#2799ce', '#3cba40', '#ba3cb4', '#808080'];
const TEXT_COLOR = '#ffffff';

/** A slice's value and its share of the slices still shown, e.g. "2 (66.7%)" */
function sliceLabel({ chart, dataset, dataIndex, formattedValue }: TooltipItem<'pie'>): string {
  const total = dataset.data.reduce((sum, value, index) => (chart.getDataVisibility(index) ? sum + value : sum), 0);
  if (total === 0) return formattedValue;
  return `${formattedValue} (${((dataset.data[dataIndex] / total) * 100).toFixed(1)}%)`;
}

@Component({
  selector: 'pie-chart',
  templateUrl: 'pie-chart.component.html',
  styleUrls: ['pie-chart.component.css'],
  standalone: true,
  imports: [BaseChartDirective],
  // Register only what the pie chart uses, so the rest of Chart.js tree-shakes out
  providers: [provideCharts({ registerables: [PieController, ArcElement, Legend, Title, Tooltip] })]
})
export default class PieChartComponent {
  data = input.required<{ value: number; name: string }[]>();
  backgroundColor = input<string>(Theme.infoBackground);
  title = input<string>('Pie Chart');

  // A new value array per tick; ng2-charts copies it into the same chart and redraws
  chartData = computed<ChartData<'pie', number[], string>>(() => ({
    labels: this.data().map((item) => item.name),
    datasets: [
      {
        data: this.data().map((item) => item.value),
        backgroundColor: SLICE_COLORS,
        borderColor: this.backgroundColor()
      }
    ]
  }));

  chartOptions = computed<ChartOptions<'pie'>>(() => ({
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    plugins: {
      legend: { display: true, position: 'right', labels: { color: TEXT_COLOR, boxWidth: 12 } },
      title: { display: true, text: this.title(), color: TEXT_COLOR, align: 'start' },
      tooltip: { callbacks: { label: sliceLabel } }
    }
  }));
}
