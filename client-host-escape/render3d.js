// ============================================================
// Escape the Fox — GLTF Model Renderer
// ============================================================

const MODEL_MANIFEST = [
  { name: 'knight',    url: 'assets/models/Knight.glb' },
  { name: 'barbarian', url: 'assets/models/Barbarian.glb' },
  { name: 'mage',      url: 'assets/models/Mage.glb' },
  { name: 'rogue',     url: 'assets/models/Rogue.glb' },
  { name: 'skeleton',  url: 'assets/models/Skeleton.glb' },
];
const PLAYER_MODELS = ['knight', 'barbarian', 'mage', 'rogue'];

const PATH_N = 20, PATH_L = 3, PATH_W = 5;

const Render3D = (() => {
  let scene, camera, renderer, sun;
  let ready = false, modelsLoaded = false;
  let clock = 0;

  // Assets
  const gltfCache = {};
  const playerGroups = {};
  const playerMixers = {};
  const obstacleMeshes = [];
  const pathSegs = [];
  const trees = [];
  const clouds = [];
  let foxGroup, foxMixer;
  let poofs = [];
  let foxTrailPos = [];

  // Interpolation
  let tWD = 0, rWD = 0, tFox = -5, rFox = -5;
  const tPY = {}, rPY = {};

  // Camera
  let camMode = 'follow', camTimer = 0, elimTarget = null;
  let orbitAngle = 0, shakeI = 0;
  let baseFOV = 55, targetFOV = 55;

  // ---- MODEL LOADING ----

  async function loadModels(onProgress) {
    const loader = new THREE.GLTFLoader();
    let loaded = 0;
    for (const item of MODEL_MANIFEST) {
      const gltf = await new Promise((resolve, reject) => {
        loader.load(item.url, resolve, undefined, reject);
      });
      gltfCache[item.name] = gltf;
      loaded++;
      if (onProgress) onProgress(loaded, MODEL_MANIFEST.length);
    }
    modelsLoaded = true;
  }

  function cloneModel(name) {
    const gltf = gltfCache[name];
    if (!gltf) return null;
    const model = THREE.SkeletonUtils.clone(gltf.scene);

    // Deep clone materials (so we can tint per-player)
    model.traverse(child => {
      if (child.isMesh) {
        child.material = child.material.clone();
        child.castShadow = true;
        child.receiveShadow = false;
        // Upgrade to PBR if not already
        if (child.material.isMeshStandardMaterial) {
          child.material.roughness = Math.max(child.material.roughness, 0.4);
          child.material.metalness = Math.min(child.material.metalness, 0.15);
        }
      }
    });
    return model;
  }

  function normalizeModel(model, targetHeight) {
    // Update matrices first
    model.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    // Model bounds: size.x, size.y, size.z
    if (size.y > 0.001) {
      const s = targetHeight / size.y;
      model.scale.setScalar(s);
    }
    // Recompute after scale and store ground offset
    model.updateMatrixWorld(true);
    const box2 = new THREE.Box3().setFromObject(model);
    model.userData.groundY = -box2.min.y;
    model.position.y = model.userData.groundY;
    // Normalized model ready
  }

  function tintModel(model, color) {
    const tint = new THREE.Color(color);
    model.traverse(child => {
      if (child.isMesh && child.material) {
        // Blend original color with player color
        const orig = child.material.color.clone();
        child.material.color.copy(orig).lerp(tint, 0.2);
      }
    });
  }

  function createMixer(model, name) {
    const gltf = gltfCache[name];
    if (!gltf || !gltf.animations || gltf.animations.length === 0) return null;
    const mixer = new THREE.AnimationMixer(model);
    // Try to find a walk/run animation, fall back to first clip
    let clip = gltf.animations.find(a => /walk|run|gallop/i.test(a.name));
    if (!clip) clip = gltf.animations[0];
    const action = mixer.clipAction(clip);
    action.play();
    return mixer;
  }

  // ---- ENVIRONMENT ----

  function createSkyDome() {
    const geo = new THREE.SphereGeometry(75, 24, 16);
    const colors = new Float32Array(geo.attributes.position.count * 3);
    const zenith = new THREE.Color(0x4A90C4);
    const horizon = new THREE.Color(0xB8D4E8);
    const nadir = new THREE.Color(0xE0D8CC);
    for (let i = 0; i < geo.attributes.position.count; i++) {
      const y = geo.attributes.position.getY(i) / 75;
      const c = y >= 0
        ? new THREE.Color().lerpColors(horizon, zenith, Math.pow(y, 0.6))
        : new THREE.Color().lerpColors(horizon, nadir, Math.pow(-y, 0.4));
      colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
    }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    return new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false }));
  }

  function createCloud() {
    const g = new THREE.Group();
    const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7, fog: false });
    const r = () => 0.6 + Math.random() * 0.8;
    g.add(new THREE.Mesh(new THREE.SphereGeometry(r(), 8, 5), mat));
    const m1 = new THREE.Mesh(new THREE.SphereGeometry(r(), 7, 4), mat);
    m1.position.set(1.5, -0.1, 0.3); g.add(m1);
    const m2 = new THREE.Mesh(new THREE.SphereGeometry(r(), 7, 4), mat);
    m2.position.set(-1.2, 0.1, -0.2); g.add(m2);
    return g;
  }

  function createTree(variant) {
    const g = new THREE.Group();
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x7A5A1A, roughness: 0.85 });
    const leafColors = [0x3A8C3A, 0x4A9C4A, 0x2E7A30, 0x5AAA5A];
    const lc = leafColors[(variant || 0) % leafColors.length];
    const leafMat = new THREE.MeshStandardMaterial({ color: lc, roughness: 0.65 });

    if ((variant || 0) % 3 === 0) {
      // Round tree
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 0.6, 6), trunkMat);
      trunk.position.y = 0.3; trunk.castShadow = true; g.add(trunk);
      const crown = new THREE.Mesh(new THREE.SphereGeometry(0.32, 10, 8), leafMat);
      crown.position.y = 0.75; crown.castShadow = true; g.add(crown);
      const crown2 = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6), leafMat.clone());
      crown2.material.color.setHex(leafColors[((variant||0)+1)%leafColors.length]);
      crown2.position.set(0.1, 0.95, 0.05); crown2.castShadow = true; g.add(crown2);
    } else if ((variant || 0) % 3 === 1) {
      // Cone/pine tree
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.07, 0.4, 6), trunkMat);
      trunk.position.y = 0.2; trunk.castShadow = true; g.add(trunk);
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.6, 8), leafMat);
      cone.position.y = 0.7; cone.castShadow = true; g.add(cone);
      const cone2 = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.35, 7), leafMat);
      cone2.position.y = 1.0; cone2.castShadow = true; g.add(cone2);
    } else {
      // Bush/short
      const bush = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), leafMat);
      bush.position.y = 0.22; bush.castShadow = true; g.add(bush);
      const bush2 = new THREE.Mesh(new THREE.SphereGeometry(0.16, 6, 5), leafMat);
      bush2.position.set(0.12, 0.3, 0.08); bush2.castShadow = true; g.add(bush2);
    }
    return g;
  }

  function createRock() {
    const g = new THREE.Group();
    const matA = new THREE.MeshStandardMaterial({ color: 0x7A6B5D, roughness: 0.85 });
    const matB = new THREE.MeshStandardMaterial({ color: 0x6B5D50, roughness: 0.9 });
    const main = new THREE.Mesh(new THREE.BoxGeometry(PATH_W - 0.3, 0.55, 0.5), matA);
    main.position.y = 0.28; main.castShadow = true; g.add(main);
    const d1 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.22, 0), matB);
    d1.position.set(-1.4, 0.22, 0.12); d1.rotation.set(0.2, 0.4, 0.1); d1.castShadow = true; g.add(d1);
    const d2 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.18, 0), matB);
    d2.position.set(1.2, 0.18, -0.08); d2.rotation.set(0.1, -0.3, 0.15); d2.castShadow = true; g.add(d2);
    return g;
  }

  // ---- PARTICLES ----

  function spawnPoof(x, y, z, color) {
    for (let i = 0; i < 16; i++) {
      const geo = new THREE.SphereGeometry(0.03 + Math.random() * 0.05, 4, 3);
      const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1 });
      const m = new THREE.Mesh(geo, mat);
      m.position.set(x, y + 0.3, z);
      m.userData = { vx: (Math.random() - 0.5) * 0.18, vy: 0.06 + Math.random() * 0.14, vz: (Math.random() - 0.5) * 0.18, life: 1 };
      scene.add(m); poofs.push(m);
    }
    shakeI = 0.25;
  }

  function updatePoofs(dt) {
    for (let i = poofs.length - 1; i >= 0; i--) {
      const m = poofs[i], d = m.userData;
      d.life -= dt * 1.8;
      m.position.x += d.vx; m.position.y += d.vy; m.position.z += d.vz;
      d.vy -= 0.006;
      m.material.opacity = Math.max(0, d.life);
      m.scale.setScalar(0.5 + d.life * 0.5);
      if (d.life <= 0) { scene.remove(m); m.geometry.dispose(); m.material.dispose(); poofs.splice(i, 1); }
    }
  }

  // ---- FOX TRAIL ----
  let foxGhosts = [];
  function initFoxTrail() {
    for (let i = 0; i < 4; i++) {
      const geo = new THREE.SphereGeometry(0.15 - i * 0.02, 6, 4);
      const mat = new THREE.MeshBasicMaterial({ color: 0xE05020, transparent: true, opacity: 0.15 - i * 0.03 });
      const m = new THREE.Mesh(geo, mat);
      m.visible = false; scene.add(m); foxGhosts.push(m);
    }
  }
  function updateFoxTrail() {
    if (!foxGroup) return;
    foxTrailPos.unshift(foxGroup.position.clone());
    while (foxTrailPos.length > 20) foxTrailPos.pop();
    for (let i = 0; i < foxGhosts.length; i++) {
      const idx = (i + 1) * 4;
      if (foxTrailPos[idx]) { foxGhosts[i].position.copy(foxTrailPos[idx]); foxGhosts[i].position.y = 0.3; foxGhosts[i].visible = true; }
    }
  }

  // ---- CAMERA ----

  function updateCamera(dt) {
    camera.fov += (targetFOV - camera.fov) * 0.05;
    camera.updateProjectionMatrix();
    let sx = 0, sy = 0;
    if (shakeI > 0.005) { sx = (Math.random() - 0.5) * shakeI; sy = (Math.random() - 0.5) * shakeI; shakeI *= 0.88; } else shakeI = 0;

    if (camMode === 'follow') {
      camera.position.lerp(new THREE.Vector3(sx, 4.5 + sy, rWD - 6), 0.08);
      camera.lookAt(0, 0, rWD + 8);
    } else if (camMode === 'elim') {
      camTimer -= dt;
      if (elimTarget && playerGroups[elimTarget]) {
        const pg = playerGroups[elimTarget];
        camera.position.lerp(new THREE.Vector3(pg.position.x + 1.5 + sx, 1.8 + sy, pg.position.z - 2), 0.12);
        camera.lookAt(pg.position.x, 0.5, pg.position.z);
      }
      if (camTimer <= 0) { camMode = 'follow'; elimTarget = null; }
    } else if (camMode === 'orbit') {
      orbitAngle += dt * 0.7;
      camera.position.set(Math.sin(orbitAngle) * 4.5 + sx, 2.5 + sy, rWD + Math.cos(orbitAngle) * 4.5);
      camera.lookAt(0, 0.5, rWD);
    }
  }

  // ---- INIT ----

  function init() {
    if (ready) return;
    ready = true;
    const ct = document.getElementById('canvas-container');

    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0xA8C8E0, 0.016);

    camera = new THREE.PerspectiveCamera(baseFOV, ct.clientWidth / ct.clientHeight, 0.1, 150);
    renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(ct.clientWidth, ct.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    ct.appendChild(renderer.domElement);

    // Lighting
    scene.add(new THREE.HemisphereLight(0xCCDDEE, 0x556633, 0.8));
    sun = new THREE.DirectionalLight(0xFFF0D8, 0.85);
    sun.position.set(5, 12, 8);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.near = 0.5; sun.shadow.camera.far = 30;
    sun.shadow.camera.left = -8; sun.shadow.camera.right = 8;
    sun.shadow.camera.top = 8; sun.shadow.camera.bottom = -8;
    sun.shadow.bias = -0.001; sun.shadow.radius = 3;
    scene.add(sun); scene.add(sun.target);
    // Back-fill light to illuminate models from behind camera
    const backFill = new THREE.DirectionalLight(0xDDEEFF, 0.4);
    backFill.position.set(0, 4, -5);
    scene.add(backFill);

    // Sky
    scene.add(createSkyDome());

    // Clouds
    for (let i = 0; i < 8; i++) {
      const c = createCloud();
      c.position.set((Math.random() - 0.5) * 40, -3 - Math.random() * 8, Math.random() * 60);
      c.scale.setScalar(0.8 + Math.random() * 1.5);
      c.userData.speed = 0.002 + Math.random() * 0.005;
      scene.add(c); clouds.push(c);
    }

    // Path
    const pathGeo = new THREE.BoxGeometry(PATH_W, 0.4, PATH_L);
    const pColors = [0x5DAA5F, 0x4E9A50];
    for (let i = 0; i < PATH_N; i++) {
      const seg = new THREE.Mesh(pathGeo, new THREE.MeshStandardMaterial({ color: pColors[i % 2], roughness: 0.7, metalness: 0.02 }));
      seg.position.set(0, -0.2, i * PATH_L); seg.receiveShadow = true;
      scene.add(seg); pathSegs.push(seg);
    }
    // Raised edges — like stone curbs
    const edgeGeo = new THREE.BoxGeometry(0.12, 0.12, PATH_N * PATH_L);
    const edgeMat = new THREE.MeshStandardMaterial({ color: 0x6B8A4F, roughness: 0.8 });
    const el = new THREE.Mesh(edgeGeo, edgeMat); el.position.set(-PATH_W / 2 + 0.06, 0.06, PATH_N * PATH_L / 2); el.receiveShadow = true; scene.add(el);
    const er = new THREE.Mesh(edgeGeo, edgeMat.clone()); er.position.set(PATH_W / 2 - 0.06, 0.06, PATH_N * PATH_L / 2); er.receiveShadow = true; scene.add(er);
    // Center line
    const centerLine = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 0.01, PATH_N * PATH_L),
      new THREE.MeshStandardMaterial({ color: 0x7BC67E, roughness: 0.5 })
    );
    centerLine.position.set(0, 0.01, PATH_N * PATH_L / 2); scene.add(centerLine);

    // Trees
    for (let i = 0; i < 14; i++) {
      const tl = createTree(i); tl.position.set(-PATH_W / 2 - 0.4 - Math.random() * 0.6, 0, i * PATH_L * 2 + Math.random() * 3);
      tl.scale.setScalar(0.5 + Math.random() * 0.5); scene.add(tl); trees.push(tl);
      const tr = createTree(i + 7); tr.position.set(PATH_W / 2 + 0.4 + Math.random() * 0.6, 0, i * PATH_L * 2 + Math.random() * 3);
      tr.scale.setScalar(0.5 + Math.random() * 0.5); scene.add(tr); trees.push(tr);
    }

    initFoxTrail();

    // Resize
    window.addEventListener('resize', () => {
      camera.aspect = ct.clientWidth / ct.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(ct.clientWidth, ct.clientHeight);
    });

    // Render loop
    let last = performance.now();
    (function animate(now) {
      requestAnimationFrame(animate);
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now; clock += dt;

      rWD += (tWD - rWD) * 0.15;
      rFox += (tFox - rFox) * 0.15;
      targetFOV = baseFOV + Math.max(0, tWD / 300) * 8;

      // Wrap path
      for (const seg of pathSegs) { while (seg.position.z < rWD - 10) seg.position.z += PATH_N * PATH_L; }
      for (const t of trees) { while (t.position.z < rWD - 10) t.position.z += 12 * PATH_L * 2; }
      for (const c of clouds) { c.position.x += c.userData.speed; if (c.position.x > 25) c.position.x = -25; }

      // Update animation mixers
      for (const [id, mixer] of Object.entries(playerMixers)) {
        if (playerGroups[id] && playerGroups[id].visible) mixer.update(dt);
      }
      if (foxMixer && foxGroup && foxGroup.visible) foxMixer.update(dt);

      // Player positions
      for (const [id, g] of Object.entries(playerGroups)) {
        if (!g.visible) continue;
        if (rPY[id] === undefined) rPY[id] = 0;
        rPY[id] += ((tPY[id] || 0) - rPY[id]) * 0.22;
        const py = rPY[id];
        g.position.y = (g.userData.groundY || 0) + py * 3;
        g.position.z = rWD;

        // Jump squash/stretch
        if (py > 0.08) {
          g.scale.set(0.85, 1.2, 0.85);
        } else if (py > 0.01 && py < 0.04 && (tPY[id] || 0) < 0.01) {
          g.scale.set(1.15, 0.75, 1.15); // landing squash
        } else {
          g.scale.lerp(new THREE.Vector3(1, 1, 1), 0.12);
        }
      }

      // Fox
      if (foxGroup) {
        foxGroup.position.z = rFox;
        foxGroup.position.y = Math.sin(clock * 10) * 0.02;
      }

      // Sun follows
      sun.position.set(rWD + 5, 12, rWD + 8);
      sun.target.position.set(0, 0, rWD);

      updateFoxTrail();
      updatePoofs(dt);
      updateCamera(dt);
      renderer.render(scene, camera);
    })(performance.now());
  }

  // ---- PUBLIC API ----

  function updateState(state) {
    if (!ready) init();
    if (!modelsLoaded) return;

    tWD = state.worldDist;
    tFox = state.foxDist;

    // Fox
    if (!foxGroup && gltfCache.skeleton) {
      foxGroup = cloneModel('skeleton');
      normalizeModel(foxGroup, 0.8);
      foxGroup.position.set(0, 0, -5);
      foxGroup.rotation.y = 0; // face +Z (chasing players)
      scene.add(foxGroup);
      foxMixer = createMixer(foxGroup, 'fox');
    }

    const ids = Object.keys(state.players);
    ids.forEach((id, i) => {
      const pd = state.players[id];
      if (!playerGroups[id] && pd.connected && modelsLoaded) {
        const modelName = PLAYER_MODELS[i % PLAYER_MODELS.length];
        const model = cloneModel(modelName);
        if (model) {
          normalizeModel(model, 0.4); // Kaykit characters on the path
          model.rotation.y = 0; // face +Z (running forward)
          // Color ring under feet instead of tinting model
          const ring = new THREE.Mesh(
            new THREE.RingGeometry(0.15, 0.28, 16),
            new THREE.MeshBasicMaterial({ color: pd.color, transparent: true, opacity: 0.7, side: THREE.DoubleSide })
          );
          ring.rotation.x = -Math.PI / 2;
          ring.position.y = 0.01;
          model.add(ring);
          const x = (i - (ids.length - 1) / 2) * 1.6;
          model.position.x = x;
          model.userData.x = x;
          model.userData.wasAlive = true;
          model.userData.modelName = modelName;
          scene.add(model);
          playerGroups[id] = model;
          playerMixers[id] = createMixer(model, modelName);
        }
      }
      const g = playerGroups[id];
      if (!g) return;

      if (g.userData.wasAlive && !pd.alive && pd.connected) {
        g.userData.wasAlive = false;
        spawnPoof(g.position.x, g.position.y, rWD, pd.color);
        if (camMode !== 'orbit') { camMode = 'elim'; camTimer = 1.5; elimTarget = id; }
      }
      g.visible = pd.alive && pd.connected;
      tPY[id] = pd.y || 0;

      // Pause animation when jumping
      if (playerMixers[id]) {
        playerMixers[id].timeScale = (pd.y || 0) > 0.03 ? 0 : 1;
      }
    });

    // Obstacles
    while (obstacleMeshes.length < state.obstacles.length) {
      const r = createRock(); scene.add(r); obstacleMeshes.push(r);
    }
    for (let i = 0; i < obstacleMeshes.length; i++) {
      if (i < state.obstacles.length) {
        const obs = state.obstacles[i];
        obstacleMeshes[i].visible = (obs.type || 'rock') !== 'gap';
        obstacleMeshes[i].position.set(0, 0, obs.z);
      } else { obstacleMeshes[i].visible = false; }
    }

    // Gap path hiding
    for (const seg of pathSegs) {
      let nearGap = false;
      for (const obs of (state.obstacles || [])) {
        if ((obs.type || 'rock') === 'gap' && Math.abs(seg.position.z - obs.z) < PATH_L * 0.6) { nearGap = true; break; }
      }
      seg.visible = !nearGap;
    }
  }

  function triggerWin(id) { camMode = 'orbit'; orbitAngle = 0; }

  return { init, loadModels, updateState, triggerWin };
})();

// Render3D is a global IIFE — accessible from main.js
