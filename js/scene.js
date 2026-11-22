/**
 * scene.js  (realism upgrade - drop-in replacement)
 * Renderer, camera, physically-scaled lighting rig, procedural environment map,
 * and a single setMood(0..1) that blends day (0) -> night (1).
 *
 * Tweak the look in ONE place: the DAY/NIGHT numbers inside setMood() and PT below.
 */

const RoomScene = (() => {
  let scene, camera, renderer, mood = 0;
  const lights = {};
  const canvas = document.getElementById("scene-canvas");

  const isMobile = window.innerWidth < 700;
  const isLowPower = isMobile || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4);

  // three.js r155+ stopped scaling light intensity by PI and uses real candela for point/spot lights.
  // That is why a plain "intensity: 1" room looks black on modern versions. These two factors fix it.
  const MODERN = parseInt(THREE.REVISION, 10) >= 155;
  const K_DIR = MODERN ? Math.PI : 1; // ambient / hemisphere / directional
  const K_PT = MODERN ? 7 : 1;        // point / spot

  // Practical lights: position, colour, day intensity (d), night intensity (n)
  const PT = {
    lamp:       { pos: [1.5, 1.6, -2.5],  c: 0xffc98a, d: 0,    n: 2.4 }, // desk lamp
    bedLamp:    { pos: [-3.1, 1.0, 0.5],  c: 0xffcf9a, d: 0,    n: 1.6 },
    floorLamp:  { pos: [3.0, 1.9, 0.0],   c: 0xffd2a0, d: 0,    n: 1.8 },
    strings:    { pos: [0, 3.9, -2.3],    c: 0xffdfb0, d: 0.15, n: 0.8 }, // fairy lights
    laptopGlow: { pos: [-0.5, 1.3, -2.0], c: 0xbcd8e8, d: 0.1,  n: 0.5 },
  };

  function makeEnvironment() {
    // Tiny procedural "room with a bright window" so glossy things get believable reflections.
    const env = new THREE.Scene();
    const shell = new THREE.Mesh(
      new THREE.BoxGeometry(20, 10, 20),
      new THREE.MeshBasicMaterial({ color: 0xcbb59a, side: THREE.BackSide })
    );
    shell.position.y = 4;
    env.add(shell);
    const win = new THREE.Mesh(
      new THREE.PlaneGeometry(8, 5),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffefd5).multiplyScalar(8) })
    );
    win.position.set(9.9, 5, 0);
    win.rotation.y = -Math.PI / 2;
    env.add(win);
    const pmrem = new THREE.PMREMGenerator(renderer);
    const tex = pmrem.fromScene(env, 0.04).texture;
    pmrem.dispose();
    return tex;
  }

  function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xeadfce);
    scene.fog = new THREE.Fog(0xeadfce, 14, 30);

    camera = new THREE.PerspectiveCamera(isMobile ? 55 : 45, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(5, 3.4, 6.3);
    camera.lookAt(0, 1.2, 0);

    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      logarithmicDepthBuffer: true,
      powerPreference: "high-performance"
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, isLowPower ? 1.5 : 2.5));
    renderer.shadowMap.enabled = !isLowPower;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.shadowMap.autoUpdate = true;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    if ("outputColorSpace" in renderer) renderer.outputColorSpace = THREE.SRGBColorSpace;
    else renderer.outputEncoding = THREE.sRGBEncoding;

    scene.environment = makeEnvironment();
    setupLighting();
    setMood(0);

    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
  }

  function setupLighting() {
    // Sky/ground bounce: stops shadows going dead black
    lights.hemi = new THREE.HemisphereLight(0xfff1de, 0x8a6a4c, 1);
    lights.ambient = lights.hemi; // alias so older code keeps working
    scene.add(lights.hemi);

    // Key light from the open side of the room (the "sun")
    lights.sun = new THREE.DirectionalLight(0xffe0b8, 1);
    lights.sun.position.set(6, 9, 7);
    lights.sun.target.position.set(0, 1, 0);
    lights.sun.castShadow = !isLowPower;
    lights.sun.shadow.mapSize.set(isLowPower ? 2048 : 4096, isLowPower ? 2048 : 4096);
    Object.assign(lights.sun.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8, near: 0.5, far: 28 });
    lights.sun.shadow.bias = -0.0008;
    lights.sun.shadow.normalBias = 0.08;
    scene.add(lights.sun, lights.sun.target);

    // Light coming through the window: casts the mullion cross and curtain shadows on the floor
    lights.window = new THREE.SpotLight(0xfff0d0, 1, 0, 0.55, 0.9, 2);
    lights.window.position.set(1.7, 3.2, -5.2);
    lights.window.target.position.set(0.9, 0.3, -0.2);
    lights.window.castShadow = !isLowPower;
    lights.window.shadow.mapSize.set(isLowPower ? 1024 : 2048, isLowPower ? 1024 : 2048);
    lights.window.shadow.camera.near = 1;
    lights.window.shadow.camera.far = 14;
    lights.window.shadow.bias = -0.001;
    lights.window.shadow.normalBias = 0.06;
    scene.add(lights.window, lights.window.target);

    // Practical lights (lamps, fairy lights, laptop)
    Object.entries(PT).forEach(([name, p]) => {
      lights[name] = new THREE.PointLight(p.c, 0, 7, 2);
      lights[name].position.set(...p.pos);
      scene.add(lights[name]);
    });
  }

  const _a = new THREE.Color(), _b = new THREE.Color();
  const mixC = (t, a, b, m) => t.copy(_a.set(a)).lerp(_b.set(b), m);

  /** m: 0 = day, 1 = night. Called every frame by the day/night transition. */
  function setMood(m) {
    mood = m;
    const L = (a, b) => a + (b - a) * m;

    mixC(scene.background, 0xeadfce, 0x151326, m);
    scene.fog.color.copy(scene.background);

    mixC(lights.hemi.color, 0xfff1de, 0x3a4280, m);
    mixC(lights.hemi.groundColor, 0x8a6a4c, 0x241a22, m);
    lights.hemi.intensity = L(0.42, 0.22) * K_DIR;

    mixC(lights.sun.color, 0xffe0b8, 0x8aa4ff, m); // becomes cool moonlight
    lights.sun.intensity = L(0.8, 0.08) * K_DIR;

    mixC(lights.window.color, 0xfff0d0, 0xa9bcff, m);
    lights.window.intensity = L(5, 1.4) * K_PT;

    Object.entries(PT).forEach(([name, p]) => {
      lights[name].intensity = L(p.d, p.n) * K_PT;
    });
    lights.lamp.userData.base = lights.lamp.intensity; // animations.js flickers around this

    renderer.toneMappingExposure = L(0.95, 1.0);
    if ("environmentIntensity" in scene) scene.environmentIntensity = L(0.45, 0.12);
  }

  function onResize() {
    const nowMobile = window.innerWidth < 700;
    camera.fov = nowMobile ? 55 : 45;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, isLowPower ? 1.5 : 2.5));
  }

  return {
    init,
    setMood,
    get mood() { return mood; },
    get scene() { return scene; },
    get camera() { return camera; },
    get renderer() { return renderer; },
    get lights() { return lights; },
    get isMobile() { return isMobile; },
    get isLowPower() { return isLowPower; },
    get hasEnvIntensity() { return "environmentIntensity" in scene; },
  };
})();