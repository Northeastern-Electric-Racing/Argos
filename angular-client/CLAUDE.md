# Frontend Development Guidelines

## TypeScript
- Use strict type checking
- Prefer type inference when obvious; avoid `any` (use `unknown`)

## Angular 19
- Always use standalone components (do NOT set `standalone: true`; it's the default)
- Use signals for state management
- Lazy load feature routes
- Use `host` object in decorators instead of `@HostBinding`/`@HostListener`
- Use `NgOptimizedImage` for static images (not for inline base64)

## Components
- Single responsibility; keep small
- Use `input()` / `output()` functions, not decorators
- Use `computed()` for derived state
- Set `changeDetection: ChangeDetectionStrategy.OnPush`
- Always use external template files (templateUrl), never inline templates
- Always use external style files (styleUrls), never inline styles
- Prefer Reactive forms over Template-driven
- Use `class` bindings (not `ngClass`) and `style` bindings (not `ngStyle`)
- Use relative paths for external templates/styles

## State Management
- Signals for local state, `computed()` for derived state
- Use `update` or `set` on signals, never `mutate`
- Keep state transformations pure and predictable

## Templates
- Use `@if`, `@for`, `@switch` (not `*ngIf`, `*ngFor`, `*ngSwitch`)
- Use async pipe for observables
- No globals (`new Date()`) or arrow functions in templates
- Keep templates simple; avoid complex logic

## Services
- Single responsibility; use `providedIn: 'root'` for singletons
- Use `inject()` function, not constructor injection

## Icons
- Never use emojis in UI; always use SVG icons or icon fonts
- App-level UI (nav, pages): Material Icons via `<mat-icon [svgIcon]="'name'" />`
- PrimeNG component contexts (table row actions, dialog buttons): PrimeIcons via `icon="pi pi-*"`
- Custom SVGs go in `src/assets/icons/` and get registered with MatIconRegistry

## Accessibility
- Must pass all AXE checks
- WCAG AA minimum: focus management, color contrast, ARIA attributes

## UI Verification
After UI changes, verify visually using Playwright MCP or screenshots. Capture at multiple viewport widths for responsive changes.
Save all screenshots to `pictures/<branch>/`; see the root CLAUDE.md "Screenshots" section for the full path convention.
