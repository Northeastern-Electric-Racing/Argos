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

associated files/scripts:

```
./fetch-basemap.sh
```

The `/map` page draws an OpenStreetMap background from `angular-client/src/assets/map/basemap.pmtiles`, because there is no internet at competition. The script fetches it from the newest [Protomaps](https://maps.protomaps.com/builds) build: street-level detail (zoom 14) for a 20-mile circle around each venue in `map-venues.txt`, about 46 MB.

CI runs the script before building the client image, so deployed images always have the map. For `ng serve` or a local Docker build, run it once yourself; the file is git-ignored and never committed. To cover another venue, add a line to `map-venues.txt` and rerun it. Without the file the map has no background.
