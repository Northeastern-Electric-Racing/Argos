import {
  dayBoundaries,
  dayBoundaryLabel,
  hoverTimeLabel,
  multiDayLabel,
  seriesAxisOptions,
  singleDayLabel,
  toDygraphRows,
  topicTitle
} from './graph-chart.utils';

describe('graph-chart utils', () => {
  describe('toDygraphRows', () => {
    it('returns no rows when there are no points', () => {
      expect(toDygraphRows([])).toEqual([]);
      expect(toDygraphRows([[], []])).toEqual([]);
    });

    it('turns a single series into [x, y] rows', () => {
      expect(
        toDygraphRows([
          [
            { x: 1, y: 10 },
            { x: 2, y: 20 }
          ]
        ])
      ).toEqual([
        [1, 10],
        [2, 20]
      ]);
    });

    it('merges series with different timestamps into one row per x, null where a series has no point', () => {
      const a = [
        { x: 1, y: 10 },
        { x: 3, y: 30 }
      ];
      const b = [
        { x: 2, y: 200 },
        { x: 3, y: 300 }
      ];

      expect(toDygraphRows([a, b])).toEqual([
        [1, 10, null],
        [2, null, 200],
        [3, 30, 300]
      ]);
    });

    it('keeps rows sorted by x and keeps repeated x values of one series', () => {
      const rows = toDygraphRows([
        [
          { x: 5, y: 1 },
          { x: 5, y: 2 }
        ],
        [{ x: 4, y: 9 }]
      ]);

      expect(rows).toEqual([
        [4, null, 9],
        [5, 1, null],
        [5, 2, null]
      ]);
    });
  });

  describe('dayBoundaries', () => {
    it('is empty for a range inside one day', () => {
      const start = new Date(2026, 0, 1, 1).getTime();
      expect(dayBoundaries(start, start + 60 * 60 * 1000)).toEqual([]);
    });

    it('returns each local midnight strictly inside the range', () => {
      const start = new Date(2026, 0, 1, 12).getTime();
      const end = new Date(2026, 0, 4, 6).getTime();

      expect(dayBoundaries(start, end)).toEqual([
        new Date(2026, 0, 2).getTime(),
        new Date(2026, 0, 3).getTime(),
        new Date(2026, 0, 4).getTime()
      ]);
    });

    it('excludes a range that starts exactly at midnight', () => {
      const start = new Date(2026, 0, 2).getTime();
      const end = new Date(2026, 0, 2, 23).getTime();
      expect(dayBoundaries(start, end)).toEqual([]);
    });
  });

  describe('seriesAxisOptions', () => {
    it('puts every series on the main axis when multiple y-axes are off', () => {
      const opts = seriesAxisOptions(['A 0', 'B 0'], false);

      expect(opts.series).toEqual({ 'A 0': { axis: 'y1' }, 'B 0': { axis: 'y1' } });
      expect(opts.ylabel).toBe('');
      expect(opts.y2label).toBe('');
    });

    it('alternates series between the left and right axes, titled by their topics', () => {
      const opts = seriesAxisOptions(['A 0', 'B 0', 'C 0'], true);

      expect(opts.series).toEqual({ 'A 0': { axis: 'y1' }, 'B 0': { axis: 'y2' }, 'C 0': { axis: 'y1' } });
      expect(opts.ylabel).toBe('A, C');
      expect(opts.y2label).toBe('B');
    });
  });

  describe('topicTitle', () => {
    it('drops the value index suffix from the first value of a topic', () => {
      expect(topicTitle('BMS/Pack/Voltage 0')).toBe('BMS/Pack/Voltage');
    });

    it('keeps the index of later values of a multi-value topic', () => {
      expect(topicTitle('BMS/Pack/Voltage 1')).toBe('BMS/Pack/Voltage 1');
    });
  });

  describe('time labels', () => {
    const afternoon = new Date(2026, 0, 2, 13, 4, 5);

    it('labels a single-day tick with the 24-hour time, starting at 00 after midnight', () => {
      expect(singleDayLabel(afternoon)).toBe('13:04:05');
      expect(singleDayLabel(new Date(2026, 0, 2, 0, 0, 5).getTime())).toBe('00:00:05');
    });

    it('adds the fraction of a second only to a tick between whole seconds', () => {
      // dygraphs puts ticks every 500 ms or less on a window of a few seconds; whole seconds alone would repeat.
      expect(singleDayLabel(new Date(2026, 0, 1, 9, 0, 1, 500))).toBe('09:00:01.5');
      expect(singleDayLabel(new Date(2026, 0, 1, 9, 0, 1, 250))).toBe('09:00:01.25');
      expect(singleDayLabel(new Date(2026, 0, 1, 9, 0, 1, 5))).toBe('09:00:01.005');
      expect(singleDayLabel(new Date(2026, 0, 1, 9, 0, 1))).toBe('09:00:01');
    });

    it('labels a multi-day tick with the date and the 24-hour time', () => {
      expect(multiDayLabel(afternoon)).toBe('1/2 13:04');
      expect(multiDayLabel(new Date(2026, 0, 2, 0, 30).getTime())).toBe('1/2 00:30');
    });

    it('labels a day boundary with the weekday and date', () => {
      expect(dayBoundaryLabel(afternoon.getTime())).toBe('Fri, Jan 2');
    });

    it('shows the full date and time of a hovered point', () => {
      expect(hoverTimeLabel(afternoon.getTime())).toBe('1/2/26, 13:04:05');
      expect(hoverTimeLabel(new Date(2026, 0, 2, 0, 0, 5).getTime())).toBe('1/2/26, 00:00:05');
    });
  });
});
