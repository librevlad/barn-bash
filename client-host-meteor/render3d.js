// ============================================================
// Meteor Shower — GLTF Model Renderer (fire/lava theme)
// ============================================================

const MODEL_MANIFEST = [
  { name: 'knight',    url: 'assets/models/Knight.glb' },
  { name: 'barbarian', url: 'assets/models/Barbarian.glb' },
  { name: 'mage',      url: 'assets/models/Mage.glb' },
  { name: 'rogue',     url: 'assets/models/Rogue.glb' },
];

const Render3D = (() => {
  let scene, camera, renderer;
  const gltfCache = {};
  const playerGroups = {};
  const playerMixers = {};
  let arenaMesh, arenaEdge;
  let ready = false, modelsLoaded = false, clock = 0, shakeI = 0;
  let targetPlatR = 4.5, renderPlatR = 4.5;
  const meteorShadows = [];
  const impactFX = [];

  // --- Model loading ---
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
    model.traverse(child => {
      if (child.isMesh) { child.material = child.material.clone(); child.castShadow = true; }
    });
    return model;
  }

  function normalizeModel(model, h) {
    model.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    if (size.y > 0.001) model.scale.setScalar(h / size.y);
    model.updateMatrixWorld(true);
    const box2 = new THREE.Box3().setFromObject(model);
    model.userData.groundY = -box2.min.y;
    model.position.y = model.userData.groundY;
  }

  function tintModel(model, color) {
    const tint = new THREE.Color(color);
    model.traverse(child => {
      if (child.isMesh && child.material) {
        child.material.color.copy(child.material.color.clone()).lerp(tint, 0.15);
      }
    });
  }

  function createMixer(model, name) {
    const gltf = gltfCache[name];
    if (!gltf || !gltf.animations || !gltf.animations.length) return null;
    const mixer = new THREE.AnimationMixer(model);
    const clip = gltf.animations.find(a => /walk|run|idle/i.test(a.name)) || gltf.animations[0];
    mixer.clipAction(clip).play();
    return mixer;
  }

  // --- Meteor shadows ---
  function createMeteorShadow() {
    const m = new THREE.Mesh(
      new THREE.CircleGeometry(1, 24),
      new THREE.MeshBasicMaterial({ color: 0xFF2200, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false })
    );
    m.rotation.x = -Math.PI / 2; m.position.y = 0.02; m.visible = false;
    scene.add(m);
    return m;
  }

  // --- Impact FX ---
  function spawnImpact(x, z) {
    shakeI = 0.3;
    const colors = [0xFF4400, 0xFF8800, 0xFFCC00, 0xFF2200];
    for (let i = 0; i < 12; i++) {
      const geo = new THREE.SphereGeometry(0.05 + Math.random() * 0.08, 4, 3);
      const mat = new THREE.MeshBasicMaterial({ color: colors[i % 4], transparent: true, opacity: 1 });
      const m = new THREE.Mesh(geo, mat);
      m.position.set(x, 0.1, z);
      m.userData = { vx: (Math.random()-0.5)*0.25, vy: 0.08+Math.random()*0.15, vz: (Math.random()-0.5)*0.25, life: 1 };
      scene.add(m); impactFX.push(m);
    }
  }

  function updateFX(dt) {
    for (let i = impactFX.length - 1; i >= 0; i--) {
      const m = impactFX[i], d = m.userData;
      d.life -= dt * 2; m.position.x += d.vx; m.position.y += d.vy; m.position.z += d.vz;
      d.vy -= 0.008; m.material.opacity = Math.max(0, d.life); m.scale.setScalar(0.5 + d.life * 0.5);
      if (d.life <= 0) { scene.remove(m); m.geometry.dispose(); m.material.dispose(); impactFX.splice(i, 1); }
    }
  }

  // --- Init ---
  function init() {
    if (ready) return;
    ready = true;
    const ct = document.getElementById('canvas-container');

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x120808);
    scene.fog = new THREE.FogExp2(0x120808, 0.015);

    camera = new THREE.PerspectiveCamera(50, ct.clientWidth / ct.clientHeight, 0.1, 100);
    camera.position.set(0, 10, -7);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(ct.clientWidth, ct.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.3;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    ct.appendChild(renderer.domElement);
    renderer.domElement.style.filter = 'contrast(1.1) saturate(1.2)';

    // Lighting — warm fire mood
    scene.add(new THREE.HemisphereLight(0x553322, 0x110505, 0.5));
    const sun = new THREE.DirectionalLight(0xFFAA66, 0.8);
    sun.position.set(3, 10, -5);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.near = 1; sun.shadow.camera.far = 25;
    sun.shadow.camera.left = -8; sun.shadow.camera.right = 8;
    sun.shadow.camera.top = 8; sun.shadow.camera.bottom = -8;
    sun.shadow.radius = 3;
    scene.add(sun);
    scene.add(new THREE.PointLight(0xFF4400, 0.4, 20).translateY(-2));

    // Arena — cracked stone platform
    const PR = 4.5;
    arenaMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(PR, PR, 0.3, 48),
      new THREE.MeshStandardMaterial({ color: 0x302420, roughness: 0.9, metalness: 0.05 })
    );
    arenaMesh.position.y = -0.15; arenaMesh.receiveShadow = true;
    scene.add(arenaMesh);
    // Lava cracks — concentric rings
    const crackMat = new THREE.MeshBasicMaterial({ color: 0xFF3300, transparent: true, opacity: 0.12, side: THREE.DoubleSide });
    for (let r = 0.3; r < 1.0; r += 0.35) {
      const crack = new THREE.Mesh(new THREE.RingGeometry(PR * r, PR * r + 0.02, 32), crackMat);
      crack.rotation.x = -Math.PI / 2; crack.position.y = 0.01; scene.add(crack);
    }

    arenaEdge = new THREE.Mesh(
      new THREE.TorusGeometry(PR, 0.06, 8, 48),
      new THREE.MeshBasicMaterial({ color: 0xFF4400, transparent: true, opacity: 0.4 })
    );
    arenaEdge.rotation.x = Math.PI / 2; arenaEdge.position.y = 0.02;
    scene.add(arenaEdge);

    // Embers
    const eGeo = new THREE.BufferGeometry();
    const ePos = new Float32Array(150 * 3);
    for (let i = 0; i < 150; i++) {
      ePos[i*3] = (Math.random()-0.5)*30;
      ePos[i*3+1] = -1-Math.random()*15;
      ePos[i*3+2] = (Math.random()-0.5)*30;
    }
    eGeo.setAttribute('position', new THREE.BufferAttribute(ePos, 3));
    scene.add(new THREE.Points(eGeo, new THREE.PointsMaterial({ color: 0xFF6622, size: 0.1, transparent: true, opacity: 0.5 })));

    // Meteor shadow pool
    for (let i = 0; i < 10; i++) meteorShadows.push(createMeteorShadow());

    window.addEventListener('resize', () => {
      camera.aspect = ct.clientWidth / ct.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(ct.clientWidth, ct.clientHeight);
    });

    let last = performance.now();
    (function animate(now) {
      requestAnimationFrame(animate);
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now; clock += dt;

      renderPlatR += (targetPlatR - renderPlatR) * 0.05;
      const s = renderPlatR / 4.5;
      arenaMesh.scale.set(s, 1, s);
      arenaEdge.scale.set(s, s, 1);
      arenaEdge.material.opacity = 0.4 + Math.sin(clock * 4) * 0.15;

      // Player animations
      for (const [id, g] of Object.entries(playerGroups)) {
        if (!g.visible) continue;
        // Smooth position
        g.position.x += (g.userData.tx - g.position.x) * 0.15;
        g.position.z += (g.userData.tz - g.position.z) * 0.15;
        g.position.y = (g.userData.groundY || 0) + Math.abs(Math.sin(clock * 10)) * 0.02;
        if (g.userData.dodging) g.scale.set(0.8, 1.3, 0.8);
        else g.scale.lerp(new THREE.Vector3(1, 1, 1), 0.1);
      }
      for (const [id, mixer] of Object.entries(playerMixers)) {
        if (playerGroups[id] && playerGroups[id].visible) mixer.update(dt);
      }

      const camA = clock * 0.12;
      const cx = Math.sin(camA) * 1 + (shakeI > 0.005 ? (Math.random()-0.5)*shakeI : 0);
      const cz = -7 + Math.cos(camA) * 1 + (shakeI > 0.005 ? (Math.random()-0.5)*shakeI : 0);
      camera.position.set(cx, 10, cz);
      camera.lookAt(0, 0, 0);
      if (shakeI > 0.005) shakeI *= 0.85; else shakeI = 0;

      updateFX(dt);
      renderer.render(scene, camera);
    })(performance.now());
  }

  // --- Public ---
  function updateState(state) {
    if (!ready) init();
    if (!modelsLoaded) return;
    targetPlatR = state.platR;

    const ids = Object.keys(state.players);
    ids.forEach((id, i) => {
      const pd = state.players[id];
      if (!playerGroups[id] && pd.connected) {
        const modelName = MODEL_MANIFEST[i % MODEL_MANIFEST.length].name;
        const model = cloneModel(modelName);
        if (model) {
          normalizeModel(model, 0.4);
          tintModel(model, pd.color);
          const ring = new THREE.Mesh(
            new THREE.RingGeometry(0.15, 0.28, 16),
            new THREE.MeshBasicMaterial({ color: pd.color, transparent: true, opacity: 0.7, side: THREE.DoubleSide })
          );
          ring.rotation.x = -Math.PI / 2; ring.position.y = 0.01;
          model.add(ring);
          model.userData.wasAlive = true; model.userData.dodging = false;
          model.userData.tx = pd.x; model.userData.tz = pd.z;
          scene.add(model);
          playerGroups[id] = model;
          playerMixers[id] = createMixer(model, modelName);
        }
      }
      const g = playerGroups[id];
      if (!g) return;
      g.userData.tx = pd.x; g.userData.tz = pd.z; g.userData.dodging = pd.dodging;
      if (g.userData.wasAlive && !pd.alive && pd.connected) {
        g.userData.wasAlive = false;
        spawnImpact(g.position.x, g.position.z);
      }
      g.visible = pd.alive && pd.connected;
    });

    // Meteor shadows
    for (let i = 0; i < meteorShadows.length; i++) {
      if (i < state.meteors.length && state.subPhase === 'warning') {
        const m = state.meteors[i];
        meteorShadows[i].visible = true;
        meteorShadows[i].position.set(m.x, 0.02, m.z);
        meteorShadows[i].scale.setScalar(m.r * 0.8);
        meteorShadows[i].material.opacity = 0.3;
      } else {
        meteorShadows[i].visible = false;
      }
    }
  }

  function onWarning(meteors) {
    for (let i = 0; i < meteorShadows.length && i < meteors.length; i++) {
      meteorShadows[i].visible = true;
      meteorShadows[i].position.set(meteors[i].x, 0.02, meteors[i].z);
      meteorShadows[i].scale.setScalar(0.2);
      meteorShadows[i].material.opacity = 0.1;
    }
  }

  function onImpact(meteors) {
    for (const m of meteors) spawnImpact(m.x, m.z);
    for (const ms of meteorShadows) ms.visible = false;
  }

  function triggerWin() {}

  return { init, loadModels, updateState, onWarning, onImpact, triggerWin };
})();
