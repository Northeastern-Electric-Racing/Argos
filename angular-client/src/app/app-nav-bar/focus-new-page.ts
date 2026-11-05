/**
 * Focus after an in-app navigation whose trigger left with the old page (a drawer item, BMS "See more", the
 * segment selector): the new page's menu button, else the page's host in app-context's `<main>` (display:
 * contents, so main itself can't take focus). Never `<body>`.
 */

/** Pages outside the nav's items, by path. */
const PAGE_LABELS: Record<string, string> = {
  '/notification-log': 'Notification Log',
  '/faults/fault-graph': 'Fault Graph'
};

/** The name of the page at `url`: its nav item's label, else its own (the notification log, a BMS segment). */
export function pageLabel(url: string, navItems: readonly { id: string; label: string }[]): string | undefined {
  const [path] = url.split(/[?#]/);
  const segment = /^\/bms\/segment\/(\d+)$/.exec(path);
  if (segment) return `BMS Segment ${segment[1]}`;
  return navItems.find((item) => item.id && item.id === path)?.label ?? PAGE_LABELS[path];
}

/** Focus has gone nowhere: to `<body>`, or it stayed on an element that has left the document. */
export function focusIsLost(): boolean {
  const active = document.activeElement;
  return !active || active === document.body || !active.isConnected;
}

/**
 * Focus the routed page's menu button, or else the page's host. The host is focusable only until focus leaves
 * it, like a skip link's target, and draws no ring. While it holds focus it is a group named after the page
 * (`label`), so a screen reader announces "Graph" rather than the page's whole text or nothing.
 */
export function focusNewPage(label?: string): void {
  const toggle = document.querySelector<HTMLElement>('sidebar-toggle button');
  if (toggle) return toggle.focus();
  const page = document.querySelector<HTMLElement>('main > router-outlet + *');
  if (!page) return;
  if (!page.hasAttribute('tabindex')) {
    const named = !!label && !page.hasAttribute('role') && !page.hasAttribute('aria-label');
    page.tabIndex = -1;
    page.classList.add('outline-none');
    if (named) {
      page.setAttribute('role', 'group');
      page.setAttribute('aria-label', label);
    }
    page.addEventListener(
      'focusout',
      () => {
        page.removeAttribute('tabindex');
        page.classList.remove('outline-none');
        if (named) {
          page.removeAttribute('role');
          page.removeAttribute('aria-label');
        }
      },
      { once: true }
    );
  }
  page.focus();
}
