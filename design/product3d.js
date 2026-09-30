import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';

function waitAnime(ms) {
  return new Promise(res => {
    const t0 = Date.now();
    (function poll() {
      if (window.anime) return res(window.anime);
      if (Date.now() - t0 > ms) return res(null);
      setTimeout(poll, 100);
    })();
  });
}

// 依三視圖量測：機身 寬:高:深 ≈ 1 : 2.45 : 1.8（直立瘦深塔）
const W = 1.3, H = 3.2, D = 2.4;

function rrectShape(w, h, r) {
  const s = new THREE.Shape(); const x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

function perfTexture(w, h, bg, hole, r, gap) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d');
  x.fillStyle = bg; x.fillRect(0, 0, w, h);
  x.fillStyle = hole;
  let row = 0;
  for (let yy = gap; yy < h - gap / 2; yy += gap, row++) {
    for (let xx = gap + (row % 2 ? gap / 2 : 0); xx < w - gap / 2; xx += gap) {
      x.beginPath(); x.arc(xx, yy, r, 0, 6.2832); x.fill();
    }
  }
  const t = new THREE.CanvasTexture(c); t.anisotropy = 4; return t;
}

function slotTexture(w, h, bg, slot, cols, rows) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d');
  x.fillStyle = bg; x.fillRect(0, 0, w, h);
  x.fillStyle = slot;
  const sw = w / cols * 0.62, sh = h / rows * 0.55, rr = Math.min(sw, sh) / 2;
  for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
    const cx = w / cols * (i + 0.5) - sw / 2, cy = h / rows * (j + 0.5) - sh / 2;
    x.beginPath();
    x.moveTo(cx + rr, cy); x.arcTo(cx + sw, cy, cx + sw, cy + sh, rr); x.arcTo(cx + sw, cy + sh, cx, cy + sh, rr);
    x.arcTo(cx, cy + sh, cx, cy, rr); x.arcTo(cx, cy, cx + sw, cy, rr); x.fill();
  }
  const t = new THREE.CanvasTexture(c); t.anisotropy = 4; return t;
}

function fanTexture(sz) {
  const c = document.createElement('canvas'); c.width = sz; c.height = sz;
  const x = c.getContext('2d'), m = sz / 2;
  x.fillStyle = '#2a2927'; x.fillRect(0, 0, sz, sz);
  x.fillStyle = '#0b0a09'; x.beginPath(); x.arc(m, m, m * 0.92, 0, 6.2832); x.fill();
  x.strokeStyle = '#232220'; x.lineWidth = sz * 0.045;
  x.beginPath(); x.arc(m, m, m * 0.62, 0, 6.2832); x.stroke();
  x.beginPath(); x.arc(m, m, m * 0.3, 0, 6.2832); x.stroke();
  for (let i = 0; i < 4; i++) {
    x.save(); x.translate(m, m); x.rotate(i * Math.PI / 2 + 0.5);
    x.fillStyle = '#1c1b1a'; x.fillRect(-sz * 0.03, 0, sz * 0.06, m * 0.88); x.restore();
  }
  x.fillStyle = '#3a3835'; x.beginPath(); x.arc(m, m, m * 0.16, 0, 6.2832); x.fill();
  const t = new THREE.CanvasTexture(c); t.anisotropy = 4; return t;
}

