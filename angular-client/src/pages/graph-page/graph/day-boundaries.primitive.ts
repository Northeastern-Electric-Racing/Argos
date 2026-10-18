import {
  IChartApiBase,
  IPanePrimitive,
  IPanePrimitivePaneView,
  IPrimitivePaneRenderer,
  Logical,
  PaneAttachedParameter,
  Time
} from 'lightweight-charts';
import { DayBoundary, toChartTime } from './graph-chart.utils';

type RenderTarget = Parameters<IPrimitivePaneRenderer['draw']>[0];

const LINE_COLOR = '#8fcadd';
const LABEL_BACKGROUND = '#0c2026';
const LABEL_TEXT = '#fff';

/**
 * Dashed vertical line and date label at each day boundary on multi-day ranges, standing in for
 * ApexCharts' x-axis annotations (lightweight-charts has no annotation API, only primitives).
 */
export class DayBoundariesPrimitive implements IPanePrimitive<Time> {
  private chart: IChartApiBase<Time> | null = null;
  private requestUpdate: (() => void) | null = null;
  private boundaries: DayBoundary[] = [];

  private readonly view: IPanePrimitivePaneView = {
    renderer: () => ({ draw: (target: RenderTarget) => this.draw(target) })
  };

  attached({ chart, requestUpdate }: PaneAttachedParameter<Time>): void {
    this.chart = chart;
    this.requestUpdate = requestUpdate;
  }

  detached(): void {
    this.chart = null;
    this.requestUpdate = null;
  }

  paneViews(): readonly IPanePrimitivePaneView[] {
    return [this.view];
  }

  setBoundaries(boundaries: DayBoundary[]): void {
    this.boundaries = boundaries;
    this.requestUpdate?.();
  }

  /** x (media px) of each boundary: halfway between the new day's first bar and the bar before it. */
  positions(): { x: number; label: string }[] {
    const timeScale = this.chart?.timeScale();
    if (!timeScale) return [];
    const out: { x: number; label: string }[] = [];
    for (const { timeMs, label } of this.boundaries) {
      const found = timeScale.timeToIndex(toChartTime(timeMs), true);
      if (found === null) continue;
      const index = found as number as Logical;
      // logicalToCoordinate returns 0 for a fractional index, so average the two bars' coordinates.
      const x = timeScale.logicalToCoordinate(index);
      if (x === null) continue;
      const before = index > 0 ? timeScale.logicalToCoordinate((index - 1) as Logical) : null;
      out.push({ x: before === null ? x : (x + before) / 2, label });
    }
    return out;
  }

  private draw(target: RenderTarget): void {
    const positions = this.positions();
    if (positions.length === 0) return;
    target.useMediaCoordinateSpace(({ context: ctx, mediaSize }) => {
      ctx.save();
      ctx.font = '11px sans-serif';
      ctx.textBaseline = 'top';
      // Days squeezed together on the point-spaced axis would stack their labels; keep only the first.
      let labelEnd = -Infinity;
      for (const { x, label } of positions) {
        if (x < 0 || x > mediaSize.width) continue;
        ctx.strokeStyle = LINE_COLOR;
        ctx.setLineDash([4, 4]);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, mediaSize.height);
        ctx.stroke();

        const width = ctx.measureText(label).width + 8;
        // Centred on the line, but kept inside the pane
        const left = Math.min(Math.max(x - width / 2, 0), mediaSize.width - width);
        if (left < labelEnd + 4) continue;
        labelEnd = left + width;
        ctx.setLineDash([]);
        ctx.fillStyle = LABEL_BACKGROUND;
        ctx.fillRect(left, 4, width, 16);
        ctx.strokeRect(left, 4, width, 16);
        ctx.fillStyle = LABEL_TEXT;
        ctx.fillText(label, left + 4, 7);
      }
      ctx.restore();
    });
  }
}
