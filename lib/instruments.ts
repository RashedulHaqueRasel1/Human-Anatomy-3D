import * as THREE from "three";

/**
 * Procedural surgical instruments, modelled at real size (metres).
 *
 * Every instrument is returned in a common frame so it can be placed on a
 * surface hit:  origin = working point (blade belly / jaw tip / retractor lip),
 * +Y = surface normal (up, away from tissue), +X = direction of travel,
 * handle trailing backwards (-X) and up.
 */

export type InstrumentKind = "scalpel" | "forceps" | "retractor" | "clamp" | "babcock" | "needle";

export type Instrument = THREE.Group & {
  userData: {
    kind: InstrumentKind;
    /** 0 = open, 1 = closed (jawed instruments only). */
    setClosed?: (t: number) => void;
    /** 0..1 amount of blood on the working end. */
    setBlood?: (t: number) => void;
  };
};

/* ------------------------------------------------------------------ */
/* Materials                                                           */
/* ------------------------------------------------------------------ */

const steelBrushed = () =>
  new THREE.MeshPhysicalMaterial({
    color: "#b9c0c9",
    metalness: 1,
    roughness: 0.3,
    anisotropy: 0.7,
    clearcoat: 0.3,
    clearcoatRoughness: 0.25,
    // polished steel next to the bloom pass blows out into a white bar: keep reflections modest
    envMapIntensity: 0.5,
  });
const steelPolished = () =>
  new THREE.MeshPhysicalMaterial({ color: "#e4e8ee", metalness: 1, roughness: 0.2, clearcoat: 0.4, clearcoatRoughness: 0.12, envMapIntensity: 0.5 });
const steelSatin = () => new THREE.MeshPhysicalMaterial({ color: "#a9b1bb", metalness: 1, roughness: 0.42, envMapIntensity: 0.5 });
const gold = () => new THREE.MeshPhysicalMaterial({ color: "#d4a546", metalness: 1, roughness: 0.3, envMapIntensity: 0.5 });
const bloodMat = () =>
  new THREE.MeshPhysicalMaterial({
    color: "#5a0008",
    roughness: 0.12,
    clearcoat: 1,
    clearcoatRoughness: 0.05,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });

const noRaycast = (o: THREE.Object3D) => o.traverse((c) => (c.raycast = () => {}));

/** Lowers and shifts a tilted instrument so its working point sits on the origin. */
function anchorLowestPoint(root: THREE.Object3D, working: THREE.Mesh) {
  root.updateMatrixWorld(true);
  const pos = working.geometry.attributes.position;
  const v = new THREE.Vector3();
  const low = new THREE.Vector3(0, Infinity, 0);
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i).applyMatrix4(working.matrixWorld);
    if (v.y < low.y) low.copy(v);
  }
  root.position.sub(low);
}

/* ------------------------------------------------------------------ */
/* Scalpel: Bard-Parker No. 3 handle + No. 10 blade                    */
/* ------------------------------------------------------------------ */

