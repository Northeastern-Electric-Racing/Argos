import {
  cellClass,
  checkboxClass,
  checkboxOnAccentClass,
  headerCellClass,
  lightHeaderCellClass,
  rowClass,
  TABLE_ALIGNS,
  TABLE_DENSITIES,
  TABLE_HEADER_TONES,
  tableClasses
} from './table';

// jsdom runs without Tailwind, so this checks the recipe's shape; the audit kit checks how it looks.
describe('table recipe', () => {
  const classes = (list: string) => list.split(/\s+/);

  it('aligns a header cell left by default and right on request, never both', () => {
    for (const d of TABLE_DENSITIES) {
      expect(classes(headerCellClass(d))).toContain('text-left');
      const right = classes(headerCellClass(d, { align: 'right' }));
      expect(right).toContain('text-right');
      expect(right).not.toContain('text-left');
    }
  });

  it('makes a plain table header cell sticky only on request, over an opaque fill', () => {
    expect(classes(headerCellClass())).not.toContain('sticky');
    expect(classes(headerCellClass('md', { sticky: true }))).toEqual(
      expect.arrayContaining(['sticky', 'top-0', 'bg-surface-3'])
    );
  });

  it('positions the scroll box, so sr-only cell labels stay inside it instead of widening the page', () => {
    expect(classes(tableClasses.wrapper)).toEqual(expect.arrayContaining(['relative', 'overflow-auto']));
  });

  it('has a light header: no fill, 12px uppercase muted labels, aligned once', () => {
    const alignClass = { left: 'text-left', right: 'text-right' } as const;
    for (const align of TABLE_ALIGNS) {
      const c = classes(lightHeaderCellClass({ align }));
      expect(c).toEqual(expect.arrayContaining(['text-xs', 'uppercase', 'text-fg-muted', alignClass[align]]));
      expect(c.filter((x) => /^text-(left|right|center)$/.test(x))).toHaveLength(1);
      expect(c.some((x) => x.startsWith('bg-'))).toBe(false);
    }
    expect(classes(lightHeaderCellClass())).toContain('text-left');
  });

  it('has a caps header tone: 12px uppercase fg-label labels on an opaque surface-2, so it can stick', () => {
    for (const d of TABLE_DENSITIES) {
      const c = classes(headerCellClass(d, { tone: 'caps', sticky: true }));
      expect(c).toEqual(
        expect.arrayContaining(['bg-surface-2', 'text-xs', 'uppercase', 'text-fg-label', 'sticky', 'top-0'])
      );
      expect(c).not.toContain('bg-surface-3');
      // one font size: no density's smaller phone text on top of the caps 12px
      expect(c.filter((x) => /^(max-md:)?text-(xs|ctrl|ctrl-sm|sm)$/.test(x))).toEqual(['text-xs']);
    }
  });

  it("has an accent header tone: 814's red header, white semibold labels on accent-strong (4.98:1)", () => {
    for (const d of TABLE_DENSITIES) {
      const c = classes(headerCellClass(d, { tone: 'accent', sticky: true }));
      expect(c).toEqual(expect.arrayContaining(['bg-accent-strong', 'text-on-accent', 'font-semibold', 'sticky']));
      // the edge under it is the red too, as 814's borderless header was
      expect(c.filter((x) => /^border-(?!b$|solid$)/.test(x))).toEqual(['border-accent-strong']);
    }
    expect(classes(headerCellClass('phone', { tone: 'accent' }))).toContain('max-md:text-ctrl-sm');
  });

  it('draws a checkbox on the accent header in white, with a red tick, never the accent fill', () => {
    const c = classes(checkboxOnAccentClass);
    expect(c).toEqual(
      expect.arrayContaining([
        'border-on-accent',
        'checked:bg-on-accent',
        'before:border-accent-strong',
        'focus-visible:focus-ring'
      ])
    );
    expect(c.some((x) => /(^|:)bg-accent$/.test(x) || /(^|:)border-fg-muted$/.test(x))).toBe(false);
    // the same box as the plain checkbox: only the colours differ
    const shape = (list: string) =>
      classes(list).filter((x) => !/(border|bg)-(fg-muted|accent|on-accent|accent-strong)$/.test(x));
    expect(shape(checkboxOnAccentClass)).toEqual(shape(checkboxClass));
  });

  it('gives every density and tone exactly one padding per side, one fill and one edge colour', () => {
    for (const tone of TABLE_HEADER_TONES)
      for (const d of TABLE_DENSITIES) {
        const c = classes(headerCellClass(d, { tone })).filter((x) => !x.includes(':'));
        expect(c.filter((x) => /^bg-/.test(x))).toHaveLength(1);
        expect(c.filter((x) => /^border-(?!b$|solid$)/.test(x))).toHaveLength(1);
        expect(c.filter((x) => /^p[xy]?-/.test(x)).join(' ')).toMatch(/^(p-\S+|px-\S+ py-\S+)$/);
      }
  });

  it("has a roomy density for 814's notification log: 10px by 14px cells over faint dividers", () => {
    expect(classes(cellClass('roomy'))).toEqual(
      expect.arrayContaining(['px-3.5', 'py-2.5', 'border-border/40', 'max-md:px-2.5', 'max-md:py-2'])
    );
    expect(classes(headerCellClass('roomy', { tone: 'caps' }))).toEqual(expect.arrayContaining(['px-3.5', 'py-2.5']));
  });

  it('tints a hovered row; only a clickable row (hover: true) shows the pointer', () => {
    expect(classes(rowClass({ hover: true }))).toEqual(expect.arrayContaining(['hover:bg-fg/8', 'cursor-pointer']));
    const tint = classes(rowClass({ striped: true, hover: 'tint' }));
    expect(tint).toContain('even:bg-fg/4');
    expect(tint).not.toContain('cursor-pointer');
    expect(classes(rowClass())).not.toContain('hover:bg-fg/8');
  });

  it("tints a 'tint' row's cells 3% (814's log), stacked over the stripe rather than replacing it", () => {
    const tint = classes(rowClass({ striped: true, hover: 'tint' }));
    expect(tint).toContain('hover:*:bg-fg/3');
    // the row's own fill stays the stripe on hover, so the cells' tint paints on top of it
    expect(tint.filter((c) => /^hover:bg-/.test(c))).toEqual([]);
  });
});
