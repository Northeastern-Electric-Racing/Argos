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
 * - A new `options` object rebuilds the chart (series, axes, scales or plugins changed). A series hidden from the
 *   legend stays hidden, matched by label, until it is shown again or `keepHidden` drops it: also through rebuilds
 *   without it.
 * - `rescale()` reruns every scale's range in place, e.g. when a range function reads bounds that changed.
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
  /** Whether to keep remembering a hidden series' label, checked on each rebuild (e.g. false once its topic is dropped). */
  keepHidden = input<(label: uPlot.Series['label']) => boolean>(() => true);

  private target = viewChild.required<ElementRef<HTMLElement>>('target');
  private rendered = signal(false);
  private chart: uPlot | null = null;
  /** The live chart's legend, observed alongside the host since it takes its height out of the plot's. */
  private legend: HTMLElement | null = null;
  private resizeObserver: ResizeObserver | null = null;
  /** Labels of the series hidden from the legend, carried from each chart to the next. */
  private hiddenLabels = new Set<uPlot.Series['label']>();

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
      this.legend = null;
    });
  }

  /** The live uPlot instance, once the host has rendered. */
  get instance(): uPlot | null {
    return this.chart;
  }

  /** Reruns every scale's range without rebuilding the chart, keeping the current x window (and so any zoom). */
  rescale(): void {
    const { chart } = this;
    if (!chart) return;
    const { min, max } = chart.scales['x'];
    // Setting x re-ranges every auto y scale, so their range functions run again.
    if (min !== undefined && max !== undefined) chart.setScale('x', { min, max });
  }

  private build(options: UplotChartOptions): void {
    // The outgoing chart's legend toggles update the remembered labels; a series it lacked keeps its entry.
    for (const s of this.chart?.series.slice(1) ?? []) {
      if (s.show) this.hiddenLabels.delete(s.label);
      else this.hiddenLabels.add(s.label);
    }
    // Only the owner knows when a missing series is gone for good: series can come back one rebuild at a time.
    const keep = this.keepHidden();
    for (const label of this.hiddenLabels) if (!keep(label)) this.hiddenLabels.delete(label);
    this.chart?.destroy();
    const series = options.series.map((s, i) => (i > 0 && this.hiddenLabels.has(s.label) ? { ...s, show: false } : s));
    const el = this.target().nativeElement;
    this.chart = new uPlot({ ...options, series, width: el.clientWidth, height: el.clientHeight }, this.data(), el);
    // Fit once the legend is laid out, not now: uPlot sizes its canvas in a microtask, and until then its
    // min-content root collapses and the legend wraps into a tall column. Observing the legend also refits
    // when it re-wraps (more topics, a narrower host) while the host's own size stays the same.
    this.observeLegend(this.chart.root.querySelector<HTMLElement>('.u-legend'));
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

  private observeLegend(legend: HTMLElement | null): void {
    if (this.legend) this.resizeObserver?.unobserve(this.legend);
    this.legend = legend;
    if (legend) this.resizeObserver?.observe(legend);
  }

  private size(): { width: number; height: number } {
    const el = this.target().nativeElement;
    return { width: el.clientWidth, height: Math.max(el.clientHeight - (this.legend?.offsetHeight ?? 0), 0) };
  }

  private fit(): void {
    if (!this.chart) return;
    const { width, height } = this.size();
    if (width !== this.chart.width || height !== this.chart.height) {
      this.chart.setSize({ width, height });
    }
  }
}
