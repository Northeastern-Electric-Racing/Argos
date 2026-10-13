import { Coordinate, TimingLine } from './types.utils';

const EARTH_RADIUS_M = 6371000;
export const SNAP_RADIUS_PX = 10;
const radians = (degrees: number) => (degrees * Math.PI) / 180;

const metresPerDegree = (EARTH_RADIUS_M * Math.PI) / 180;

type ScreenPoint = { x: number; y: number };

const distanceMetres = (point: Coordinate, origin: Coordinate) =>
  Math.hypot(
    (point.lon - origin.lon) * Math.cos(radians(origin.lat)) * metresPerDegree,
    (point.lat - origin.lat) * metresPerDegree
  );

const COORDINATE_LIMITS: Record<keyof Coordinate, number> = { lat: 90, lon: 180 };

export const isValidCoordinate = (axis: keyof Coordinate, degrees: number) => Math.abs(degrees) <= COORDINATE_LIMITS[axis];

export const lineLengthMetres = (line: TimingLine) => distanceMetres(line.b, line.a);

const nearestFix = <T extends Coordinate>(trace: T[], point: Coordinate): T | null =>
  trace.reduce<T | null>(
    (nearest, fix) => (!nearest || distanceMetres(fix, point) < distanceMetres(nearest, point) ? fix : nearest),
    null
  );

export const snapFix = <T extends Coordinate>(
  trace: T[],
  cursor: Coordinate,
  toScreen: (point: Coordinate) => ScreenPoint
): T | null => {
  const fix = nearestFix(trace, cursor);
  if (!fix) return null;
  const [fixPx, cursorPx] = [toScreen(fix), toScreen(cursor)];
  return Math.hypot(fixPx.x - cursorPx.x, fixPx.y - cursorPx.y) <= SNAP_RADIUS_PX ? fix : null;
};