function scalpel(): Instrument {
  const g = new THREE.Group() as Instrument;
  const body = new THREE.Group();

  // Handle in the u/v plane: u along the axis (0 = blade fitting, negative = towards the end).
  const handleShape = new THREE.Shape();
  handleShape.moveTo(0, 0.0019);
  handleShape.lineTo(-0.012, 0.0019);
  handleShape.quadraticCurveTo(-0.02, 0.0024, -0.03, 0.0047);
  handleShape.lineTo(-0.118, 0.0048);
  handleShape.quadraticCurveTo(-0.1255, 0.0048, -0.1255, 0);
  handleShape.quadraticCurveTo(-0.1255, -0.0048, -0.118, -0.0048);
  handleShape.lineTo(-0.03, -0.0047);
  handleShape.quadraticCurveTo(-0.02, -0.0024, -0.012, -0.0019);
  handleShape.lineTo(0, -0.0019);
  handleShape.lineTo(0, 0.0019);
  const handleGeo = new THREE.ExtrudeGeometry(handleShape, {
    depth: 0.0022,
    bevelEnabled: true,
    bevelThickness: 0.0004,
    bevelSize: 0.0004,
    bevelSegments: 3,
    curveSegments: 16,
  });
  handleGeo.translate(0, 0, -0.0011);
  const handle = new THREE.Mesh(handleGeo, steelBrushed());
  body.add(handle);

  // Knurled grip: fine transverse ridges on both faces.
  const ridgeGeo = new THREE.BoxGeometry(0.0007, 0.0078, 0.00035);
  const ridgeMat = steelSatin();
  for (let u = -0.098; u < -0.052; u += 0.0021) {
    for (const z of [0.00165, -0.00165]) {
      const r = new THREE.Mesh(ridgeGeo, ridgeMat);
      r.position.set(u, 0, z);
      body.add(r);
    }
  }
  // Engraved centre groove along the fitting
  const groove = new THREE.Mesh(new THREE.BoxGeometry(0.011, 0.0008, 0.0029), steelSatin());
  groove.position.set(-0.0065, 0, 0);
  body.add(groove);

  // No. 10 blade: straight spine, large curved belly, ground cutting edge.
  const bladeShape = new THREE.Shape();
  bladeShape.moveTo(-0.0125, 0.0029);
  bladeShape.lineTo(0.025, 0.0036);
  bladeShape.quadraticCurveTo(0.036, 0.0033, 0.0415, -0.0012);
  bladeShape.quadraticCurveTo(0.031, -0.0082, 0.012, -0.0061);
  bladeShape.quadraticCurveTo(0.005, -0.0052, 0.002, -0.0042);
  bladeShape.lineTo(-0.0125, -0.0029);
  bladeShape.lineTo(-0.0125, 0.0029);
  // fitting slot
  const slot = new THREE.Path();
  slot.moveTo(-0.0095, 0.0009);
  slot.lineTo(0.004, 0.0009);
  slot.quadraticCurveTo(0.0052, 0, 0.004, -0.0009);
  slot.lineTo(-0.0095, -0.0009);
  slot.lineTo(-0.0095, 0.0009);
  bladeShape.holes.push(slot);
  const bladeGeo = new THREE.ExtrudeGeometry(bladeShape, {
    depth: 0.00012,
    bevelEnabled: true,
    bevelThickness: 0.00016,
    bevelSize: 0.0005,
    bevelSegments: 2,
    curveSegments: 24,
  });
  bladeGeo.translate(0, 0, -0.00006 + 0.0015);
  const blade = new THREE.Mesh(bladeGeo, steelPolished());
  body.add(blade);

  // Blood smear on the belly near the tip, faded in after cutting.
  const smearShape = new THREE.Shape();
  smearShape.moveTo(0.018, -0.0071);
  smearShape.quadraticCurveTo(0.031, -0.0082, 0.0412, -0.0013);
  smearShape.quadraticCurveTo(0.033, -0.002, 0.026, -0.0038);
  smearShape.quadraticCurveTo(0.021, -0.0048, 0.018, -0.0071);
  const smearGeo = new THREE.ShapeGeometry(smearShape, 12);
  const smear = bloodMat();
  smear.side = THREE.DoubleSide;
  for (const z of [0.0015 + 0.00025, 0.0015 - 0.00025]) {
    const m = new THREE.Mesh(smearGeo, smear);
    m.position.z = z;
    body.add(m);
  }

  // Blade sits on the side of the fitting; centre the assembly on the blade plane.
  body.position.z = -0.0015;

  const tilt = new THREE.Group();
  tilt.add(body);
  tilt.rotation.z = -0.62; // ~35° to the skin, handle back and up
  g.add(tilt);
  anchorLowestPoint(tilt, blade);

  g.userData.kind = "scalpel";
  g.userData.setBlood = (t) => (smear.opacity = THREE.MathUtils.clamp(t, 0, 1) * 0.9);
  noRaycast(g);
  return g;
}

/* ------------------------------------------------------------------ */
/* Tissue forceps (DeBakey style)                                      */
/* ------------------------------------------------------------------ */

