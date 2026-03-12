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
