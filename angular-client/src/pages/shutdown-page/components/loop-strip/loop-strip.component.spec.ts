import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SHUTDOWN_LOOP } from '../../shutdown-loop.model';
import { NodeStatus } from '../../shutdown-loop.utils';
import { LoopStripComponent } from './loop-strip.component';

/** TSMS is the cause; everything before it closed, after it downstream-open. */
const TSMS = SHUTDOWN_LOOP.findIndex((n) => n.id === 'tsms');
const NODES: NodeStatus[] = SHUTDOWN_LOOP.map((node, i) => {
  const state = i < TSMS ? 'closed' : i === TSMS ? 'suspect' : 'downstream-open';
  return { node, state, mismatch: false };
});

describe('LoopStripComponent', () => {
  let fixture: ComponentFixture<LoopStripComponent>;
  let el: HTMLElement;
  let selected: (string | null)[];
  let previewed: (string | null)[];
  const item = (id: string) => el.querySelector<HTMLElement>(`[data-node-id="${id}"]`)!;
  const key = (id: string, k: string) => {
    item(id).dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true }));
    fixture.detectChanges();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [LoopStripComponent] }).compileComponents();
    fixture = TestBed.createComponent(LoopStripComponent);
    fixture.componentRef.setInput('nodes', NODES);
    selected = [];
    previewed = [];
    fixture.componentInstance.nodeSelect.subscribe((id) => selected.push(id));
    fixture.componentInstance.nodePreview.subscribe((id) => previewed.push(id));
    fixture.detectChanges();
    el = fixture.nativeElement;
  });

  it('renders one option per node in a listbox', () => {
    expect(el.querySelector('[role="listbox"]')).toBeTruthy();
    expect(el.querySelectorAll('[role="option"][data-node-id]').length).toBe(19);
  });

  it('labels each node with its state in text, not colour alone', () => {
    expect(item('tsms').dataset['state']).toBe('suspect');
    expect(item('hvd').dataset['state']).toBe('downstream-open');
    expect(item('tsms').textContent).toContain('Cause');
    expect(item('hvd').textContent).toContain('Upstream');
    expect(item('tsms').getAttribute('aria-label')).toBe('TSMS: Open — cause');
  });

  it('brackets the suspect stretch and the downstream run', () => {
    expect(item('tsms').dataset['zone']).toBe('stretch');
    expect(item('hvd').dataset['zone']).toBe('downstream');
    expect(item('cockpit-brb').dataset['zone']).toBeUndefined();
    expect(el.textContent).toContain('Cause');
    expect(el.textContent).toContain('Not the cause');
  });

  it('tags the energy meter placeholder', () => {
    expect(item('em-interlock').textContent).toContain('placeholder');
  });

  it('labels unmeasured nodes and draws them hollow', () => {
    expect(item('glvms').getAttribute('aria-label')).toMatch(/\(no sensor\)$/);
    expect(item('glvms').dataset['measured']).toBe('false');
    expect(item('tsms').getAttribute('aria-label')).not.toContain('no sensor');
    expect(item('tsms').dataset['measured']).toBe('true');
  });

  describe('selection', () => {
    it('reflects the selected node with aria-selected and makes it the only tab stop', () => {
      fixture.componentRef.setInput('selectedId', 'bots');
      fixture.detectChanges();
      expect(item('bots').getAttribute('aria-selected')).toBe('true');
      expect(item('tsms').getAttribute('aria-selected')).toBe('false');
      expect(item('bots').tabIndex).toBe(0);
      expect(el.querySelectorAll('[tabindex="0"]').length).toBe(1);
    });

    it('makes the first suspect the tab stop while nothing is selected', () => {
      expect(item('tsms').tabIndex).toBe(0);
      expect(item('glvms').tabIndex).toBe(-1);
    });

    it('highlights the previewed node', () => {
      fixture.componentRef.setInput('previewId', 'hvd');
      fixture.detectChanges();
      expect(item('hvd').dataset['highlighted']).toBe('true');
      expect(item('tsms').dataset['highlighted']).toBe('false');
    });

    it('selects on click and focus, previews on hover', () => {
      item('bots').click();
      item('hvd').dispatchEvent(new FocusEvent('focus'));
      item('glvms').dispatchEvent(new MouseEvent('mouseenter'));
      item('glvms').dispatchEvent(new MouseEvent('mouseleave'));
      expect(selected).toEqual(['bots', 'hvd']);
      expect(previewed).toEqual(['glvms', null]);
    });
  });

  describe('keyboard', () => {
    it('moves focus along the loop with arrow keys, Home and End', () => {
      item('tsms').focus();
      key('tsms', 'ArrowRight');
      expect(document.activeElement).toBe(item('hvd'));
      key('hvd', 'ArrowLeft');
      key('tsms', 'ArrowLeft');
      expect(document.activeElement).toBe(item('cockpit-brb'));
      key('cockpit-brb', 'Home');
      expect(document.activeElement).toBe(item('glvms'));
      key('glvms', 'End');
      expect(document.activeElement).toBe(item('airs'));
      expect(selected.at(-1)).toBe('airs');
    });

    it('selects with Enter and Space, clears with Escape', () => {
      key('bots', 'Enter');
      key('hvd', ' ');
      key('hvd', 'Escape');
      expect(selected).toEqual(['bots', 'hvd', null]);
    });
  });
});
