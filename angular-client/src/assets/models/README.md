# Car model for the Shutdown Loop 3D view

The Shutdown page's 3D view loads `car.glb` from this folder. The file here now is a **placeholder**: a
rough open-wheel car built by `scripts/generate-placeholder-car.mjs`. Replace it with the real CAD export.
If the file is missing or can't be read, the page falls back to the 2D side view and says why.

## Model convention

Export the model so that, in the file:

| | |
|---|---|
| Units | metres (1 unit = 1 m) |
| +X | forward, towards the nose |
| +Y | up |
| +Z | to the driver's right |
| Origin | on the ground, directly under the centre of the rear axle |

Node positions (`src/pages/shutdown-page/shutdown-loop.positions-3d.ts`) use the same convention, so the
model and the nodes line up without any fitting.

The viewer is forgiving about two things: it scales a model exported in millimetres or centimetres down to
metres (judged from its size: a car is a few metres long), and it fits the camera to whatever it loads.
It does **not** rotate the model. glTF's own convention is +Y up and +Z forward, so most exporters need
the model turned 90° about Y (nose to +X) before export.

## Exporting and replacing

1. From CAD, export to glTF binary (`.glb`). If the CAD tool can't, export STEP/OBJ/FBX and convert in
   Blender: import, set units to metres, rotate so the nose points along +X with Y up, move the origin to
   the ground under the rear axle centre, then File, Export, glTF 2.0, format "glTF Binary".
2. Keep it light: drop fasteners and internal detail, decimate (Blender's Decimate modifier), and turn on
   Draco mesh compression in the export options. Aim for a few MB at most. Draco files decode in the
   browser with the decoder copied from three into `assets/draco/` at build time (`angular.json`), so no
   CDN is needed.
3. Save it over `car.glb` here and reload the Shutdown page.

CAD colours often clash with the app. The view's "Model colours" control repaints the model in a theme
grey ("Theme") or a see-through grey ("Ghost", the default) so the nodes inside the chassis show; "CAD"
keeps the file's own materials.

## Placing nodes

Each shutdown node needs a position. Two ways, the model winning when both exist:

- **In CAD (preferred once a real model exists):** add an empty (Blender) or a tiny part named
  `shutdown:<node id>`, for example `shutdown:tsms` or `shutdown:side-brb-r`, where that part sits. The ids are
  the `id`s in `SHUTDOWN_LOOP` (`shutdown-loop.model.ts`). Exporters that don't allow `:` or `-` may use
  `shutdown_side_brb_r`; any case and Blender's `.001` suffix are fine. A tiny part used as an anchor is
  hidden. Anchors with an unknown id are logged in the browser console. The node's detail panel says
  "Position: from the model" when an anchor was used.
- **In the table:** edit `NODE_POSITIONS_3D` in `shutdown-loop.positions-3d.ts` (metres, convention above).
  To find a coordinate, select the part in Blender and read its location (after the export transform), or
  measure from the rear axle centre in CAD. A unit test checks every loop node has an entry.

## Regenerating the placeholder

From `angular-client/`: `node scripts/generate-placeholder-car.mjs`.
