# AngularClient

The Angular Frontend for Argos.

## Local Development

Make sure you're in the `angular-client` directory.

Set environment/environment.ts to the following for local development:
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


## Code scaffolding

Run `ng generate component component-name` to generate a new component. You can also use `ng generate directive|pipe|service|class|guard|interface|enum|module`.

## Build

Run `npm run build` to build the project. The build artifacts will be stored in the `dist/` directory.


