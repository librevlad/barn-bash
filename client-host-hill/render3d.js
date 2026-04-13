// ============================================================
// King of the Hill — GLTF Model Renderer
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
  let targetPlatR = 5, renderPlatR = 5;
  let poofs = [];

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
      if (child.isMesh) {
        child.material = child.material.clone();
        child.castShadow = true;
      }
    });
    return model;
  }

  function normalizeModel(model, targetHeight) {
    model.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    if (size.y > 0.001) model.scale.setScalar(targetHeight / size.y);
    model.updateMatrixWorld(true);
    const box2 = new THREE.Box3().setFromObject(model);
    model.userData.groundY = -box2.min.y;
    model.position.y = model.userData.groundY;
  }

  function tintModel(model, color) {
    const tint = new THREE.Color(color);
    model.traverse(child => {
      if (child.isMesh && child.material) {
        const orig = child.material.color.clone();
        child.material.color.copy(orig).lerp(tint, 0.15);
      }
    });
  }

  function createMixer(model, name) {
    const gltf = gltfCache[name];
    if (!gltf || !gltf.animations || !gltf.animations.length) return null;
    const mixer = new THREE.AnimationMixer(model);
    let clip = gltf.animations.find(a => /walk|run|idle/i.test(a.name)) || gltf.animations[0];
    mixer.clipAction(clip).play();
    return mixer;
  }

  // --- Particles ---
  function spawnPoof(x, y, z, color) {
    for (let i = 0; i < 14; i++) {
      const geo = new THREE.SphereGeometry(0.04 + Math.random() * 0.05, 4, 3);
      const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1 });
      const m = new THREE.Mesh(geo, mat);
      m.position.set(x, y + 0.3, z);
      m.userData = { vx: (Math.random()-0.5)*0.2, vy: 0.06+Math.random()*0.12, vz: (Math.random()-0.5)*0.2, life: 1 };
      scene.add(m); poofs.push(m);
    }
    shakeI = 0.2;
  }

  function updatePoofs(dt) {
    for (let i = poofs.length - 1; i >= 0; i--) {
      const m = poofs[i], d = m.userData;
      d.life -= dt * 1.8;
      m.position.x += d.vx; m.position.y += d.vy; m.position.z += d.vz;
      d.vy -= 0.005;
      m.material.opacity = Math.max(0, d.life);
      m.scale.setScalar(0.5 + d.life * 0.5);
      if (d.life <= 0) { scene.remove(m); m.geometry.dispose(); m.material.dispose(); poofs.splice(i, 1); }
    }
  }

  // --- Init ---
  function init() {
    if (ready) return;
    ready = true;
    const ct = document.getElementById('canvas-container');

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0818);
    scene.fog = new THREE.FogExp2(0x0a0818, 0.012);

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
    renderer.domElement.style.filter = 'contrast(1.1) saturate(1.15)';

    // Lighting
    scene.add(new THREE.HemisphereLight(0x4444AA, 0x221133, 0.55));
    const sun = new THREE.DirectionalLight(0xDDCCFF, 0.9);
    sun.position.set(3, 10, -5);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.near = 1; sun.shadow.camera.far = 25;
    sun.shadow.camera.left = -8; sun.shadow.camera.right = 8;
    sun.shadow.camera.top = 8; sun.shadow.camera.bottom = -8;
    sun.shadow.radius = 3;
    scene.add(sun);
    scene.add(new THREE.PointLight(0x8855FF, 0.6, 20).translateY(3));

    // Arena
    const PLAT_R = 5;
    arenaMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(PLAT_R, PLAT_R, 0.3, 48),
      new THREE.MeshStandardMaterial({ color: 0x3A3070, roughness: 0.6, metalness: 0.15 })
    );
    arenaMesh.position.y = -0.15;
    arenaMesh.receiveShadow = true;
    scene.add(arenaMesh);

    // Concentric rings — multiple for depth
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x4030A0, side: THREE.DoubleSide, transparent: true, opacity: 0.2 });
    for (let r = 0.3; r < 1.0; r += 0.3) {
      const ring = new THREE.Mesh(new THREE.RingGeometry(PLAT_R * r, PLAT_R * r + 0.03, 48), ringMat);
      ring.rotation.x = -Math.PI / 2; ring.position.y = 0.01;
      scene.add(ring);
    }
    // Center marker
    const centerGlow = new THREE.Mesh(
      new THREE.CircleGeometry(0.3, 16),
      new THREE.MeshBasicMaterial({ color: 0x6644CC, transparent: true, opacity: 0.25, side: THREE.DoubleSide })
    );
    centerGlow.rotation.x = -Math.PI / 2; centerGlow.position.y = 0.015;
    scene.add(centerGlow);

    // Edge glow
    arenaEdge = new THREE.Mesh(
      new THREE.TorusGeometry(PLAT_R, 0.06, 8, 48),
      new THREE.MeshBasicMaterial({ color: 0x7755DD, transparent: true, opacity: 0.5 })
    );
    arenaEdge.rotation.x = Math.PI / 2; arenaEdge.position.y = 0.02;
    scene.add(arenaEdge);

    // Stars
    const starGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(200 * 3);
    for (let i = 0; i < 200; i++) {
      starPos[i*3] = (Math.random()-0.5)*50;
      starPos[i*3+1] = -2-Math.random()*20;
      starPos[i*3+2] = (Math.random()-0.5)*50;
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xCCBBFF, size: 0.08, transparent: true, opacity: 0.6 })));

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

      // Arena shrink
      renderPlatR += (targetPlatR - renderPlatR) * 0.05;
      const s = renderPlatR / 5;
      arenaMesh.scale.set(s, 1, s);
      arenaEdge.scale.set(s, s, 1);
      if (renderPlatR < 3.5) {
        arenaEdge.material.opacity = 0.5 + Math.sin(clock * 6) * 0.3;
        arenaEdge.material.color.setHex(0xFF4444);
      } else {
        arenaEdge.material.opacity = 0.5;
        arenaEdge.material.color.setHex(0x7755DD);
      }

      // Player animation
      for (const [id, g] of Object.entries(playerGroups)) {
        if (!g.visible) continue;
        const td = g.userData;
        td.rAngle += (td.tAngle - td.rAngle) * 0.15;
        td.rRadius += (td.tRadius - td.rRadius) * 0.18;
        g.position.set(Math.cos(td.rAngle) * td.rRadius, g.userData.groundY || 0, Math.sin(td.rAngle) * td.rRadius);
        g.rotation.y = td.rAngle + Math.PI / 2;
        g.position.y += Math.abs(Math.sin(clock * 12)) * 0.02;
        if (td.dashing) { g.scale.set(0.8, 1.3, 1.2); } else { g.scale.lerp(new THREE.Vector3(1, 1, 1), 0.1); }
      }

      // Update mixers
      for (const [id, mixer] of Object.entries(playerMixers)) {
        if (playerGroups[id] && playerGroups[id].visible) mixer.update(dt);
      }

      // Camera orbit
      const camA = clock * 0.15;
      const cx = Math.sin(camA) * 1.5 + (shakeI > 0.005 ? (Math.random()-0.5)*shakeI : 0);
      const cz = -7 + Math.cos(camA) * 1.5 + (shakeI > 0.005 ? (Math.random()-0.5)*shakeI : 0);
      camera.position.set(cx, 10, cz);
      camera.lookAt(0, 0, 0);
      if (shakeI > 0.005) shakeI *= 0.88; else shakeI = 0;

      updatePoofs(dt);
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
          model.userData.tAngle = pd.angle; model.userData.rAngle = pd.angle;
          model.userData.tRadius = pd.radius; model.userData.rRadius = pd.radius;
          model.userData.wasAlive = true; model.userData.dashing = false;
          scene.add(model);
          playerGroups[id] = model;
          playerMixers[id] = createMixer(model, modelName);
        }
      }
      const g = playerGroups[id];
      if (!g) return;
      g.userData.tAngle = pd.angle;
      g.userData.tRadius = pd.radius;
      g.userData.dashing = pd.dashing;
      if (g.userData.wasAlive && !pd.alive && pd.connected) {
        g.userData.wasAlive = false;
        spawnPoof(g.position.x, 0, g.position.z, pd.color);
      }
      g.visible = pd.alive && pd.connected;
    });
  }

  function triggerWin() {}

  return { init, loadModels, updateState, triggerWin };
})();
