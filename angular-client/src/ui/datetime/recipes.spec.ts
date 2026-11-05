import { NUMBER_INPUT_WIDTHS, numberInputClass, segmentedClasses } from './recipes';

// jsdom runs without Tailwind, so these specs check each recipe's shape: complete literal class lists on the
// design tokens, with state taken from ARIA attributes. How it looks is checked by the audit kit.
describe('segmented recipe (tabs and segmented controls)', () => {
  it('styles the selected tab and the pressed segment from ARIA, as a solid secondary fill', () => {
    const item = segmentedClasses.item.split(/\s+/);
    expect(item).toEqual(expect.arrayContaining(['aria-selected:bg-secondary', 'aria-selected:text-on-accent']));
    expect(item).toEqual(expect.arrayContaining(['aria-pressed:bg-secondary', 'aria-pressed:text-on-accent']));
  });

  it('gives every item a keyboard-only focus ring and muted text at rest', () => {
    expect(segmentedClasses.item).toContain('focus-visible:focus-ring');
    expect(segmentedClasses.item.split(/\s+/)).toContain('text-fg-muted');
  });

  it('takes an inert tab panel out of the layout, whatever display the panel sets (lesson 3)', () => {
    const panel = segmentedClasses.panel.split(/\s+/);
    expect(panel).toContain('inert:hidden');
    expect(panel).toContain('flex');
  });

  it('draws the list on a surface with a hairline edge', () => {
    expect(segmentedClasses.list.split(/\s+/)).toEqual(expect.arrayContaining(['bg-surface-1', 'border-border']));
  });
});

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
