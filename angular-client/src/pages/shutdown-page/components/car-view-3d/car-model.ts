import { Box3, Mesh, Object3D, Vector3 } from 'three';
import { Vec3 } from '../../shutdown-loop.positions-3d';
import { hasExactAnchorPrefix, parseNodeAnchorName, unitScaleFor } from './car-view-3d.utils';

// Preparing a loaded car model (docs/spec/shutdown-loop-page/car-model.md): units, anchors and the meshes to paint.
// Plain three core with no renderer, so it is tested in jsdom on trees built in code.

export interface PreparedModel {
  /** Loop node id → anchor position in metres, model space (the shared frame). */
  anchors: Map<string, Vec3>;
  /** The meshes to draw and repaint per material mode; anchors and everything under them are left out. */
  meshes: Mesh[];
  /** Bounds of `meshes`, in metres. Empty when the model has no geometry. */
  bounds: Box3;
  /** The unit scale applied (1, 0.01, 0.001 or 0.0254). */
  scale: number;
  /** Names with the exact `shutdown:` prefix whose id is not a loop node (typos in CAD). Left visible. */
  unknownAnchors: string[];
  /** Placement problems worth a console warning. */
  warnings: string[];
}

/** An anchor this close to the model origin was probably exported without "origin to geometry". */
const ORIGIN_WARNING_M = 0.01;

/**
 * Scales `root` to metres, then finds the anchors: objects whose authored name (`userData.name`, as GLTFLoader keeps
 * it) parses to one of `nodeIds`. An anchor is hidden with its whole subtree. An empty anchors at its world
 * origin; one with geometry (a mesh, or a group such as a multi-material part) at the centre of its bounding box.
 */
export function prepareModel(root: Object3D, nodeIds: ReadonlySet<string>): PreparedModel {
  const warnings: string[] = [];
  root.updateMatrixWorld(true);
  const raw = new Box3().setFromObject(root).getSize(new Vector3());
  const { scale, fits } = unitScaleFor(Math.max(raw.x, raw.y, raw.z));
  if (!fits) {
    warnings.push(
      `model is ${Math.max(raw.x, raw.y, raw.z).toPrecision(3)} units across, which no unit makes car-sized; drawn unscaled`
    );
  }
  root.scale.multiplyScalar(scale);
  root.updateMatrixWorld(true);
  const origin = root.getWorldPosition(new Vector3());

  const anchors = new Map<string, Vec3>();
  const meshes: Mesh[] = [];
  const unknownAnchors: string[] = [];
  const visit = (obj: Object3D) => {
    const authored = obj.userData['name'];
    if (typeof authored === 'string') {
      const id = parseNodeAnchorName(authored);
      if (id !== undefined && nodeIds.has(id)) {
        if (!anchors.has(id)) {
          const p = anchorPosition(obj);
          if (p.distanceTo(origin) < ORIGIN_WARNING_M) {
            warnings.push(`anchor ${authored} is at the model origin: set its origin to its geometry`);
          }
          anchors.set(id, [p.x, p.y, p.z]);
        }
        obj.visible = false;
        return;
      }
      if (hasExactAnchorPrefix(authored)) unknownAnchors.push(authored);
    }
    if (obj instanceof Mesh) meshes.push(obj);
    obj.children.forEach(visit);
  };
  visit(root);

  const bounds = new Box3();
  for (const mesh of meshes) bounds.expandByObject(mesh);
  return { anchors, meshes, bounds, scale, unknownAnchors, warnings };
}

function anchorPosition(obj: Object3D): Vector3 {
  let hasGeometry = false;
  obj.traverse((o) => (hasGeometry ||= o instanceof Mesh));
  return hasGeometry ? new Box3().setFromObject(obj).getCenter(new Vector3()) : obj.getWorldPosition(new Vector3());
}
