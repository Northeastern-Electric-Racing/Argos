import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  signal,
  untracked,
  viewChild
} from '@angular/core';
import uPlot from 'uplot';

/** uPlot options without a size: the wrapper sizes the chart to its host. */
export type UplotChartOptions = Omit<uPlot.Options, 'width' | 'height'>;

/** An explicit x-scale window, in the x scale's units. */
export interface UplotXRange {
  min: number;
  max: number;
}

/**
 * Thin Angular wrapper around uPlot.
 *
 * - A new `options` object rebuilds the chart (series, axes, scales or plugins changed).
 * - A new `data` array is drawn in place with `setData`: the chart, its DOM and its plugins are kept.
 * - `xRange` pins the x scale after each data update (e.g. a sliding live window); `null` auto-fits x to the data.
 *
 * The chart fills the host and follows its size, with the legend taken out of the plot's height.
 */
@Component({
  selector: 'uplot-chart',
  templateUrl: './uplot-chart.component.html',
  styleUrls: ['./uplot-chart.component.css'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UplotChartComponent {
  options = input.required<UplotChartOptions>();
  data = input.required<uPlot.AlignedData>();
  xRange = input<UplotXRange | null>(null);

  private target = viewChild.required<ElementRef<HTMLElement>>('target');
  private rendered = signal(false);
  private chart: uPlot | null = null;
  private resizeObserver: ResizeObserver | null = null;

  constructor() {
    afterNextRender(() => {
      this.resizeObserver = new ResizeObserver(() => this.fit());
      this.resizeObserver.observe(this.target().nativeElement);
      this.rendered.set(true);
    });

    effect(() => {
      if (!this.rendered()) return;
      const options = this.options();
      untracked(() => this.build(options));
    });

    effect(() => {
      if (!this.rendered()) return;
      const data = this.data();
      const range = this.xRange();
      untracked(() => this.draw(data, range));
    });

    inject(DestroyRef).onDestroy(() => {
      this.resizeObserver?.disconnect();
      this.chart?.destroy();
      this.chart = null;
    });
  }

  /** The live uPlot instance, once the host has rendered. */
  get instance(): uPlot | null {
    return this.chart;
  }

  private build(options: UplotChartOptions): void {
    this.chart?.destroy();
    const { width, height } = this.size();
    this.chart = new uPlot({ ...options, width, height }, this.data(), this.target().nativeElement);
    this.fit();
    const range = this.xRange();
    if (range) this.chart.setScale('x', range);
  }

  private draw(data: uPlot.AlignedData, range: UplotXRange | null): void {
    const { chart } = this;
    if (!chart) return;
    // One commit for both: setData without a rescale, then the explicit window.
    chart.batch(() => {
      chart.setData(data, range === null);
      if (range) chart.setScale('x', range);
    });
  }

  private size(): { width: number; height: number } {
    const el = this.target().nativeElement;
    const legend = this.chart?.root.querySelector<HTMLElement>('.u-legend');
    return { width: el.clientWidth, height: Math.max(el.clientHeight - (legend?.offsetHeight ?? 0), 0) };
  }

  private fit(): void {
    if (!this.chart) return;
    const { width, height } = this.size();
    if (width !== this.chart.width || height !== this.chart.height) {
      this.chart.setSize({ width, height });
    }
  }
}
