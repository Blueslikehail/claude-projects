// 3D viewer: draws mannequins from solved joints (src/core/figure) with three.js.
// three.js is loaded as a global (UMD build) by index.html; without it the viewer shows
// a short message instead.
import { figureAt } from "./core/index.js";

const THREE = globalThis.THREE;
const Y = THREE ? new THREE.Vector3(0, 1, 0) : null;
const VIEWS = { front: 0, side: Math.PI / 2, back: Math.PI, corner: Math.PI / 4 };

function cssColor(el, name, fallback) {
  const v = getComputedStyle(el).getPropertyValue(name).trim();
  return v || fallback;
}

/** One mannequin made of tapered limbs and joint spheres. */
function makeFigure(material) {
  const group = new THREE.Group();
  const parts = {};
  const sphere = (r) => new THREE.SphereGeometry(r, 20, 14);
  const limb = (r1, r2) => {
    const g = new THREE.CylinderGeometry(r2, r1, 1, 16, 1);
    return g;
  };
  const add = (name, geometry) => {
    const m = new THREE.Mesh(geometry, material);
    m.castShadow = true;
    group.add(m);
    parts[name] = m;
    return m;
  };
  for (const s of ["L", "R"]) {
    add(`thigh${s}`, limb(0.075, 0.055));
    add(`shin${s}`, limb(0.05, 0.038));
    add(`knee${s}`, sphere(0.052));
    add(`foot${s}`, new THREE.BoxGeometry(0.085, 0.055, 1));
    add(`upper${s}`, limb(0.046, 0.038));
    add(`fore${s}`, limb(0.037, 0.03));
    add(`elbow${s}`, sphere(0.038));
    add(`shoulderBall${s}`, sphere(0.05));
    add(`hand${s}`, new THREE.BoxGeometry(0.075, 0.022, 1));
  }
  add("pelvis", sphere(1)).scale.set(0.16, 0.1, 0.11);
  add("waist", limb(0.12, 0.13));
  add("chest", sphere(1));
  add("neck", limb(0.045, 0.04));
  add("head", sphere(0.1));
  add("nose", new THREE.ConeGeometry(0.022, 0.05, 10));
  add("shoulders", limb(0.05, 0.05));
  return { group, parts };
}

const tmpA = THREE ? new THREE.Vector3() : null;
const tmpB = THREE ? new THREE.Vector3() : null;
const tmpM = THREE ? new THREE.Matrix4() : null;

function between(mesh, a, b, thicknessScale = 1) {
  tmpA.set(...a);
  tmpB.set(...b);
  const len = tmpA.distanceTo(tmpB);
  mesh.position.copy(tmpA).add(tmpB).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(Y, tmpB.sub(tmpA).normalize());
  mesh.scale.set(thicknessScale, len, thicknessScale);
}

function frame(mesh, R, U, F) {
  // Our R is the figure's right; three.js wants a right-handed basis (left, up, forward).
  tmpM.makeBasis(new THREE.Vector3(-R[0], -R[1], -R[2]), new THREE.Vector3(...U), new THREE.Vector3(...F));
  mesh.quaternion.setFromRotationMatrix(tmpM);
}

function poseFigure({ parts }, J) {
  for (const s of ["L", "R"]) {
    between(parts[`thigh${s}`], J[`hip${s}`], J[`knee${s}`]);
    between(parts[`shin${s}`], J[`knee${s}`], J[`ankle${s}`]);
    parts[`knee${s}`].position.set(...J[`knee${s}`]);
    between(parts[`upper${s}`], J[`shoulder${s}`], J[`elbow${s}`]);
    between(parts[`fore${s}`], J[`elbow${s}`], J[`wrist${s}`]);
    parts[`elbow${s}`].position.set(...J[`elbow${s}`]);
    parts[`shoulderBall${s}`].position.set(...J[`shoulder${s}`]);

    // Foot: a box from heel to toe, lying along the foot.
    const foot = parts[`foot${s}`];
    tmpA.set(...J[`heel${s}`]);
    tmpB.set(...J[`toe${s}`]);
    const len = tmpA.distanceTo(tmpB);
    foot.position.copy(tmpA).add(tmpB).multiplyScalar(0.5);
    foot.position.y += 0.02;
    const fdir = tmpB.clone().sub(tmpA).normalize();
    foot.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), fdir);
    foot.scale.set(1, 1, len);

    // Hand: flat box along the fingers; a fist is short and thick; a hook points
    // the gathered fingertips along the palm direction.
    const h = J[`hand${s}`];
    const hand = parts[`hand${s}`];
    const wrist = new THREE.Vector3(...J[`wrist${s}`]);
    let dir = new THREE.Vector3(...h.fingers);
    let normal = new THREE.Vector3(...h.palm);
    let length = 0.17;
    let thick = 1;
    if (h.shape === "fist") {
      length = 0.09;
      thick = 3.2;
    } else if (h.shape === "hook") {
      dir = normal.clone();
      normal = new THREE.Vector3(...h.fingers).negate();
      length = 0.11;
      thick = 1.6;
    }
    const side = new THREE.Vector3().crossVectors(normal, dir).normalize();
    tmpM.makeBasis(side, normal, dir);
    hand.quaternion.setFromRotationMatrix(tmpM);
    hand.position.copy(wrist).addScaledVector(dir, length / 2);
    hand.scale.set(1, thick, length);
  }
  parts.pelvis.position.set(...J.pelvis);
  frame(parts.pelvis, J.chestFrame.R, [0, 1, 0], [J.chestFrame.F[0], 0, J.chestFrame.F[2]]);
  between(parts.waist, J.pelvis, J.chest);
  parts.chest.position.set(...J.chest).addScaledVector(new THREE.Vector3(...J.chestFrame.U), 0.08);
  frame(parts.chest, J.chestFrame.R, J.chestFrame.U, J.chestFrame.F);
  parts.chest.scale.set(0.19, 0.17, 0.115);
  between(parts.shoulders, J.shoulderL, J.shoulderR);
  between(parts.neck, J.neck, J.head.map((v, i) => v - J.headFrame.U[i] * 0.08));
  parts.head.position.set(...J.head);
  frame(parts.head, J.headFrame.R, J.headFrame.U, J.headFrame.F);
  parts.head.scale.set(0.92, 1.1, 1);
  const F = J.headFrame.F;
  parts.nose.position.set(J.head[0] + F[0] * 0.1, J.head[1] - 0.01, J.head[2] + F[2] * 0.1);
  parts.nose.quaternion.setFromUnitVectors(Y, new THREE.Vector3(...F));
}

