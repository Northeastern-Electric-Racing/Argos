import { headerCellClass, TABLE_DENSITIES } from './table';

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
});
