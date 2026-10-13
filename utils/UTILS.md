# Guide on all development Utils

### Downloading SVG's / Icons for Angular

associated files/scripts:

```
./fetch-gmsvg ICON [STYLE] [FILL] [SIZE] [DIR] [NAME]
```

We have to download and store material icon's we use because the PI-5 we use during testing sometimes doesn't have internet and can't pull the svg's from google material's endpoint.

So what we do is download and store the SVG's in our project.

Example usage: (more_horiz) is google material icon name

```
./fetch-gmsvg more_horiz
```

browser icons to use @: https://fonts.google.com/icons

### Offline map background (PMTiles)

The `/map` page draws an OpenStreetMap background from a local PMTiles file, because there is no internet at competition. With no file configured it shows a plain dark background.

Make the venue file once, while you have internet, with the [`pmtiles` CLI](https://github.com/protomaps/go-pmtiles/releases). Pick a recent daily build date from https://maps.protomaps.com/builds and the venue's bounding box:

```
pmtiles extract https://build.protomaps.com/<YYYYMMDD>.pmtiles venue.pmtiles --bbox=minLon,minLat,maxLon,maxLat
```

A box of about ±0.01° around a venue is a few MB. Put the file in `angular-client/src/assets/map/` (git-ignored; never commit a `.pmtiles` file), so the client serves it, then set `MAP_PMTILES_URL` to its path:

- `ng serve`: add `MAP_PMTILES_URL: '/assets/map/venue.pmtiles'` to `angular-client/src/assets/env.js`.
- Docker: set `MAP_PMTILES_URL=/assets/map/venue.pmtiles` for `compose.client.yml`, with the file in `src/assets/map/` when the image is built, or bind-mounted into `/usr/share/nginx/html/assets/map/`.
