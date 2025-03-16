# AngularClient

The Angular Frontend for Argos.

---

## Quickstart

Make sure to install [node and npm](https://www.geeksforgeeks.org/how-to-download-and-install-node-js-and-npm/) before beginning. Contact a lead if you need help.

---

### Extensions to install

prettier: `esbenp.prettier-vscode`
eslint: `dbaeumer.vscode-eslint`

### Running the app

Make sure you're in the `angular-client` directory.

Set ./src/environment/environment.ts to the following for local development:

```
export const environment = {
  production: false,
  mapbox: {
    accessToken: 'pk.eyJ1IjoibWNrZWVwIiwiYSI6ImNscXBrcmU1ZTBscWIya284cDFyYjR3Nm8ifQ.6TQHlxhAJzptZyV-W28dnw'
  }
};

```

To install dependencies run:

`npm install`

To run the client in development mode run:

`npm run start`

Navigate to `http://localhost:4200/` to ensure the website is running, and you're done! The application will automatically reload if you change any of the source files.

---

## Development Guide

This section should be your first refrence when developing or running into development issues.

---

### Creating new files (compoents, etc)

Run `ng generate component component-name` to generate a new component. You can also use `ng generate directive|pipe|service|class|guard|interface|enum|module`.

### Building

Run `npm run build` to build the project. The build artifacts will be stored in the `dist/` directory.

### NPM package changes

When npm packages are changed, delete your node modules by running `rm -rF node_modules/` on mac/linux or on windows `rmdir /s /q node_modules` to delete your nodemodules (houses all external tools for development).

Then run `npm install` to install all the most recent modules.

### Developing with Data

Refer to top level `Argos/REAMDE.md` for how to setup mock data locally.
