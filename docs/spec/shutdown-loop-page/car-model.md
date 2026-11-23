# Car model for the Shutdown Loop 3D view (glTF)

Status: throwaway (`throwaway-shutdown-3d-gltf`). This is the input for ADR 0010, which decides at adoption how
3D is drawn and where a real CAD model comes from. The spec (`spec.md`) still says "option A, chosen" for the 2D
view; any adoption of a 3D view must amend it.

The glTF 3D view loads `angular-client/src/assets/models/car.glb` (served at `assets/models/car.glb`). The file
in the repo is a **stand-in**: a rough open-wheel car built by `angular-client/scripts/generate-placeholder-car.mjs`,
with three loop node anchors so the anchor path is exercised.

What the view does with the file:

| File | View |
| --- | --- |
| A valid GLB | The car, with the loop wiring and markers inside it. |
| Missing (404), or not a GLB (an SPA server answering with `index.html` and 200) | The wiring and markers alone, with "No car model yet, showing the loop wiring only". |
| A GLB that fails to parse, or takes longer than 20 s with its Draco decoding | The 2D view, with a notice. |

The file is fetched with `cache: 'no-cache'`, so saving over it shows the new model on the next page load.

## The frame

The shared 3D frame (`shutdown-loop.positions-3d.ts`) is glTF's own, so nothing is rotated on load:

| | glTF file | Blender |
| --- | --- | --- |
| Units | metres | metres (or mm, see below) |
| Up | +Y | +Z |
| Forward (towards the nose) | +Z | −Y (towards the viewer in Front view, numpad 1) |
| Driver's left | +X | +X |
| Origin | ground, under the rear-axle centre | the same point |

Blender's glTF exporter writes a Blender point (x, y, z) as glTF (x, z, −y). So a **table entry is
`[Blender X, Blender Z, −Blender Y]`**. Example: TSMS sits in Blender at X −0.20, Y −0.66, Z 0.75, which is the
table's `tsms: [-0.2, 0.75, 0.66]`.

## Exporting from Blender

1. Turn the car so its nose points along Blender −Y (it faces you in Front view), wheels on the ground (Z = 0).
2. Move it so the ground point under the centre of the rear axle is at the world origin.
3. Select everything, then Object ▸ Apply ▸ All Transforms.
4. File ▸ Export ▸ glTF 2.0. Format "glTF Binary (.glb)", and leave Include ▸ Transform ▸ "+Y Up" on.
5. Keep it light: drop fasteners and internals, decimate, and tick Data ▸ Compression (Draco). Aim for a few MB.
6. Save it over `angular-client/src/assets/models/car.glb` and reload the Shutdown page.

From SolidWorks or Fusion: export STEP, import into Blender (an add-on, or via FreeCAD to OBJ/glTF), then follow the
steps above. CAD often exports Y up with an arbitrary forward axis, so check the Side view (below).

Units: export in metres or millimetres. The view picks the unit (m, cm, mm, inch) that makes the model closest to a
3 m car, and only between 1.5 m and 6 m; otherwise it draws the model unscaled and warns. Inches are a guess, so
prefer metres or millimetres.

## Placing loop nodes in the model

Each loop node is drawn at its table entry (`NODE_POSITIONS_3D`) unless the model has an **anchor** for it: a node
named `shutdown:<loop node id>`, the ids in `SHUTDOWN_LOOP` (`shutdown-loop.model.ts`).

- Prefer an **empty** (Add ▸ Empty ▸ Plain Axes) where the part sits; its origin is used.
- A **part** can be the anchor too (a mesh, or a group such as a multi-material part). It is hidden, and the
  centre of its bounding box is used. Set its origin to its geometry anyway (Object ▸ Set Origin ▸ Origin to
  Geometry): an anchor left at the model origin is warned about.
- Exporters that refuse `:` or `-` may write `shutdown_side_brb_r`; any case and Blender's `.001` suffix work.
  Only the exact `shutdown:` prefix reports unknown ids, so `Shutdown_Button_Left` stays ordinary geometry.

## Check it

1. Open the Shutdown page in 3D and pick **Side**: the nose points left, as in the 2D view.
2. Open the browser console. Each load writes one line, for example
   `car.glb: 3/19 loop nodes from anchors (tsms, side-brb-r, hvd), scale ×1, unknown: none`, plus a warning for
   anything suspicious.

| You see | Likely cause |
| --- | --- |
| The car on its side, or nose up | Axes: the model wasn't turned before Apply ▸ All Transforms, or "+Y Up" was off. |
| Markers outside the car, or the car tiny or huge | Units or origin: check the `scale ×` in the console line and where the origin is. |
| Every anchored marker at the rear axle | Part anchors exported with their origin at the model origin. |
| `unknown: shutdown:tsm` | A typo in an anchor name. |

## The stand-in

From `angular-client/`: `node scripts/generate-placeholder-car.mjs`. It writes the car in the shared frame with an
empty `shutdown:tsms`, an exporter-style empty `Shutdown_Side_BRB_R.001`, and a two-material part `shutdown:hvd`,
each a few cm off its table entry. It is for this throwaway only; whether the real model lives in git, in LFS or
is fetched like the basemap is for ADR 0010.
