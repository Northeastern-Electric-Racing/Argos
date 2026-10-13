import { isValidCoordinate, lineLengthMetres, snapFix } from './track.utils';
import { Coordinate } from './types.utils';

const lat = 42;
const lon = -84;
const metresOfLatitude = 180 / (6371000 * Math.PI);
const metresOfLongitude = metresOfLatitude / Math.cos((lat * Math.PI) / 180);
const fixes = [
  { lat, lon, timeMs: 1000 },
  { lat, lon: lon + 10 * metresOfLongitude, timeMs: 1100 }
];

describe('isValidCoordinate', () => {
  it('accepts latitudes up to 90 degrees either side', () => {
    expect(isValidCoordinate('lat', 90)).toBeTrue();
    expect(isValidCoordinate('lat', -90)).toBeTrue();
    expect(isValidCoordinate('lat', 0)).toBeTrue();
  });

  it('rejects latitudes beyond 90 degrees', () => {
    expect(isValidCoordinate('lat', 90.000001)).toBeFalse();
    expect(isValidCoordinate('lat', -90.000001)).toBeFalse();
    expect(isValidCoordinate('lat', 120)).toBeFalse();
  });

  it('accepts longitudes up to 180 degrees either side', () => {
    expect(isValidCoordinate('lon', 180)).toBeTrue();
    expect(isValidCoordinate('lon', -180)).toBeTrue();
  });

  it('rejects longitudes beyond 180 degrees', () => {
    expect(isValidCoordinate('lon', 180.000001)).toBeFalse();
    expect(isValidCoordinate('lon', -180.000001)).toBeFalse();
  });

  it('rejects a missing or non-finite value', () => {
    expect(isValidCoordinate('lat', NaN)).toBeFalse();
    expect(isValidCoordinate('lon', NaN)).toBeFalse();
    expect(isValidCoordinate('lon', Infinity)).toBeFalse();
  });
});

describe('lineLengthMetres', () => {
  it('measures the distance between the line ends in metres', () => {
    const line = { a: { lat, lon }, b: { lat: lat + 3 * metresOfLatitude, lon: lon + 4 * metresOfLongitude } };

    expect(lineLengthMetres(line)).toBeCloseTo(5, 6);
  });

  it('is zero when both ends are the same point', () => {
    expect(lineLengthMetres({ a: { lat, lon }, b: { lat, lon } })).toBe(0);
  });
});

describe('snapFix', () => {
  // One screen pixel per metre, y down.
  const toScreen = (point: Coordinate) => ({
    x: (point.lon - lon) / metresOfLongitude,
    y: -(point.lat - lat) / metresOfLatitude
  });

  it('snaps to the nearest fix drawn within 10 px of the cursor', () => {
    expect(snapFix(fixes, { lat: lat + 6 * metresOfLatitude, lon: lon + 16 * metresOfLongitude }, toScreen)).toEqual(
      fixes[1]
    );
  });

  it('snaps to the nearer of two fixes both drawn within 10 px, with its time', () => {
    expect(snapFix(fixes, { lat, lon: lon + 4 * metresOfLongitude }, toScreen)).toEqual(fixes[0]);
    expect(snapFix(fixes, { lat, lon: lon + 6 * metresOfLongitude }, toScreen)).toEqual(fixes[1]);
  });

  it('does not snap when the nearest fix is drawn more than 10 px away', () => {
    expect(snapFix(fixes, { lat: lat + 11 * metresOfLatitude, lon }, toScreen)).toBeNull();
  });

  it('does not snap without fixes', () => {
    expect(snapFix([], { lat, lon }, toScreen)).toBeNull();
  });
});
