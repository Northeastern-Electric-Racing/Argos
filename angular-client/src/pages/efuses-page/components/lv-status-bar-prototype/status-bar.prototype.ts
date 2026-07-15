import { Component, input, signal } from '@angular/core';
import { MatIcon } from '@angular/material/icon';

/**
 * PROTOTYPE (#705, foundation for #709). Reusable "quick view" status bar: a right-edge
 * sidebar pop-out, top-aligned, that surfaces pinned chips (projected via <ng-content/>).
 * Auto-opens; a handle at the top-right edge re-opens it after collapse. Sticky while
 * scrolling — pins to the top-right corner. Design is locked (side + Quick View header);
 * fold into a real src/components/status-bar when #709 builds out multi-chip pinning.
 */
@Component({
  selector: 'proto-status-bar',
  standalone: true,
  imports: [MatIcon],
  template: `
    @if (collapsed()) {
      <button type="button" class="side-handle" (click)="toggle()" aria-expanded="false" aria-label="Show status bar">
        <mat-icon aria-hidden="true">chevron_left</mat-icon>
      </button>
    } @else {
      <div class="panel">
        <div class="sidebar-header">
          <span class="sidebar-title">Quick view</span>
          <button type="button" class="panel-collapse" (click)="toggle()" aria-expanded="true" aria-label="Hide status bar">
            <mat-icon aria-hidden="true">chevron_right</mat-icon>
          </button>
        </div>
        <ng-content />
      </div>
    }
  `,
  styles: [
    `
      /* Block host so the sticky container's containing block spans the whole page. */
      :host {
        display: block;
        position: sticky;
        top: 0;
        z-index: 20;
      }

      @keyframes sidebar-in {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }

      /* Collapsed affordance: a handle docked flush to the top-right edge. */
      .side-handle {
        position: absolute;
        top: 0;
        right: 0;
        width: 30px;
        height: 56px;
        padding: 0;
        border: 1px solid var(--color-divider);
        border-right: none;
        border-radius: 10px 0 0 10px;
        background: var(--color-background-info);
        color: #ffffff;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }
      .side-handle:hover {
        background: #383838;
      }
      .side-handle mat-icon {
        width: 26px;
        height: 26px;
        font-size: 26px;
        line-height: 26px;
      }

      /* Open sidebar: docked flush to the right edge, top-aligned, hugs its chip(s). */
      .panel {
        position: absolute;
        top: 0;
        right: 0;
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: 10px;
        padding: 10px 12px 14px;
        background: var(--color-background-info);
        border: 1px solid var(--color-divider);
        border-right: none;
        border-radius: 12px 0 0 12px;
        box-shadow: -6px 6px 18px rgba(0, 0, 0, 0.45);
        animation: sidebar-in 0.2s ease;
      }

      /* Header: tiny "Quick view" title on the left, close chevron on the right. */
      .sidebar-header {
        align-self: stretch;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
      }
      .sidebar-title {
        font-size: var(--font-size-sm, 12px);
        font-weight: 600;
        letter-spacing: 0.04em;
        text-transform: uppercase;
        color: #9a9a9a;
        padding-left: 2px;
      }

      .panel-collapse {
        flex: 0 0 auto;
        width: 28px;
        height: 28px;
        padding: 0;
        border: none;
        border-radius: 6px;
        background: transparent;
        color: #cfcfcf;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }
      .panel-collapse:hover {
        background: rgba(255, 255, 255, 0.08);
      }
      .panel-collapse mat-icon {
        width: 22px;
        height: 22px;
        font-size: 22px;
        line-height: 22px;
      }
    `
  ]
})
export class StatusBarComponent {
  collapsed = signal(false);
  toggle = (): void => this.collapsed.update((c) => !c);
}

/**
 * PROTOTYPE — reusable small-card chip shell that sits on the status bar. Content-sized,
 * capped at 1/4 of the viewport, never stretched. icon + label + value/unit + optional dot.
 */
@Component({
  selector: 'proto-status-bar-item',
  standalone: true,
  imports: [MatIcon],
  template: `
    <div class="chip">
      @if (icon()) {
        <mat-icon class="icon" [svgIcon]="icon()!" aria-hidden="true" />
      }
      @if (label()) {
        <span class="label">{{ label() }}</span>
      }
      <span class="value">{{ value() }}</span>
      @if (unit()) {
        <span class="unit">{{ unit() }}</span>
      }
      @if (dotColor()) {
        <span class="dot" [style.background]="dotColor()!"></span>
      }
    </div>
  `,
  styles: [
    `
      .chip {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        max-width: 25vw;
        box-sizing: border-box;
        padding: 8px 14px;
        border-radius: 8px;
        background: var(--color-background-page);
        border: 1px solid var(--color-divider);
        white-space: nowrap;
        overflow: hidden;
      }
      .icon {
        width: 20px;
        height: 20px;
        flex: 0 0 auto;
        color: #cfcfcf;
      }
      .label {
        font-size: var(--font-size-md, 14px);
        color: #b7b7b7;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .value {
        font-size: var(--font-size-md, 15px);
        font-weight: 600;
        color: #ffffff;
      }
      .unit {
        font-size: var(--font-size-sm, 12px);
        color: #9a9a9a;
        margin-left: -2px;
      }
      .dot {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        flex: 0 0 auto;
        margin-left: 2px;
      }
    `
  ]
})
export class StatusBarItemComponent {
  icon = input<string>();
  label = input<string>();
  value = input<string>('');
  unit = input<string>();
  dotColor = input<string>();
}
