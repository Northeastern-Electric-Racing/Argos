import { Component, ChangeDetectionStrategy } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import GridLayoutComponent from './grid-layout.component';

@Component({
  template: `<grid-layout minWidth="520px" gap="15px"
    ><div>a</div>
    <div>b</div></grid-layout
  >`,
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [GridLayoutComponent]
})
class HostComponent {}

describe('GridLayoutComponent', () => {
  const grid = async (): Promise<HTMLElement> => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    return fixture.nativeElement.querySelector('grid-layout > div');
  };

  // A fixed minimum wider than a phone (520px cards at 390px) scrolled the page sideways (WCAG 1.4.10):
  // a column is at least minWidth, unless the grid itself is narrower, then it is the grid's width.
  it('never makes a column wider than the grid', async () => {
    expect((await grid()).style.gridTemplateColumns).toBe('repeat(auto-fit, minmax(min(520px, 100%), 1fr))');
  });

  it('applies the gap', async () => {
    expect((await grid()).style.gap).toBe('15px');
  });
});