/**
 * Create a viewer in `container`. Call setScene() with figures, then it plays.
 * onFrame({ time, duration, index, figures }) runs each frame.
 */
export function createViewer(container, { onFrame, view = "front" } = {}) {
  if (!THREE) {
    container.innerHTML = `<p class="viewer-missing">The 3D figure needs an internet connection to load. Everything else works offline.</p>`;
    return null;
  }
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.05, 50);
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputEncoding = THREE.sRGBEncoding;
  container.appendChild(renderer.domElement);

  const hemi = new THREE.HemisphereLight(0xffffff, 0x667788, 0.7);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffffff, 0.95);
  sun.position.set(2.5, 5, 3.5);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -2.5, right: 2.5, top: 2.5, bottom: -2.5, near: 1, far: 12 });
  scene.add(sun, sun.target);

  const groundMat = new THREE.MeshStandardMaterial({ roughness: 1 });
  const groundMesh = new THREE.Mesh(new THREE.CircleGeometry(3, 72), groundMat);
  groundMesh.rotation.x = -Math.PI / 2;
  groundMesh.receiveShadow = true;
  scene.add(groundMesh);
  const ringMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.55 });
  for (const r of [0.5, 1, 1.5, 2, 2.5]) {
    const ring = new THREE.Mesh(new THREE.RingGeometry(r - 0.004, r + 0.004, 96), ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.001;
    scene.add(ring);
  }
  // Weight discs under each foot of the first figure: bigger = more weight.
  const weightMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.35, depthWrite: false });
  const weightDiscs = ["L", "R"].map(() => {
    const d = new THREE.Mesh(new THREE.CircleGeometry(0.16, 40), weightMat);
    d.rotation.x = -Math.PI / 2;
    d.position.y = 0.002;
    scene.add(d);
    return d;
  });

  const materials = {
    jade: new THREE.MeshStandardMaterial({ roughness: 0.62, metalness: 0.02 }),
    seal: new THREE.MeshStandardMaterial({ roughness: 0.62, metalness: 0.02 }),
  };

  // CSS colours are sRGB; the renderer works in linear space and encodes to sRGB on output.
  const linear = (name, fallback) => new THREE.Color(cssColor(container, name, fallback)).convertSRGBToLinear();
  function applyTheme() {
    scene.background = linear("--viewer-bg", "#e1e8e3");
    groundMat.color.copy(linear("--viewer-ground", "#c8d3cc"));
    ringMat.color.copy(linear("--line", "#ccd6cf"));
    weightMat.color.copy(linear("--jade", "#2b6a5b"));
    materials.jade.color.copy(linear("--figure", "#7e968b"));
    materials.seal.color.copy(linear("--seal", "#b23a2a"));
  }
  applyTheme();
  const mq = matchMedia("(prefers-color-scheme: dark)");
  mq.addEventListener?.("change", applyTheme);
  const themeObserver = new MutationObserver(applyTheme);
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

  // Camera orbit
  const cam = { theta: VIEWS[view] ?? 0, phi: 0.16, radius: 3.5, target: new THREE.Vector3(0, 0.88, 0) };
  let figures = [];
  let time = 0;
  let duration = 1;
  let speed = 1;
  let playing = true;
  let last = performance.now();
  let raf = 0;
  let visible = true;

  function placeCamera() {
    const { theta, phi, radius, target } = cam;
    camera.position.set(
      target.x + radius * Math.sin(theta) * Math.cos(phi),
      target.y + radius * Math.sin(phi),
      target.z + radius * Math.cos(theta) * Math.cos(phi),
    );
    camera.lookAt(target);
  }

  function resize() {
    const w = container.clientWidth;
    const h = container.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  const ro = new ResizeObserver(resize);
  ro.observe(container);

  // Drag to orbit, pinch or wheel to zoom.
  const pointers = new Map();
  let pinch = 0;
  const el = renderer.domElement;
  el.style.touchAction = "none";
  el.addEventListener("pointerdown", (e) => {
    el.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  });
  el.addEventListener("pointermove", (e) => {
    const p = pointers.get(e.pointerId);
    if (!p) return;
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      const d0 = Math.hypot(a.x - b.x, a.y - b.y);
      p.x = e.clientX;
      p.y = e.clientY;
      const [c, d] = [...pointers.values()];
      const d1 = Math.hypot(c.x - d.x, c.y - d.y);
      if (pinch && d0) cam.radius = Math.min(9, Math.max(2, cam.radius * (d0 / d1)));
      pinch = d1;
    } else {
      const mirror = container.classList.contains("mirrored") ? -1 : 1;
      cam.theta -= ((e.clientX - p.x) / el.clientWidth) * Math.PI * 1.4 * mirror;
      cam.phi = Math.min(1.2, Math.max(-0.05, cam.phi + ((e.clientY - p.y) / el.clientHeight) * 1.2));
      p.x = e.clientX;
      p.y = e.clientY;
    }
  });
  const up = (e) => {
    pointers.delete(e.pointerId);
    pinch = 0;
  };
  el.addEventListener("pointerup", up);
  el.addEventListener("pointercancel", up);
  el.addEventListener("wheel", (e) => {
    e.preventDefault();
    cam.radius = Math.min(9, Math.max(2, cam.radius * (1 + Math.sign(e.deltaY) * 0.08)));
  }, { passive: false });

  const io = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) loop();
  });
  io.observe(container);

  function render() {
    const solved = figures.map((f) => ({ ...f, ...figureAt(f.seq, Math.min(time, f.seq.duration), f.placement) }));
    let cx = 0, cz = 0;
    for (const f of solved) {
      poseFigure(f.mesh, f.joints);
      cx += f.joints.pelvis[0];
      cz += f.joints.pelvis[2];
    }
    if (solved.length) {
      const first = solved[0];
      const w = first.pose.weightLeft;
      [["L", w], ["R", 1 - w]].forEach(([s, share], i) => {
        const a = first.joints[`ankle${s}`];
        weightDiscs[i].position.set(a[0], 0.002, a[2]);
        const k = 0.25 + share * 0.9;
        weightDiscs[i].scale.set(k, k, k);
      });
      // Follow the figures smoothly as they travel.
      cam.target.x += (cx / solved.length - cam.target.x) * 0.08;
      cam.target.z += (cz / solved.length - cam.target.z) * 0.08;
      sun.target.position.copy(cam.target);
      sun.position.set(cam.target.x + 2.5, 5, cam.target.z + 3.5);
    }
    placeCamera();
    renderer.render(scene, camera);
    onFrame?.({ time, duration, figures: solved, playing });
  }

  function loop() {
    cancelAnimationFrame(raf);
    const tick = (now) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      if (playing && figures.length) {
        time += dt * speed;
        if (time > duration) time = 0;
      }
      render();
      if (visible && !document.hidden) raf = requestAnimationFrame(tick);
    };
    last = performance.now();
    raf = requestAnimationFrame(tick);
  }
  document.addEventListener("visibilitychange", () => !document.hidden && visible && loop());

  return {
    /** figures: [{ seq, placement?, color: "jade" | "seal" }] */
    setScene(list) {
      for (const f of figures) scene.remove(f.mesh.group);
      figures = list.map((f) => {
        const mesh = makeFigure(materials[f.color ?? "jade"]);
        scene.add(mesh.group);
        return { ...f, mesh };
      });
      duration = Math.max(...figures.map((f) => f.seq.duration));
      time = 0;
      const first = figures[0] && figureAt(figures[0].seq, 0, figures[0].placement).joints.pelvis;
      if (first) cam.target.set(first[0], 0.88, first[2]);
      resize();
      loop();
    },
    play() { playing = true; },
    pause() { playing = false; },
    get playing() { return playing; },
    setSpeed(s) { speed = s; },
    seek(t) { time = Math.max(0, Math.min(duration, t)); render(); },
    get duration() { return duration; },
    setView(name) { cam.theta = VIEWS[name] ?? cam.theta; },
    setMirror(on) { container.classList.toggle("mirrored", on); },
    dispose() {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      themeObserver.disconnect();
      mq.removeEventListener?.("change", applyTheme);
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