function forceps(): Instrument {
  const g = new THREE.Group() as Instrument;
  const body = new THREE.Group();
  const len = 0.16;
  const armShape = new THREE.Shape();
  armShape.moveTo(0, 0.0011);
  armShape.lineTo(-0.03, 0.0026);
  armShape.lineTo(-0.1, 0.0048);
  armShape.lineTo(-len, 0.0046);
  armShape.lineTo(-len, -0.0046);
  armShape.lineTo(-0.1, -0.0048);
  armShape.lineTo(-0.03, -0.0026);
  armShape.lineTo(0, -0.0011);
  const armGeo = new THREE.ExtrudeGeometry(armShape, {
    depth: 0.0011,
    bevelEnabled: true,
    bevelThickness: 0.0002,
    bevelSize: 0.0002,
    bevelSegments: 2,
  });
  const arms: THREE.Group[] = [];
  const ridgeGeo = new THREE.BoxGeometry(0.0006, 0.0085, 0.0003);
  for (const s of [1, -1]) {
    const pivot = new THREE.Group();
    pivot.position.x = -len;
    const arm = new THREE.Mesh(armGeo, steelBrushed());
    arm.position.set(len, 0, s > 0 ? 0 : -0.0011);
    pivot.add(arm);
    for (let u = -0.115; u < -0.07; u += 0.0022) {
      const r = new THREE.Mesh(ridgeGeo, steelSatin());
      r.position.set(len + u, 0, s > 0 ? 0.0013 : -0.0024);
      pivot.add(r);
    }
    // atraumatic serrated tip
    const tip = new THREE.Mesh(new THREE.BoxGeometry(0.007, 0.0019, 0.0004), steelSatin());
    tip.position.set(len - 0.0035, 0, s > 0 ? -0.00015 : -0.00095);
    pivot.add(tip);
    body.add(pivot);
    arms.push(pivot);
  }
  const joint = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.0092, 0.0034), steelBrushed());
  joint.position.set(-len + 0.003, 0, -0.0005);
  body.add(joint);

  const tilt = new THREE.Group();
  tilt.add(body);
  tilt.rotation.z = -0.75;
  g.add(tilt);
  const setClosed = (t: number) => {
    const a = (1 - t) * 0.06;
    arms[0].rotation.y = -a;
    arms[1].rotation.y = a;
  };
  setClosed(0);
  anchorLowestPoint(tilt, arms[0].children[0] as THREE.Mesh);
  g.userData.kind = "forceps";
  g.userData.setClosed = setClosed;
  noRaycast(g);
  return g;
}

/* ------------------------------------------------------------------ */
/* Ring-handled instruments: Kelly clamp, Babcock, Mayo-Hegar holder    */
/* ------------------------------------------------------------------ */

