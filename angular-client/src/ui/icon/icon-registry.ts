import { HttpClient } from '@angular/common/http';
import { ErrorHandler, inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';

/**
 * The SVG icons `<ui-icon svg="…">` can draw, by name. The app registers its own files at start-up
 * (app-context); each is fetched once, on first use, and every icon gets its own copy of the parsed SVG.
 * Register only the app's own assets: the markup is inlined into the page.
 */
@Injectable({ providedIn: 'root' })
export class UiIconRegistry {
  private http = inject(HttpClient);
  private errors = inject(ErrorHandler);
  private urls = new Map<string, string>();
  private svgs = new Map<string, Promise<SVGElement | null>>();

  /** Adds icons: `register({ wifi: 'assets/icons/wifi.svg' })`. */
  register(icons: Record<string, string>): this {
    for (const [name, url] of Object.entries(icons)) {
      this.urls.set(name, url);
      this.svgs.delete(name);
    }
    return this;
  }

  /**
   * A fresh copy of the named icon's SVG, or null: quietly for a name nobody registered (specs render icons
   * without the app's registrations), reported when its file can't be read or is not an SVG.
   */
  async svg(name: string): Promise<SVGElement | null> {
    let svg = this.svgs.get(name);
    if (!svg) {
      svg = this.load(name);
      this.svgs.set(name, svg);
    }
    const loaded = await svg;
    return loaded && (loaded.cloneNode(true) as SVGElement);
  }

  private async load(name: string): Promise<SVGElement | null> {
    const url = this.urls.get(name);
    if (!url) return null;
    try {
      const text = await firstValueFrom(this.http.get(url, { responseType: 'text' }));
      const svg = new DOMParser().parseFromString(text, 'image/svg+xml').documentElement;
      if (svg.namespaceURI !== 'http://www.w3.org/2000/svg' || svg.localName !== 'svg')
        throw new Error(`${url} is not an SVG`);
      // As mat-icon set them: the SVG fills the icon's box, keeps its aspect and never takes focus.
      svg.setAttribute('fit', '');
      svg.setAttribute('height', '100%');
      svg.setAttribute('width', '100%');
      svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
      svg.setAttribute('focusable', 'false');
      return svg as unknown as SVGElement;
    } catch (error) {
      this.errors.handleError(new Error(`Icon "${name}": ${(error as Error).message}`));
      return null;
    }
  }
}
