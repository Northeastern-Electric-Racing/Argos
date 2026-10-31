import { ApplicationRef, Injector } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { focusIfLost, focusLost, focusTargetNear } from './focus.utils';

describe('focus utils', () => {
  let container: HTMLElement;

  const rows = (count: number) => {
    container.innerHTML =
      '<button class="first">Add</button>' +
      Array.from({ length: count }, (_, i) => `<button class="delete" data-i="${i}">Delete</button>`).join('');
  };

  beforeEach(() => {
    container = document.body.appendChild(document.createElement('div'));
  });

  afterEach(() => container.remove());

  describe('focusTargetNear', () => {
    it('picks the row that took the deleted row’s place', () => {
      rows(3);
      expect(focusTargetNear(container, '.delete', 1)?.dataset['i']).toBe('1');
    });

    it('picks the new last row when the last row was deleted', () => {
      rows(2);
      expect(focusTargetNear(container, '.delete', 2)?.dataset['i']).toBe('1');
    });

    it('falls back to the container’s first button when no rows are left', () => {
      rows(0);
      expect(focusTargetNear(container, '.delete', 0)?.className).toBe('first');
    });

    it('returns null without a container', () => {
      expect(focusTargetNear(null, '.delete', 0)).toBeNull();
    });
  });

  describe('focusIfLost', () => {
    it('focuses the target once focus has fallen to the body', async () => {
      rows(1);
      (document.activeElement as HTMLElement | null)?.blur();
      expect(focusLost()).toBe(true);

      focusIfLost(() => container.querySelector<HTMLElement>('.delete'), TestBed.inject(Injector));
      await TestBed.inject(ApplicationRef).whenStable();

      expect(document.activeElement).toBe(container.querySelector('.delete'));
    });

    it('leaves focus alone when something still has it', async () => {
      rows(1);
      const first = container.querySelector<HTMLElement>('.first')!;
      first.focus();

      focusIfLost(() => container.querySelector<HTMLElement>('.delete'), TestBed.inject(Injector));
      await TestBed.inject(ApplicationRef).whenStable();

      expect(document.activeElement).toBe(first);
    });
  });
});
