# Add an optional three.js 3D car view to the Shutdown Loop page

Status: Proposed (written on the throwaway branches `throwaway-shutdown-3d-procedural` and `throwaway-shutdown-3d-gltf`; the adoption ticket decides it).

The Shutdown Loop page may show the car in 3D as well as in 2D. The 3D view draws the car with three.js, each loop node where it sits on the car and the loop wire through them in series order. The 2D view stays the primary view and the accessible one: the loop strip is the keyboard and assistive-tech path in both, and the 2D car is the fallback whenever 3D can't draw. Both car views implement the page's `CarLoopView` contract, so selection, the detail panel and colours are the page's and never the view's.

## Considered Options

- **2D only** (the spec's option A). Kept as the default on phones and as the fallback, but a side view hides where loop nodes sit across the car (the side BRBs, the E-box latches against the accumulator sense row).
- **A 3D library other than three.js** (Babylon.js, a WebGPU-only renderer). Rejected: larger, or not yet supported on the pit laptops. three.js is a renderer, not a UI kit, so ADR 0007 is untouched: every control around the canvas is still our Tailwind and Aria components.
- **Where the car comes from: under evaluation.** A procedural car built from primitives (theme-native, no asset) and a glTF model exported from CAD (real geometry, an asset to keep in step with the car) are two throwaway branches. The adoption ticket picks one, or both behind one `CarSource` seam; the frame, positions table, projection helpers and contract below are shared so either drops in.

## Why this shape

- **three.js only in a lazy chunk, pinned exactly.** The scene module is imported on demand when 3D is shown, so the initial bundle doesn't grow. `three` and `@types/three` are pinned to the same exact version and move together.
- **One shared frame and table.** `shutdown-loop.positions-3d.ts` holds every loop node's position in metres: +Y up, +Z forward (glTF's native forward), +X to the driver's left, the origin on the ground under the rear-axle centre. Any car source is placed in that frame by one transform.
- **Screen-space picking and HTML badges.** Markers are picked by their projected centre (nearest within 16 px, the nearer one on a tie). Badges and the suspect's halo are HTML over the canvas: a constant size at any zoom, never hidden by the scene, placed suspect-first so the cause is never covered.
- **Render on demand.** The scene renders only for a camera move, a resize, or a change of a loop node's state, mismatch or highlight; an idle page renders nothing, whatever the loop shows. The suspect's motion is a CSS animation on its halo, off under reduced motion.
- **Default view.** With no stored choice, 3D only when `(min-width: 1024px) and (pointer: fine)` matches; 2D otherwise. A stored choice (`argos.shutdown.carView`) always wins.
- **2D is the fallback.** No WebGL, a scene that fails to start, or a lost context shows the 2D car with a notice, keeping the selection.

## Consequences

- About 125 kB (transfer) of three.js loads the first time 3D is shown.
- WebGL is needed for 3D; software rendering works but costs CPU while orbiting.
- The positions table is schematic until the electrical lead confirms placements (the energy meter interlock's side is open).
- Two views draw the car, so a change to the loop (a new loop node) needs a position in the 3D table as well as the 2D coordinates; specs check both tables are complete.
