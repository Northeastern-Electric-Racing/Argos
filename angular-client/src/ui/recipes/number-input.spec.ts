import { NUMBER_INPUT_WIDTHS, numberInputClass } from './number-input';
import { segmentedClasses } from './segmented';

describe('number input recipe', () => {
  it('has a literal width for every size, with tabular figures', () => {
    for (const w of NUMBER_INPUT_WIDTHS) {
      const c = numberInputClass(w).split(/\s+/);
      expect(c).toContain('tabular-nums');
      expect(c.some((x) => /^w-/.test(x))).toBe(true);
    }
    expect(numberInputClass('xs')).not.toBe(numberInputClass('sm'));
  });
});

describe('slice 1C recipes', () => {
  it('use no palette colours, arbitrary colours or opacity on text (lesson 1)', () => {
    const all = [...Object.values(segmentedClasses), ...NUMBER_INPUT_WIDTHS.map((w) => numberInputClass(w))].join(' ');
    expect(all).not.toMatch(/(^|\s)[a-z:-]*(gray|zinc|neutral-\d|red-\d|blue-\d|white|black)\b/);
    expect(all).not.toMatch(/-\[#/);
    expect(all).not.toMatch(/(^|\s|:)text-[a-z-]+\/\d+/);
  });
});