function ringInstrument(kind: "clamp" | "babcock" | "needle"): Instrument {
  const g = new THREE.Group() as Instrument;
  const body = new THREE.Group();
  const total = kind === "babcock" ? 0.19 : kind === "needle" ? 0.16 : 0.14;
  const jaw = kind === "babcock" ? 0.022 : kind === "needle" ? 0.016 : 0.03;
  const halves: THREE.Group[] = [];

  for (const s of [1, -1]) {
    const half = new THREE.Group();
    half.position.x = -jaw; // pivot (box lock)
    const mat = steelBrushed();

    // shank: from pivot back to the ring, crossing to the other side
    const shankCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(-0.03, 0, -s * 0.0025),
      new THREE.Vector3(-(total - jaw) + 0.026, 0, -s * 0.009),
      new THREE.Vector3(-(total - jaw) + 0.013, 0, -s * 0.0105),
    ]);
    half.add(new THREE.Mesh(new THREE.TubeGeometry(shankCurve, 40, 0.0019, 10), mat));

    // finger ring
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.0092, 0.0019, 12, 40), mat);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(-(total - jaw) + 0.004, 0, -s * 0.0125);
    half.add(ring);

    // ratchet teeth
    for (let i = 0; i < 3; i++) {
      const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.0014, 0.0024, 0.0022), steelSatin());
      tooth.position.set(-(total - jaw) + 0.03 + i * 0.0022, 0, -s * 0.0068);
      half.add(tooth);
    }

    // jaw: from pivot forward to the tip (origin)
    if (kind === "babcock") {
      const shaft = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(jaw * 0.6, 0, s * 0.0016),
        new THREE.Vector3(jaw - 0.004, 0, s * 0.0028),
      ]);
      half.add(new THREE.Mesh(new THREE.TubeGeometry(shaft, 20, 0.0013, 8), mat));
      // fenestrated rounded-triangular grasping loop
      const loop = new THREE.CatmullRomCurve3(
        [
          new THREE.Vector3(jaw - 0.004, 0, s * 0.0028),
          new THREE.Vector3(jaw - 0.002, 0.0035, s * 0.0016),
          new THREE.Vector3(jaw, 0.003, s * 0.0003),
          new THREE.Vector3(jaw, -0.003, s * 0.0003),
          new THREE.Vector3(jaw - 0.002, -0.0035, s * 0.0016),
        ],
        true,
      );
      half.add(new THREE.Mesh(new THREE.TubeGeometry(loop, 40, 0.0007, 8, true), mat));
    } else {
      const jawCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 0, s * 0.0002),
        new THREE.Vector3(jaw * 0.55, kind === "clamp" ? 0.0012 : 0, s * 0.0006),
        new THREE.Vector3(jaw, kind === "clamp" ? 0.0045 : 0, s * 0.0007),
      ]);
      const jawTube = new THREE.TubeGeometry(jawCurve, 24, kind === "needle" ? 0.0019 : 0.0012, 8);
      half.add(new THREE.Mesh(jawTube, mat));
      if (kind === "needle") {
        const insert = new THREE.Mesh(new THREE.BoxGeometry(jaw * 0.6, 0.0022, 0.0006), gold());
        insert.position.set(jaw * 0.68, 0, s * 0.0001);
        half.add(insert);
      } else {
        // transverse serrations
        for (let i = 1; i < 12; i++) {
          const p = jawCurve.getPoint(i / 12);
          const serr = new THREE.Mesh(new THREE.BoxGeometry(0.0005, 0.0022, 0.0004), steelSatin());
          serr.position.copy(p);
          half.add(serr);
        }
      }
    }
    body.add(half);
    halves.push(half);
  }
  const lock = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.0048, 0.0052), steelBrushed());
  lock.position.set(-jaw, 0, 0);
  body.add(lock);
  const screw = new THREE.Mesh(new THREE.CylinderGeometry(0.0016, 0.0016, 0.0056, 16), steelSatin());
  screw.rotation.x = Math.PI / 2;
  screw.position.set(-jaw, 0, 0);
  body.add(screw);

  let needle: THREE.Group | null = null;
  if (kind === "needle") {
    needle = new THREE.Group();
    // 3/8 circle curved needle + braided suture trailing away
    const arc = new THREE.Mesh(
      new THREE.TorusGeometry(0.0085, 0.00035, 8, 48, Math.PI * 0.75),
      steelPolished(),
    );
    arc.rotation.set(Math.PI / 2, 0, -Math.PI * 0.35);
    needle.add(arc);
    const thread = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.006, 0, 0.006),
      new THREE.Vector3(-0.02, 0.01, 0.02),
      new THREE.Vector3(-0.05, 0.004, 0.035),
      new THREE.Vector3(-0.09, -0.01, 0.03),
    ]);
    needle.add(
      new THREE.Mesh(
        new THREE.TubeGeometry(thread, 60, 0.0003, 6),
        new THREE.MeshPhysicalMaterial({ color: "#2a3f8f", roughness: 0.5 }),
      ),
    );
    needle.position.set(0.002, -0.004, 0);
    body.add(needle);
  }

  const tilt = new THREE.Group();
  tilt.add(body);
  tilt.rotation.z = kind === "needle" ? -0.6 : -0.95;
  g.add(tilt);
  const setClosed = (t: number) => {
    const a = (1 - t) * (kind === "babcock" ? 0.12 : 0.1);
    halves[0].rotation.y = -a;
    halves[1].rotation.y = a;
  };
  setClosed(kind === "needle" ? 1 : 0.2);
  anchorLowestPoint(tilt, halves[0].children[halves[0].children.length - 1] as THREE.Mesh);
  g.userData.kind = kind;
  g.userData.setClosed = setClosed;
  noRaycast(g);
  return g;
}

