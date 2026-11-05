import { headerCellClass, lightHeaderCellClass, TABLE_ALIGNS, TABLE_DENSITIES, tableClasses } from './table';

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
});