export async function mount(host) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setClearColor(0x000000, 0);
  renderer.domElement.style.display = 'block';
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene();
  envScene.background = new THREE.Color(0x3a3a3a);
  const lightPlane = (w, h, x, y, z, ry, rx, i2) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color().setScalar(i2) }));
    m.position.set(x, y, z); m.rotation.y = ry; m.rotation.x = rx; envScene.add(m);
  };
  lightPlane(12, 12, 0, 10, 0, 0, Math.PI / 2, 5);
  lightPlane(8, 6, -8, 3, 0, Math.PI / 2, 0, 3.2);
  lightPlane(8, 6, 8, 2, -2, -Math.PI / 2, 0, 1.6);
  lightPlane(10, 5, 0, 2, -9, 0, 0, 0.9);
  scene.environment = pmrem.fromScene(envScene, 0.04).texture;

  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  camera.position.set(5.0, 1.9, 6.7);

  const key = new THREE.DirectionalLight(0xffffff, 1.4);
  key.position.set(3, 6, 4);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.left = -6; key.shadow.camera.right = 6;
  key.shadow.camera.top = 6; key.shadow.camera.bottom = -6;
  key.shadow.radius = 5;
  scene.add(key);
  scene.add(new THREE.HemisphereLight(0xfaf9f5, 0x8a8781, 0.5));

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(50, 50), new THREE.ShadowMaterial({ opacity: 0.2 }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -1.66; ground.receiveShadow = true;
  scene.add(ground);

  const group = new THREE.Group();
  group.rotation.y = -0.62;
  scene.add(group);

  const M = {
    frontBlack: new THREE.MeshStandardMaterial({ color: 0x121110, metalness: 0.5, roughness: 0.34 }),
    gloss: new THREE.MeshStandardMaterial({ color: 0x060606, metalness: 0.3, roughness: 0.12 }),
    body: new THREE.MeshStandardMaterial({ color: 0x312f2d, metalness: 0.42, roughness: 0.55 }),
    steel: new THREE.MeshStandardMaterial({ color: 0xa9aaa8, metalness: 0.85, roughness: 0.33 }),
    inner: new THREE.MeshStandardMaterial({ color: 0x1a1918, metalness: 0.4, roughness: 0.55 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x0a0a09, metalness: 0.3, roughness: 0.5 }),
    silver: new THREE.MeshStandardMaterial({ color: 0xbdbbb7, metalness: 0.9, roughness: 0.25 }),
    gold: new THREE.MeshStandardMaterial({ color: 0xeca42b, metalness: 0.75, roughness: 0.3 }),
    copper: new THREE.MeshStandardMaterial({ color: 0xb87333, metalness: 0.9, roughness: 0.32 }),
    blue: new THREE.MeshStandardMaterial({ color: 0x2f6fd6, metalness: 0.3, roughness: 0.45 }),
    green: new THREE.MeshStandardMaterial({ color: 0x2e6b3c, metalness: 0.25, roughness: 0.55 }),
    pcb: new THREE.MeshStandardMaterial({ color: 0x161514, metalness: 0.3, roughness: 0.62 }),
    wireY: new THREE.MeshStandardMaterial({ color: 0xd9a92c, metalness: 0.1, roughness: 0.6 }),
    wireR: new THREE.MeshStandardMaterial({ color: 0xc23b22, metalness: 0.1, roughness: 0.6 })
  };
  const B = (parent, w, h, d, mat, x, y, z) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true;
    parent.add(m); return m;
  };
  const C = (parent, r, len, mat, x, y, z, axis) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 40), mat);
    if (axis === 'x') m.rotation.z = Math.PI / 2;
    if (axis === 'z') m.rotation.x = Math.PI / 2;
    m.position.set(x, y, z); m.castShadow = true;
    parent.add(m); return m;
  };
  const RR = (parent, w, h, r, depth, mat, x, y, z) => {
    const m = new THREE.Mesh(new THREE.ExtrudeGeometry(rrectShape(w, h, r), { depth, bevelEnabled: false }), mat);
    m.position.set(x, y, z); m.castShadow = true; parent.add(m); return m;
  };
  const P = (parent, w, h, tex, x, y, z, ry) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tex, metalness: 0.42, roughness: 0.55 }));
    m.position.set(x, y, z); if (ry) m.rotation.y = ry;
    parent.add(m); return m;
  };
  const TUBE = (parent, p1, pc, p2, r, mat) => {
    const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(...p1), new THREE.Vector3(...pc), new THREE.Vector3(...p2)), 24, r, 10), mat);
    m.castShadow = true; parent.add(m); return m;
  };
  const G = () => { const g = new THREE.Group(); group.add(g); return g; };

  // ── 靜態核心：鍍鋅鋼內框（拆機照的銀色骨架）＋主機板 ──
  const FD = D * 0.88, FH = H * 0.94;
  const frameG = new THREE.Group(); group.add(frameG);
  B(frameG, 0.9, 0.08, FD, M.steel, 0, FH / 2 - 0.04, 0);
  B(frameG, 0.9, 0.08, FD, M.steel, 0, -FH / 2 + 0.04, 0);
  [[0.42, FD / 2 - 0.05], [-0.42, FD / 2 - 0.05], [0.42, -FD / 2 + 0.05], [-0.42, -FD / 2 + 0.05]].forEach(c => {
    B(frameG, 0.08, FH, 0.1, M.steel, c[0], 0, c[1]);
  });
  B(frameG, 0.03, FH - 0.14, FD - 0.08, M.steel, -0.44, 0, 0);
  B(frameG, 0.4, 0.05, 1.6, M.steel, 0, -1.35, -0.1);
  B(group, 0.05, 2.75, 1.95, M.pcb, 0.38, 0.05, -0.05);

  const defs = [];
  const EX = 120; // 邊轉邊拆：零件在旋轉途中起飛
  const flyd = (g, dx, dy, dz, at, dur) => defs.push([g.position, { x: g.position.x + dx, y: g.position.y + dy, z: g.position.z + dz }, at + EX, dur || 300, 'easeOutCubic']);
  const spin = (g, axis, val, at, dur) => { const to = {}; to[axis] = val; defs.push([g.rotation, to, at + EX, dur || 300, 'easeOutCubic']); };
  // 鋼骨架也飛走：讓主機板叢集完整露出
  flyd(frameG, -1.7, 2.0, -1.6, 370, 420);
  spin(frameG, 'y', -0.5, 370, 360);

  // ── 頂蓋：圓肩罩（照片的弧形上蓋）＋散熱孔 ──
  const topG = G();
  const cap = new THREE.Mesh(new THREE.ExtrudeGeometry(rrectShape(W, 0.34, 0.15), { depth: D * 0.96, bevelEnabled: false }), M.body);
  cap.position.set(0, H / 2 - 0.13, -D * 0.48); cap.castShadow = true; topG.add(cap);
  const topPerf = perfTexture(300, 200, '#1f1e1c', '#070706', 3.6, 12);
  P(topG, 1.1, 0.8, topPerf, 0, H / 2 + 0.042, 0.15, 0).rotation.x = -Math.PI / 2;
  flyd(topG, 0, 2.5, 0, 180, 460);

  // ── 左右側板：素面＋上下兩塊圓孔散熱區 ──
  const sidePerf = perfTexture(256, 300, '#1f1e1c', '#070706', 4.2, 13);
  const mkSide = (sx) => {
    const g = G();
    B(g, 0.045, H * 0.95, D * 0.94, M.body, sx * (W / 2 - 0.02), 0, 0);
    P(g, 0.88, 0.98, sidePerf, sx * (W / 2 + 0.004), 0.42, 0.08, sx * Math.PI / 2);
    P(g, 0.88, 0.98, sidePerf, sx * (W / 2 + 0.004), -0.72, 0.08, sx * Math.PI / 2);
    return g;
  };
  const sideR = mkSide(1), sideL = mkSide(-1);
  flyd(sideR, 3.6, 0.1, 0, 230); spin(sideR, 'y', 0.35, 230, 500);
  flyd(sideL, -3.6, 0.1, 0, 270); spin(sideL, 'y', -0.35, 270, 500);

  // ── 底板：腳墊跟著底板飛（照片的獨立底蓋）──
  const botG = G();
  B(botG, W * 0.98, 0.05, D * 0.94, M.body, 0, -H / 2 + 0.02, 0);
  [[-0.45, 0.9], [0.45, 0.9], [-0.45, -0.9], [0.45, -0.9]].forEach(f => {
    C(botG, 0.085, 0.07, M.dark, f[0], -H / 2 - 0.02, f[1]);
  });
  flyd(botG, 0, -1.8, 0, 500, 420);

  // ── 前面板：銀邊圓角黑蓋＋亮面中條＋按鈕與埠位 ──
  const frontG = G();
  RR(frontG, 1.34, H + 0.1, 0.2, 0.015, M.silver, 0, 0, D / 2 - 0.045);
  RR(frontG, 1.28, H + 0.04, 0.18, 0.08, M.frontBlack, 0, 0, D / 2 - 0.04);
  RR(frontG, 0.34, 1.16, 0.16, 0.012, M.gloss, 0, 1.02, D / 2 + 0.04);
  const fz = D / 2 + 0.056;
  C(frontG, 0.085, 0.03, M.silver, 0, 1.34, fz, 'z');
  C(frontG, 0.05, 0.025, M.silver, 0, 0.82, fz, 'z');
  B(frontG, 0.026, 0.3, 0.014, M.dark, 0, 0.28, fz);
  RR(frontG, 0.15, 0.055, 0.026, 0.01, M.dark, 0, -0.06, fz - 0.005);
  B(frontG, 0.24, 0.082, 0.014, M.dark, 0, -0.36, fz);
  B(frontG, 0.18, 0.026, 0.01, M.blue, 0, -0.35, fz + 0.008);
  B(frontG, 0.24, 0.082, 0.014, M.dark, 0, -0.68, fz);
  B(frontG, 0.18, 0.026, 0.01, M.blue, 0, -0.67, fz + 0.008);
  C(frontG, 0.05, 0.02, M.dark, 0, -1.0, fz, 'z');
  flyd(frontG, 0, 0.1, 3.3, 310, 480);

  // ── 後面板：散熱柵欄＋埠位柱＋風扇格柵＋電源座 ──
  const rearG = G();
  const rz = -D / 2 + 0.02;
  B(rearG, W * 0.97, H * 0.98, 0.05, M.body, 0, 0, rz);
  const slots = slotTexture(140, 512, '#282726', '#0a0a09', 1, 9);
  P(rearG, 0.34, 2.3, slots, -0.4, 0.35, rz - 0.03, Math.PI);
  P(rearG, 0.42, 2.3, slots, 0.38, 0.35, rz - 0.03, Math.PI);
  const pg = new THREE.Group(); pg.position.set(-0.02, 0, rz - 0.03); rearG.add(pg);
  B(pg, 0.3, 2.0, 0.01, M.inner, 0, 0.42, 0);
  B(pg, 0.2, 0.09, 0.02, M.dark, 0, 1.28, 0);
  B(pg, 0.2, 0.09, 0.02, M.dark, 0, 1.1, 0);
  B(pg, 0.22, 0.075, 0.02, M.dark, 0, 0.88, 0);
  B(pg, 0.22, 0.075, 0.02, M.dark, 0, 0.66, 0);
  RR(pg, 0.14, 0.05, 0.024, 0.02, M.dark, 0, 0.44, -0.01);
  B(pg, 0.2, 0.08, 0.02, M.dark, 0, 0.22, 0);
  B(pg, 0.16, 0.025, 0.012, M.blue, 0, 0.21, 0.006);
  B(pg, 0.22, 0.17, 0.02, M.dark, 0, -0.06, 0);
  C(pg, 0.045, 0.02, M.dark, 0, -0.32, 0, 'z');
  P(rearG, 0.6, 0.6, fanTexture(256), -0.26, -1.05, rz - 0.03, Math.PI);
  B(rearG, 0.42, 0.32, 0.05, M.dark, 0.32, -1.1, rz - 0.02);
  B(rearG, 0.3, 0.2, 0.02, M.inner, 0.32, -1.1, rz - 0.05);
  B(rearG, 0.03, 0.08, 0.02, M.silver, 0.25, -1.1, rz - 0.06);
  B(rearG, 0.03, 0.08, 0.02, M.silver, 0.32, -1.08, rz - 0.06);
  B(rearG, 0.03, 0.08, 0.02, M.silver, 0.39, -1.1, rz - 0.06);
  flyd(rearG, 0, 0.1, -3.3, 350, 480);

  // ── 散熱模組：鼓風扇＋銅導管＋鰭片（拆機照的一體模組）──
  const coolG = G();
  const blower = C(coolG, 0.44, 0.1, M.inner, 0.46, 0.62, 0.35, 'x');
  C(coolG, 0.3, 0.105, M.dark, 0.46, 0.62, 0.35, 'x');
  C(coolG, 0.09, 0.11, M.gold, 0.46, 0.62, 0.35, 'x');
  TUBE(coolG, [0.46, 0.62, -0.1], [0.5, 0.75, -0.45], [0.46, 0.55, -0.8], 0.032, M.copper);
  for (let i = 0; i < 7; i++) B(coolG, 0.09, 0.44, 0.024, M.silver, 0.44, 0.55, -0.62 - i * 0.05);
  flyd(coolG, 2.3, 0.2, 0.3, 410, 420);

  // ── RAM ×3（綠 PCB＋金手指）──
  [-0.15, -0.35, -0.55].forEach((z, i) => {
    const r = G();
    B(r, 0.045, 0.8, 0.09, M.green, 0.44, 0.28, z);
    B(r, 0.05, 0.05, 0.09, M.gold, 0.44, -0.13, z);
    flyd(r, 1.4 + i * 0.25, 0.35, 0, 480 + i * 40);
  });

  // ── M.2 SSD（綠）＋ WiFi 模組 ──
  const ssdG = G();
  B(ssdG, 0.04, 0.22, 0.72, M.green, 0.44, -0.45, 0.2);
  B(ssdG, 0.05, 0.16, 0.3, M.inner, 0.45, -0.45, 0.28);
  flyd(ssdG, 1.35, -0.2, 0.3, 580);
  const wifiG = G();
  B(wifiG, 0.03, 0.2, 0.26, M.green, 0.44, -0.85, -0.15);
  C(wifiG, 0.025, 0.035, M.gold, 0.45, -0.78, -0.08, 'x');
  C(wifiG, 0.025, 0.035, M.gold, 0.45, -0.78, -0.2, 'x');
  flyd(wifiG, 1.3, -0.5, 0, 610);

  // ── 2.5" 硬碟（銀）＋支架 ──
  const hddG = G();
  B(hddG, 0.16, 0.62, 0.45, M.silver, -0.35, -0.9, 0.55);
  B(hddG, 0.02, 0.7, 0.5, M.inner, -0.45, -0.9, 0.55);
  flyd(hddG, -1.9, -0.5, 1.1, 640, 380);

  // ── PSU：蜂巢面＋黃紅線束 ──
  const psuG = G();
  B(psuG, 0.95, 0.66, 0.85, M.inner, 0, -1.12, -0.5);
  P(psuG, 0.8, 0.5, perfTexture(200, 130, '#171615', '#060605', 4.5, 11), 0, -1.12, -0.06, 0);
  TUBE(psuG, [0.3, -0.9, -0.1], [0.55, -0.6, 0.25], [0.35, -0.35, 0.5], 0.028, M.wireY);
  TUBE(psuG, [0.2, -0.88, -0.05], [0.4, -0.55, 0.3], [0.2, -0.3, 0.5], 0.028, M.wireR);
  TUBE(psuG, [0.1, -0.9, -0.08], [0.25, -0.62, 0.28], [0.05, -0.33, 0.48], 0.028, M.wireY);
  flyd(psuG, 0.2, -0.55, 2.6, 550, 420);

  // ── 後板螺絲 ×6 ──
  [[0.52, 1.42], [-0.52, 1.42], [0.52, 0.0], [-0.52, 0.0], [0.52, -1.42], [-0.52, -1.42]].forEach((s, i) => {
    const sc2 = C(group, 0.032, 0.05, M.silver, s[0], s[1], -D / 2 - 0.01, 'z');
    defs.push([sc2.position, { x: s[0] * 3.4, y: s[1] * 1.5, z: -D / 2 - 2.6 }, 850 + i * 30, 300, 'easeOutCubic']);
  });

  defs.push([group.rotation, { y: -0.62 - Math.PI * 2 + 0.34 }, 0, 1000, 'easeInOutSine']);
  defs.push([group.position, { y: 0.3 }, 350, 800, 'easeInOutSine']);
  defs.push([camera.position, { x: 5.6, y: 2.4, z: 9.2 }, 350, 800, 'easeInOutSine']);

  const anime = await waitAnime(2500);
  let seek;
  if (anime) {
    const tl = anime.timeline({ autoplay: false });
    defs.forEach(d => tl.add({ targets: d[0], ...d[1], duration: d[3], easing: d[4] }, d[2]));
    seek = p => tl.seek(Math.max(0, Math.min(1, p)) * tl.duration);
  } else {
    const total = Math.max(...defs.map(d => d[2] + d[3]));
    const st = defs.map(d => ({ o: d[0], to: d[1], at: d[2], dur: d[3], from: null }));
    seek = p => {
      const t = Math.max(0, Math.min(1, p)) * total;
      st.forEach(s => {
        if (!s.from) { s.from = {}; for (const k in s.to) s.from[k] = s.o[k]; }
        let e = Math.max(0, Math.min(1, (t - s.at) / s.dur));
        e = 1 - Math.pow(1 - e, 3);
        for (const k in s.to) s.o[k] = s.from[k] + (s.to[k] - s.from[k]) * e;
      });
    };
  }

  let curHost = host;
  const resize = () => {
    const w = curHost.clientWidth || 600, h = curHost.clientHeight || 420;
    group.scale.setScalar(Math.max(0.6, Math.min(1, h / 560)));
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  resize();
  let ro = new ResizeObserver(resize); ro.observe(curHost);

  let disposed = false, dirty = 2;
  const markDirty = () => { dirty = 2; };
  window.__tgSpin = y => { group.rotation.y = y; markDirty(); };
  const _seek = seek;
  seek = p => { markDirty(); _seek(p); };
  window.addEventListener('resize', markDirty);
  const loop = () => {
    if (disposed) return;
    if (!renderer.domElement.isConnected) {
      const h = document.getElementById('tg-ex-canvas');
      if (h) { curHost = h; h.appendChild(renderer.domElement); ro.disconnect(); ro = new ResizeObserver(() => { resize(); markDirty(); }); ro.observe(h); resize(); markDirty(); }
    }
    if (dirty > 0) {
      dirty--;
      camera.lookAt(0, -0.22, 0);
      renderer.render(scene, camera);
    }
    requestAnimationFrame(loop);
  };
  loop();
  seek(0);

  return {
    seek,
    dispose: () => { disposed = true; ro.disconnect(); pmrem.dispose(); renderer.dispose(); if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement); }
  };
}
