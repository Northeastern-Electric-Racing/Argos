import { Component, HostListener, inject, input, isDevMode } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { map } from 'rxjs';

/**
 * PROTOTYPE — dev-only floating variant switcher. Cycles the ?variant= query param
 * (shareable + reload-stable) via arrows or ← / → keys. Hidden in production builds.
 * Delete together with the variant chips once the prototype is resolved.
 */
@Component({
  selector: 'proto-prototype-switcher',
  standalone: true,
  template: `
    @if (isDev) {
      <div class="switcher">
        <button type="button" (click)="cycle(-1)" aria-label="Previous variant">‹</button>
        <span class="lbl">{{ current() }}{{ name() }}</span>
        <button type="button" (click)="cycle(1)" aria-label="Next variant">›</button>
      </div>
    }
  `,
  styles: [
    `
      .switcher {
        position: fixed;
        bottom: 16px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 1000;
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 6px 10px;
        border-radius: 999px;
        background: #f5f5f5;
        color: #111111;
        box-shadow: 0 6px 20px rgba(0, 0, 0, 0.5);
        font-family: monospace;
        font-size: 14px;
      }
      .switcher button {
        border: none;
        background: #111111;
        color: #ffffff;
        width: 26px;
        height: 26px;
        border-radius: 50%;
        cursor: pointer;
        font-size: 16px;
        line-height: 1;
      }
      .lbl {
        min-width: 160px;
        text-align: center;
        font-weight: 700;
      }
    `
  ]
})
export class PrototypeSwitcherComponent {
  variants = input<string[]>(['A']);
  names = input<Record<string, string>>({});
  isDev = isDevMode();

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private param = toSignal(this.route.queryParamMap.pipe(map((p) => p.get('variant'))));

  current = (): string => this.param() ?? this.variants()[0];

  name = (): string => {
    const n = this.names()[this.current()];
    return n ? ` — ${n}` : '';
  };

  cycle = (dir: number): void => {
    const vs = this.variants();
    const i = vs.indexOf(this.current());
    const next = vs[(i + dir + vs.length) % vs.length];
    this.router.navigate([], { queryParams: { variant: next }, queryParamsHandling: 'merge' });
  };

  @HostListener('document:keydown', ['$event'])
  onKey(e: KeyboardEvent): void {
    const t = e.target as HTMLElement | null;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
    if (e.key === 'ArrowLeft') this.cycle(-1);
    else if (e.key === 'ArrowRight') this.cycle(1);
  }
}
