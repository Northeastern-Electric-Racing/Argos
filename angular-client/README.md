# AngularClient

The Angular Frontend for Argos.

---

## Quickstart

Make sure to install [node and npm](https://www.geeksforgeeks.org/how-to-download-and-install-node-js-and-npm/) before beginning. Contact let us know in slack if you have issues.

---

### Extensions to install

Please install by searching that id(s) in vs code extensions.

prettier: `esbenp.prettier-vscode` <br>
eslint: `dbaeumer.vscode-eslint` <br>
angular intellisense: `angular.ng-template`

### Running the app

Make sure you're in the `angular-client` directory.

To install dependencies run:

`npm install`

To run the client in development mode run:

`npm run start`

Navigate to `http://localhost:4200/` to ensure the website is running, and you're done! The application will automatically reload if you change any of the source files.

---

## Development Guide

This section should be your first refrence when developing or running into development issues.

---

### Code conventions

**TypeScript**
- Use strict type checking. Prefer inference when obvious; avoid `any` (use `unknown`).

**Angular**
- Standalone components (the default; don't set `standalone: true`), lazy-loaded feature routes.
- `input()` / `output()` functions, not decorators; `inject()`, not constructor injection.
- Signals for local state, `computed()` for derived state; `set`/`update`, never `mutate`.
- `changeDetection: ChangeDetectionStrategy.OnPush`.
- External `templateUrl` and `styleUrls` with relative paths, never inline templates or styles.
- `host` object in decorators instead of `@HostBinding`/`@HostListener`.
- Reactive forms over template-driven forms.
- `NgOptimizedImage` for static images (not inline base64).
- Services: single responsibility, `providedIn: 'root'` for singletons.

**Templates**
- `@if`, `@for`, `@switch` (not `*ngIf`, `*ngFor`, `*ngSwitch`); async pipe for observables.
- `class` and `style` bindings (not `ngClass` / `ngStyle`).
- No globals (`new Date()`) or arrow functions in templates; keep logic out of them.

**Icons**
- Never use emojis in the UI.
- App-level UI (nav, pages): Material Icons via `<mat-icon [svgIcon]="'name'" />`.
- PrimeNG contexts (table row actions, dialog buttons): PrimeIcons via `icon="pi pi-*"`.
- Custom SVGs go in `src/assets/icons/` and are registered with `MatIconRegistry`.

**Accessibility**
- Must pass all AXE checks; WCAG AA minimum (focus management, color contrast, ARIA).

### Creating new files (compoents, etc)

Run `ng generate component component-name` to generate a new component. You can also use `ng generate directive|pipe|service|class|guard|interface|enum|module`.

### Building

Run `npm run build` to build the project. The build artifacts will be stored in the `dist/` directory.

### NPM package changes

When npm packages are changed, delete your node modules by running `rm -rF node_modules/` on mac/linux or on windows `rmdir /s /q node_modules` to delete your nodemodules (houses all external tools for development).

Then run `npm install` to install all the most recent modules.

### Developing with Data

Refer to top level `Argos/REAMDE.md` for how to setup mock data locally.

### Env Variables

To update dev env variables, just change the values in assets/env.js

To set prod env variables, change the associated docker composes environment variables. The only relevant one is backend_url