/* ------------------------------------------------------------------ */
/* Langenbeck retractor                                                */
/* ------------------------------------------------------------------ */

function retractor(): Instrument {
  const g = new THREE.Group() as Instrument;
  const mat = steelBrushed();
  const width = 0.012;
  // Origin = wound edge on the skin. The blade hooks over the edge, runs down
  // the wound wall (-Y) and ends in a lip turned outwards (-X) under the tissue;
  // the shank and handle lead outwards and up.
  const path = new THREE.Path();
  path.moveTo(-0.007, -0.036);
  path.quadraticCurveTo(0.0005, -0.036, 0.0005, -0.029);
  path.lineTo(0.0005, -0.004);
  path.quadraticCurveTo(0.0005, 0.0015, -0.005, 0.0025);
  path.lineTo(-0.055, 0.026);
  const curve = new THREE.CatmullRomCurve3(path.getSpacedPoints(90).map((p) => new THREE.Vector3(p.x, p.y, 0)));
  // flat bar cross-section: thin in the bending plane, wide across (Z)
  const bar = new THREE.Shape();
  bar.moveTo(-0.0007, -width / 2);
  bar.lineTo(0.0007, -width / 2);
  bar.lineTo(0.0007, width / 2);
  bar.lineTo(-0.0007, width / 2);
  g.add(new THREE.Mesh(new THREE.ExtrudeGeometry(bar, { steps: 140, bevelEnabled: false, extrudePath: curve }), mat));

  // ergonomic handle with grip rings, continuing the shank direction
  const profile = [
    [0.0, 0],
    [0.0042, 0.002],
    [0.005, 0.03],
    [0.0046, 0.06],
    [0.0054, 0.085],
    [0.0034, 0.095],
    [0.0, 0.096],
  ].map(([r, y]) => new THREE.Vector2(r, y));
  const dir = new THREE.Vector3(-0.05, 0.0235, 0).normalize();
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
  const handle = new THREE.Mesh(new THREE.LatheGeometry(profile, 24), mat);
  handle.quaternion.copy(q);
  handle.position.set(-0.054, 0.0255, 0);
  g.add(handle);
  const ringGeo = new THREE.TorusGeometry(0.0051, 0.0006, 6, 20);
  const ringQ = q.clone().multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0)));
  for (let i = 0; i < 9; i++) {
    const ring = new THREE.Mesh(ringGeo, steelSatin());
    ring.quaternion.copy(ringQ);
    ring.position.copy(handle.position).addScaledVector(dir, 0.035 + i * 0.004);
    g.add(ring);
  }
  g.userData.kind = "retractor";
  noRaycast(g);
  return g;
}

export function createInstrument(kind: InstrumentKind): Instrument {
  switch (kind) {
    case "scalpel":
      return scalpel();
    case "forceps":
      return forceps();
    case "retractor":
      return retractor();
    default:
      return ringInstrument(kind);
  }
}

/* ------------------------------------------------------------------ */
/* Placement                                                           */
/* ------------------------------------------------------------------ */

const _t = new THREE.Vector3();
const _b = new THREE.Vector3();
const _m = new THREE.Matrix4();

/** Orients an instrument frame: +Y along the normal, +X along the travel direction. */
export function orientInstrument(obj: THREE.Object3D, point: THREE.Vector3, normal: THREE.Vector3, travel: THREE.Vector3) {
  _t.copy(travel).addScaledVector(normal, -travel.dot(normal));
  if (_t.lengthSq() < 1e-8) _t.set(1, 0, 0).addScaledVector(normal, -normal.x);
  _t.normalize();
  _b.crossVectors(_t, normal).normalize();
  _m.makeBasis(_t, normal, _b);
  obj.quaternion.setFromRotationMatrix(_m);
  obj.position.copy(point);
}
