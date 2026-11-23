import { Listbox, Option } from '@angular/aria/listbox';
import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LoopNodeListboxDirective } from './loop-node-listbox.directive';

@Component({
  imports: [Listbox, Option, LoopNodeListboxDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<ul
      ngListbox
      loopNodeListbox
      selectionMode="explicit"
      orientation="horizontal"
      [wrap]="false"
      [value]="value()"
      (loopNodeSelect)="selects.push($event)"
      (loopNodePreview)="previews.push($event)"
    >
      @for (id of ids; track id) {
        <li ngOption [value]="id" [label]="id" [attr.data-node-id]="id">{{ id }}</li>
      }
    </ul>
    <button type="button">outside</button>`
})
class HostComponent {
  ids = ['a', 'b', 'c'];
  value = signal<string[]>([]);
  selects: (string | null)[] = [];
  previews: (string | null)[] = [];
}

describe('LoopNodeListboxDirective', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;
  const li = (id: string) => fixture.nativeElement.querySelector(`[data-node-id="${id}"]`) as HTMLElement;
  const key = (el: HTMLElement, k: string) => {
    el.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true }));
    fixture.detectChanges();
  };

  beforeEach(async () => {
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('emits nothing on load, although Aria makes the first option active', () => {
    expect(host.selects).toEqual([]);
    expect(host.previews).toEqual([]);
  });

  it('turns the listbox’s own selection changes into one select each, and not the [value] coming back', () => {
    li('b').click();
    fixture.detectChanges();
    host.value.set(['b']);
    fixture.detectChanges();
    li('b').click();
    fixture.detectChanges();
    expect(host.selects).toEqual(['b', null]);
  });

  it('clears the pin on Escape', () => {
    key(li('a'), 'Escape');
    expect(host.selects).toEqual([null]);
  });

  it('previews the option the keyboard moves to, and clears when focus leaves the listbox', () => {
    li('a').focus();
    key(li('a'), 'ArrowRight');
    expect(document.activeElement).toBe(li('b'));
    (fixture.nativeElement.querySelector('button') as HTMLElement).focus();
    expect(host.previews).toEqual(['a', 'b', null]);
    expect(host.selects).toEqual([]);
  });

  it('previews on hover; leaving goes back to the keyboard’s option, or clears without one', () => {
    li('c').dispatchEvent(new MouseEvent('mouseenter'));
    li('c').dispatchEvent(new MouseEvent('mouseleave'));
    expect(host.previews).toEqual(['c', null]);
    li('a').focus();
    key(li('a'), 'ArrowRight');
    li('c').dispatchEvent(new MouseEvent('mouseenter'));
    li('c').dispatchEvent(new MouseEvent('mouseleave'));
    expect(host.previews.slice(-2)).toEqual(['c', 'b']);
    li('c').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    li('c').dispatchEvent(new MouseEvent('mouseleave'));
    expect(host.previews.at(-1)).toBeNull();
  });
});
