import { dialogBackdropClass, dialogClasses, headerlessContentClass } from '../dialog/dialog.recipe';
import { accordionClasses } from './accordion';
import { BUTTON_SIZES, BUTTON_VARIANTS, buttonClass, ICON_BUTTON_SIZES, iconButtonClass } from './button';
import { cardClass } from './card';
import { cellButtonClass } from './cell-button';
import { fieldClasses, INPUT_SIZES, inputClass } from './field';
import { iconClasses } from './icon';
import { listboxClasses, listboxPopupClass, LISTBOX_SIZES, LISTBOX_WIDTHS } from './listbox';
import { appsMenuClasses, menuItemClass, menuPanelClass } from './menu';
import { NUMBER_INPUT_WIDTHS, numberInputClass } from './number-input';
import { segmentedClasses } from './segmented';
import { spinnerClass } from './spinner';
import {
  cellClass,
  checkboxClass,
  headerCellClass,
  lightHeaderCellClass,
  rowClass,
  TABLE_ALIGNS,
  TABLE_DENSITIES,
  TABLE_HEADER_TONES,
  TABLE_SIZES,
  tableClass,
  tableClasses
} from './table';

/*
 * `outline-none` sets `--tw-outline-style: none`, and Tailwind's `outline-<n>` width utilities draw with
 * `outline-style: var(--tw-outline-style)`. So a list holding both draws no outline in any state: the
 * keyboard-active option of every listbox showed nothing (wave 1 review S1). A state outline needs its own
 * style (`outline-solid`) or `focus-ring`, which sets one; the simplest fix is to drop `outline-none`.
 */
const stateOutlineWidth = /(?:^|\s)\S+:outline-(?:\d|\[)/;
const clearsOutlineStyle = (list: string): boolean => list.split(/\s+/).includes('outline-none');

const strings = (value: unknown): string[] =>
  typeof value === 'string' ? [value] : value && typeof value === 'object' ? Object.values(value).flatMap(strings) : [];

const everyRecipeList = (): [string, string][] => {
  const lists: [string, string][] = [];
  const add = (name: string, value: unknown) => strings(value).forEach((s, i) => lists.push([`${name}#${i}`, s]));
  for (const v of BUTTON_VARIANTS) for (const s of BUTTON_SIZES) add(`button ${v} ${s}`, buttonClass(v, s));
  for (const s of ICON_BUTTON_SIZES) add(`icon button ${s}`, iconButtonClass(s));
  add('accordion', accordionClasses);
  add('cell button', cellButtonClass);
  for (const fill of [false, true]) for (const sliced of [false, true]) add('card', cardClass({ fill, sliced }));
  for (const s of INPUT_SIZES) for (const e of ['input', 'textarea'] as const) add(`input ${s} ${e}`, inputClass(s, e));
  add('field', fieldClasses);
  add('icon', iconClasses);
  for (const w of LISTBOX_WIDTHS) for (const s of LISTBOX_SIZES) add(`listbox popup ${w} ${s}`, listboxPopupClass(w, s));
  add('listbox', listboxClasses);
  add('menu', [menuPanelClass, menuItemClass, appsMenuClasses]);
  for (const w of NUMBER_INPUT_WIDTHS) add(`number input ${w}`, numberInputClass(w));
  add('segmented', segmentedClasses);
  add('spinner', spinnerClass);
  for (const s of TABLE_SIZES) add(`table ${s}`, tableClass(s));
  for (const d of TABLE_DENSITIES)
    add(`table cells ${d}`, [...TABLE_HEADER_TONES.map((tone) => headerCellClass(d, { tone })), cellClass(d)]);
  for (const align of TABLE_ALIGNS) add(`light header ${align}`, lightHeaderCellClass({ align }));
  for (const striped of [false, true])
    for (const hover of [false, true, 'tint'] as const) add('row', rowClass({ striped, hover }));
  add('table', [tableClasses, checkboxClass]);
  add('dialog', [dialogBackdropClass, dialogClasses, headerlessContentClass]);
  return lists;
};

describe('recipe outlines', () => {
  it('draws the keyboard-active listbox option a solid ring (no outline-none beside the data-active outline)', () => {
    const { option } = listboxClasses;
    expect(option).toMatch(/data-\[active=true\]:outline-2/);
    expect(clearsOutlineStyle(option)).toBe(false);
  });

  it('never puts outline-none in a class list that sets an outline width in some state', () => {
    const broken = everyRecipeList()
      .filter(([, list]) => clearsOutlineStyle(list) && stateOutlineWidth.test(list))
      .map(([name]) => name);
    expect(broken).toEqual([]);
  });
});
