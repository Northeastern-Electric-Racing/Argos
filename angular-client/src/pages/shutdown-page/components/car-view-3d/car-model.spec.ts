import { BoxGeometry, Group, Mesh, MeshBasicMaterial, Object3D, Vector3 } from 'three';
import { SHUTDOWN_LOOP } from '../../shutdown-loop.model';
import { prepareModel } from './car-model';

const IDS = new Set(SHUTDOWN_LOOP.map((n) => n.id));
const material = new MeshBasicMaterial();
/** A named object as GLTFLoader builds it: the authored name in userData.name, a sanitised copy in name. */
const named = <T extends Object3D>(obj: T, authored: string): T => {
  obj.userData['name'] = authored;
  obj.name = authored.replace(/[:.]/g, '');
  return obj;
};
const box = (w: number, h: number, d: number) => new Mesh(new BoxGeometry(w, h, d), material);
/** A car-sized body (in metres unless `unit` says otherwise), so the unit guess keeps the scale. */
const car = (unit = 1) => {
  const root = new Group();
  const body = box(1.2 * unit, 1 * unit, 2.9 * unit);
  body.position.set(0, 0.5 * unit, 1.2 * unit);
  root.add(body);
  return { root, body };
};

describe('prepareModel', () => {
  it('scales a millimetre model to metres, including an anchor nested under a scaled parent', () => {
    const { root } = car(1000);
    const parent = new Group();
    parent.position.set(100, 0, 0);
    parent.scale.setScalar(2);
    const anchor = named(new Object3D(), 'shutdown:tsms');
    anchor.position.set(50, 300, 200);
    parent.add(anchor);
    root.add(parent);

    const model = prepareModel(root, IDS);
    expect(model.scale).toBe(0.001);
    const [x, y, z] = model.anchors.get('tsms')!;
    expect(x).toBeCloseTo(0.2);
    expect(y).toBeCloseTo(0.6);
    expect(z).toBeCloseTo(0.4);
    expect(model.bounds.getSize(new Vector3()).z).toBeCloseTo(2.9);
  });

  it('hides a multi-material part anchor as a whole and leaves its parts out of the meshes', () => {
    const { root, body } = car();
    const part = named(new Group(), 'shutdown:glvms');
    const a = box(0.1, 0.1, 0.1);
    const b = box(0.1, 0.1, 0.1);
    b.position.set(0.1, 0, 0);
    part.add(a, b);
    part.position.set(-0.2, 0.75, 0.6);
    root.add(part);

    const model = prepareModel(root, IDS);
    expect(part.visible).toBe(false);
    expect(model.meshes).toEqual([body]);
    const [x, y, z] = model.anchors.get('glvms')!;
    expect(x).toBeCloseTo(-0.15);
    expect(y).toBeCloseTo(0.75);
    expect(z).toBeCloseTo(0.6);
  });

  it('anchors a mesh at the centre of its bounding box, not its origin', () => {
    const { root } = car();
    const geometry = new BoxGeometry(0.1, 0.1, 0.1).translate(0.3, 0, 0);
    const hvd = named(new Mesh(geometry, material), 'shutdown:hvd');
    hvd.position.set(0, 0.44, 0.4);
    root.add(hvd);
    const [x, y, z] = prepareModel(root, IDS).anchors.get('hvd')!;
    expect([x, y, z].map((v) => +v.toFixed(3))).toEqual([0.3, 0.44, 0.4]);
  });

  it('accepts the exporter forms of an anchor name', () => {
    const { root } = car();
    const brb = named(new Object3D(), 'Shutdown_Side_BRB_R.001');
    brb.position.set(-0.3, 0.9, 0.7);
    root.add(brb);
    expect(prepareModel(root, IDS).anchors.get('side-brb-r')).toEqual([-0.3, 0.9, 0.7]);
  });

  it('leaves ordinary geometry named like an anchor alone', () => {
    const { root } = car();
    const button = named(box(0.05, 0.05, 0.05), 'Shutdown_Button_Left');
    root.add(button);
    const model = prepareModel(root, IDS);
    expect(button.visible).toBe(true);
    expect(model.meshes).toContain(button);
    expect(model.anchors.size).toBe(0);
    expect(model.unknownAnchors).toEqual([]);
  });

  it('reports a shutdown: name with an unknown id as a typo and keeps it visible', () => {
    const { root } = car();
    const typo = named(box(0.05, 0.05, 0.05), 'shutdown:tsm');
    root.add(typo);
    const model = prepareModel(root, IDS);
    expect(model.unknownAnchors).toEqual(['shutdown:tsm']);
    expect(typo.visible).toBe(true);
    expect(model.anchors.size).toBe(0);
  });

  it('ignores objects with no authored name, whatever three called them', () => {
    const { root } = car();
    const unnamed = new Object3D();
    unnamed.name = 'shutdown_tsms';
    root.add(unnamed);
    expect(prepareModel(root, IDS).anchors.size).toBe(0);
  });

  it('warns about an anchor left at the model origin', () => {
    const { root } = car();
    root.add(named(new Object3D(), 'shutdown:tsms'));
    expect(prepareModel(root, IDS).warnings.join()).toContain('origin');
  });

  it('keeps the first anchor when a loop node is named twice', () => {
    const { root } = car();
    const first = named(new Object3D(), 'shutdown:tsms');
    first.position.set(0.1, 0.7, 0.6);
    const second = named(new Object3D(), 'shutdown:tsms.001');
    second.position.set(0.5, 0.7, 0.6);
    root.add(first, second);
    expect(prepareModel(root, IDS).anchors.get('tsms')).toEqual([0.1, 0.7, 0.6]);
  });
});
