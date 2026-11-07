import { Route } from '@angular/router';
import { appRoutes } from './app-routes';
import { routes } from './app-routing.module';

// The landing page was removed in #847: the graph page is now where Argos opens.
describe('app routes', () => {
  const routeFor = (path: string): Route | undefined => routes.find((route) => route.path === path);

  it('opens the graph page at the root path', () => {
    const root = routeFor('');

    expect(root?.redirectTo).toBe(appRoutes.graphRoute());
    expect(root?.pathMatch).toBe('full');
  });

  it('sends old landing links to the graph page', () => {
    const landing = routeFor('landing');

    expect(landing?.redirectTo).toBe(appRoutes.graphRoute());
    // A redirect only, so the deleted landing page is not loaded.
    expect(landing?.loadComponent).toBeUndefined();
  });

  it('no longer builds a landing route', () => {
    expect('landingRoute' in appRoutes).toBe(false);
  });
});
