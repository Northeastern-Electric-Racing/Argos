# Replace PrimeNG with our own components: Tailwind v4 over Angular Aria and the CDK

The angular-client's UI is our own components, with no PrimeNG or Angular Material. Angular Aria (accordion, combobox, listbox, menu, tabs, tree) and the CDK (dialog, overlay, table, a11y, drag-drop) handle behaviour. Tailwind v4 utilities on a locked set of tokens handle styling. Tokens live in `src/styles/theme.css`, a look used in more than one place is a recipe of literal class lists in `src/ui/recipes/`, and the shared primitives live in `src/ui/`: button and field atoms, dialog, confirm, select, popover, drawer, accordion body, switch, toast, date-time input, icon and a focus helper. This settles #864; spike #955 built it and #960 lands it.

## Considered Options

- **Upgrade to PrimeNG 22.** It needs a commercial license NER doesn't qualify for free, and PrimeNG 21, the last MIT release, doesn't support Angular 22 (#814).
- **Fork PrimeNG 21** (#871). We'd own every future Angular fix.
- **Angular Material and the CDK** (#866). Its look and its checkbox tree didn't fit.
- **Taiga UI** (#868). Russian-backed.
- **Spartan** (#867) and **ng-zorro-antd** (#869). Dropped; no reason was recorded.
- **Angular Aria and the CDK with component CSS** (#870, PR #909). Carried forward, with Tailwind added on top.
- **Tailwind v4 over Angular Aria and the CDK** (#955, PR #958). Chosen.

## Why our own components

- **License.** PrimeNG 22 is commercial. Angular Aria and the CDK are MIT and maintained by the Angular team, so they keep step with Angular; Tailwind is MIT.
- **Security.** Behaviour comes from the Angular team's own packages and styling from Tailwind, not a third-party component vendor. Taiga was ruled out on the same grounds, as Russian-backed.
- **Capability.** We build exactly what we need, like the topic tree, instead of working around a library's limits and defaults (Material's checkbox tree).
- **Stricter, custom styling.** There is no vendor theme to override. `--color-*: initial` drops Tailwind's palette, so only our AA-vetted colours exist and an off-palette colour is not a class; the type scale (`--text-*`) and radii (`--radius-*`) are locked the same way. ESLint (`eslint-plugin-better-tailwindcss`) rejects unknown classes, arbitrary colours, opacity on text colour, `dark:` and the `!` modifier.
- **Side benefits.** A Playwright WCAG AA audit (contrast, non-text contrast, focus, reflow, target size) passed on all 14 routes at 390 and 1440 wide. Global CSS fell to about 82 kB, with Mapbox's 36 kB only on the map page, against PrimeNG's 113 kB plus 38–118 kB of runtime theme per route.

The cost: we build and own every component.

## Consequences

- **Packages.** `primeng`, `primeicons` and `@angular/material` are uninstalled. `tailwindcss` and `@tailwindcss/postcss` 4, `prettier-plugin-tailwindcss` 0.7 (held there by the pinned Prettier 3.2.5) and `eslint-plugin-better-tailwindcss` are added.
- **Cascade layers.** `src/styles.css` declares `theme, base, vendor, cdk, components, utilities`. Unlayered CSS beats every layer whatever its specificity, so a component is all utilities or all CSS, never both, and third-party CSS is imported into a layer below utilities. Mapbox GL's sheet is in `vendor` (`src/styles/mapbox.css`, the non-injected `mapbox` bundle the map page links); the CDK's prebuilt a11y CSS is in `cdk`; `components` is empty. The only unlayered third-party CSS is what the CDK injects at runtime: the overlay container, pane and backdrop, plus one-rule copies of `.cdk-dialog-container`, `.cdk-visually-hidden` and `.cdk-table-fixed-layout`. Size an overlay pane through its content.
- **Icons.** `<ui-icon>` (`src/ui/icon/`) draws a Material Icons font ligature (`name`) or an SVG from `src/assets/icons/` registered with `UiIconRegistry` in `app-context` (`svg`). It replaced `mat-icon`, whose unlayered CSS beat utilities.
- **Literal classes.** Tailwind emits only whole words it finds in `.ts` and `.html` under `src`, specs excluded. Recipes are complete class lists marked with `tw()` and joined with `cx()`, never built from fragments (`'bg-' + tone` emits nothing). Words in comments emit utilities too, so `styles.css` excludes the known ones.
- **Tests.** Specs assert behaviour and ARIA; jsdom can't see styling. Looks and AA are checked by the Playwright audit kit, which is not in CI.
- **The look.** It follows PrimeNG's roughly, not pixel for pixel, and each difference is on a recorded list. Most are AA-driven: 3:1 control edges, danger buttons as an orange edge rather than a fill, `#a3a3a3` muted text, recoloured heat-map cells, status lights and fault rows, 24px targets and reflow at 390. The rest are colours snapped to the nearest token, type sizes snapped to the scale (about 6% or less) and dropped ripples and glows. Four were not AA-driven and were decided by hand: the notification log's row hover is back to PrimeNG's 3% tint, the BMS cell panel's titles stay at 24px (from 22px), the charging battery nub while clicked is back to PrimeNG's `#808080`, and the charging SoC card on phones stays at 122px (from 123px).
- **Conventions.** The angular-client conventions in `docs/CONTEXT.md` state the day-to-day rules.

See #864, #955 and #960, `src/styles.css`, `src/styles/theme.css` and `src/ui/recipes/`.
