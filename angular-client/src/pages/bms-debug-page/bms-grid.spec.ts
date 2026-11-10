import { bmsTile } from './bms-grid';

// jsdom runs without Tailwind, so this checks the classes; the shots check the layout.
describe('BMS grid tiles', () => {
  it.each(Object.entries(bmsTile))("let their content spill (%s), as 814's overflow: visible tiles did", (_, tile) => {
    expect(tile.split(/\s+/)).not.toContain('overflow-hidden');
  });
});
