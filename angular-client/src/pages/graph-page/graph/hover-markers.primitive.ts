import {
  IChartApiBase,
  IPanePrimitive,
  IPanePrimitivePaneView,
  IPrimitivePaneRenderer,
  ISeriesApi,
  PaneAttachedParameter,
  SeriesType,
  Time
} from 'lightweight-charts';

type RenderTarget = Parameters<IPrimitivePaneRenderer['draw']>[0];

export interface HoverMarker {
  series: ISeriesApi<SeriesType, Time>;
  /** Chart time of the series' point the tooltip reports. */
  time: Time;
  value: number;
  color: string;
}

const RADIUS = 4;
const BORDER = 2;
const BORDER_COLOR = '#fff';

/**
 * A dot on every series at the point the hover tooltip reports for it. The built-in crosshair marker
 * only marks series with a point on the exact hovered bar, and topics rarely share timestamps, so it
 * usually marked just one line.
 */
export class HoverMarkersPrimitive implements IPanePrimitive<Time> {
  private chart: IChartApiBase<Time> | null = null;
  private requestUpdate: (() => void) | null = null;
  private markers: HoverMarker[] = [];

  private readonly view: IPanePrimitivePaneView = {
    zOrder: () => 'top',
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

  setMarkers(markers: HoverMarker[]): void {
    if (markers.length === 0 && this.markers.length === 0) return;
    this.markers = markers;
    this.requestUpdate?.();
  }

  /** Each marker's centre in media px, skipping any its scales can't place. */
  positions(): { x: number; y: number; color: string }[] {
    const timeScale = this.chart?.timeScale();
    if (!timeScale) return [];
    const out: { x: number; y: number; color: string }[] = [];
    for (const { series, time, value, color } of this.markers) {
      const x = timeScale.timeToCoordinate(time);
      const y = series.priceToCoordinate(value);
      if (x !== null && y !== null) out.push({ x, y, color });
    }
    return out;
  }

  private draw(target: RenderTarget): void {
    const positions = this.positions();
    if (positions.length === 0) return;
    target.useMediaCoordinateSpace(({ context: ctx }) => {
      ctx.save();
      ctx.lineWidth = BORDER;
      ctx.strokeStyle = BORDER_COLOR;
      for (const { x, y, color } of positions) {
        ctx.beginPath();
        ctx.arc(x, y, RADIUS, 0, 2 * Math.PI);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.stroke();
      }
      ctx.restore();
    });
  }
}
