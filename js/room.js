/**
 * room.js
 * Cozy developer room (brown / white / black theme) built from Three.js primitives.
 * Interactive objects are THREE.Groups with userData.type so interactions.js can
 * identify them via raycasting.
 *
 * Room box: ~7 x 5.8 (back wall z=-3, left wall x=-3.5, floor reaches z=2.8).
 * New: bed, dog + cat, 2 bookshelves, window curtains, string lights, lots of clutter.
 */

const Room = (() => {
  const interactiveObjects = [];
  const animatedParts = {};
  let root;

  const COLORS = {
    floor: 0x5b3f2c,       // warm dark-brown wood
    wall: 0xf3e9dc,        // warm cream
    wallAccent: 0x5b4638,  // soft cocoa accent wall
    wood: 0x8a5e3b,        // mid brown
    woodDark: 0x3f2a1b,    // espresso
    black: 0x332a24,
    white: 0xfaf7f2,
    cream: 0xe9dcc6,
    tan: 0xc49a6c,
    coffee: 0x6f4a32,
    grey: 0x8c8782,
    // legacy keys (mapped to the new theme so old code paths still work)
    pink: 0xd9c3a8,
    sage: 0x6f4a32,
    blue: 0x2c2724,
    lavender: 0xe9dcc6,
  };

  // Add a local or hosted image path to replace any wall-photo placeholder.
  // Example: ["images/memory-one.jpg", "images/memory-two.jpg", "", "", "", ""]
  const WALL_PHOTO_SOURCES = ["images/img1.PNG", "images/img2.jpg", "images/img3.jpg", "images/img4.jpg", "", ""];

  function makeMat(color, opts = {}) {
    const { surface, ...materialOptions } = opts;
    const options = { color, roughness: 0.8, metalness: 0.05, ...materialOptions };
    const material = new THREE.MeshStandardMaterial(options);
    if (surface) material.userData.surface = surface;
    return material;
  }

  // ---------- tiny helpers to keep the clutter code short ----------
  function box(p, w, h, d, c, x, y, z, o) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), makeMat(c, o));
    m.position.set(x, y, z);
    m.castShadow = true;
    p.add(m);
    return m;
  }
  function cyl(p, rt, rb, h, c, x, y, z, o, seg = 48) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), makeMat(c, o));
    m.position.set(x, y, z);
    m.castShadow = true;
    p.add(m);
    return m;
  }
  function sph(p, r, c, x, y, z, sc, o) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(r, 48, 32), makeMat(c, o));
    m.position.set(x, y, z);
    if (sc) m.scale.set(sc[0], sc[1], sc[2]);
    m.castShadow = true;
    p.add(m);
    return m;
  }
  function rodBetween(parent, start, end, radius, color, segments = 24) {
    const direction = new THREE.Vector3().subVectors(end, start);
    const rod = new THREE.Mesh(
      new THREE.CylinderGeometry(radius, radius, direction.length(), segments),
      makeMat(color, { roughness: 0.65 })
    );
    rod.position.copy(start).add(end).multiplyScalar(0.5);
    rod.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
    rod.castShadow = true;
    parent.add(rod);
    return rod;
  }
  function glowMat(c, i = 0.8) {
    return new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: i });
  }

  function makeWallPhotoPlaceholder(index) {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = index % 2 ? "#c7b59f" : "#b8b4a8";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = index % 3 === 0 ? "#9b7958" : index % 3 === 1 ? "#747e68" : "#8e7d78";
    ctx.beginPath();
    ctx.moveTo(0, 355);
    ctx.quadraticCurveTo(150, 250, 305, 345);
    ctx.quadraticCurveTo(410, 400, 512, 300);
    ctx.lineTo(512, 512);
    ctx.lineTo(0, 512);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "rgba(255, 250, 240, 0.58)";
    ctx.beginPath();
    ctx.arc(390, 125, 58, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(63, 42, 27, 0.72)";
    ctx.lineWidth = 8;
    ctx.strokeRect(34, 34, 444, 444);
    ctx.fillStyle = "#4b392f";
    ctx.font = "600 28px Segoe UI, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("ADD PHOTO", 256, 250);
    ctx.font = "22px Segoe UI, sans-serif";
    ctx.fillStyle = "#5c4a3e";
    ctx.fillText(`PHOTO ${index + 1}`, 256, 290);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    return new THREE.MeshBasicMaterial({ map: texture, toneMapped: false });
  }

  function buildWallPhoto(parent, width, height, index, frameColor = COLORS.woodDark) {
    box(parent, width + 0.12, height + 0.12, 0.055, frameColor, 0, 0, 0);
    const photo = new THREE.Mesh(
      new THREE.PlaneGeometry(width, height),
      makeWallPhotoPlaceholder(index)
    );
    photo.position.z = 0.031;
    parent.add(photo);

    const source = WALL_PHOTO_SOURCES[index];
    if (source) {
      new THREE.TextureLoader().load(
        source,
        (texture) => {
          texture.colorSpace = THREE.SRGBColorSpace;
          texture.anisotropy = 4;
          photo.material = new THREE.MeshBasicMaterial({ map: texture, toneMapped: false });
        },
        undefined,
        () => {}
      );
    }
  }

  function build(scene) {
    root = new THREE.Group();
    scene.add(root);

    buildFloorAndWalls();
    buildWindow();
    buildCurtains();
    buildDesk();
    buildChair();
    buildLaptop();
    // Back-wall shelf removed to keep the wall photo unobstructed.
    buildBookshelf(-3.3, -1.1, Math.PI / 2, false); // second shelf on left wall
    buildConsole();
    buildPictureFrame();
    buildDeskNotes();
    buildPlants();
    buildBed();
    buildCat(-1.75, 0.66, 1.95, -0.6);          // cat naps on the bed
    buildDog(1.3, 0.15, 1.7);                   // dog on its own cushion
    buildDeskLamp();
    buildPhone();
    buildDecorations();
    buildWallDecor();
    buildStringLights();
    buildFloorClutter();
    buildDeskClutter();
    buildClutterHotspots();

    return { interactiveObjects, animatedParts, root };
  }

  // ------------------------------------------------------------------ shell
  function buildFloorAndWalls() {
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(7, 5.8), makeMat(COLORS.floor, { roughness: 0.9 }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, 0, -0.1);
    floor.receiveShadow = true;
    root.add(floor);

    // wood plank lines
    for (let i = -3; i <= 3; i++) {
      const line = new THREE.Mesh(new THREE.PlaneGeometry(0.02, 5.8), makeMat(COLORS.woodDark));
      line.rotation.x = -Math.PI / 2;
      line.position.set(i * 0.95, 0.003, -0.1);
      root.add(line);
    }

    const backWall = new THREE.Mesh(new THREE.PlaneGeometry(7, 4.4), makeMat(COLORS.wall));
    backWall.position.set(0, 2.2, -3);
    backWall.receiveShadow = true;
    root.add(backWall);

    const sideWall = new THREE.Mesh(new THREE.PlaneGeometry(5.8, 4.4), makeMat(COLORS.wallAccent));
    sideWall.rotation.y = Math.PI / 2;
    sideWall.position.set(-3.5, 2.2, -0.1);
    sideWall.receiveShadow = true;
    root.add(sideWall);

    // lower wainscot panel on the back wall
    const wains = new THREE.Mesh(new THREE.BoxGeometry(7, 0.9, 0.06), makeMat(COLORS.coffee));
    wains.position.set(0, 0.55, -2.97);
    root.add(wains);
    const rail = new THREE.Mesh(new THREE.BoxGeometry(7, 0.06, 0.1), makeMat(COLORS.woodDark));
    rail.position.set(0, 1.03, -2.95);
    root.add(rail);

    const trim = new THREE.Mesh(new THREE.BoxGeometry(7, 0.2, 0.1), makeMat(COLORS.black));
    trim.position.set(0, 0.1, -2.93);
    root.add(trim);

    const sideTrim = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.2, 5.8), makeMat(COLORS.black));
    sideTrim.position.set(-3.45, 0.1, -0.1);
    root.add(sideTrim);
  }

  function buildWindow() {
    const frame = new THREE.Mesh(new THREE.BoxGeometry(2.0, 2.0, 0.15), makeMat(COLORS.black));
    frame.position.set(1.7, 2.9, -2.92);
    root.add(frame);

    const glass = new THREE.Mesh(
      new THREE.PlaneGeometry(1.7, 1.7),
      new THREE.MeshStandardMaterial({ color: 0xe6eef2, transparent: true, opacity: 0.55, roughness: 0.1 })
    );
    glass.position.set(1.7, 2.9, -2.83);
    root.add(glass);

    const mV = new THREE.Mesh(new THREE.BoxGeometry(0.07, 1.7, 0.05), makeMat(COLORS.black));
    mV.position.set(1.7, 2.9, -2.8);
    root.add(mV);
    const mH = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.07, 0.05), makeMat(COLORS.black));
    mH.position.set(1.7, 2.9, -2.8);
    root.add(mH);

    // window sill with little items
    box(root, 2.2, 0.06, 0.28, COLORS.woodDark, 1.7, 1.88, -2.8);
    cyl(root, 0.06, 0.05, 0.1, COLORS.white, 1.1, 1.96, -2.78);          // tiny pot
    sph(root, 0.07, 0x4d5a3a, 1.1, 2.07, -2.78);                          // succulent
    cyl(root, 0.035, 0.035, 0.16, COLORS.black, 2.3, 1.99, -2.78);        // candle jar
    cyl(root, 0.04, 0.04, 0.12, COLORS.cream, 2.15, 1.97, -2.78);

    const moon = new THREE.Mesh(
      new THREE.SphereGeometry(0.24, 32, 20),
      new THREE.MeshStandardMaterial({ color: 0xf5f0e6, emissive: 0xf5f0e6, emissiveIntensity: 0.6 })
    );
    moon.position.set(2.05, 3.3, -2.75);
    moon.visible = false;
    root.add(moon);
    animatedParts.moon = moon;

    const dustCount = RoomScene.isLowPower ? 18 : 42;
    const dustGeometry = new THREE.BufferGeometry();
    const dustPositions = new Float32Array(dustCount * 3);
    const dustSpeeds = new Float32Array(dustCount);
    for (let i = 0; i < dustCount; i++) {
      dustPositions[i * 3] = 0.45 + Math.random() * 2.2;
      dustPositions[i * 3 + 1] = 0.8 + Math.random() * 2.4;
      dustPositions[i * 3 + 2] = -2.35 + Math.random() * 2.1;
      dustSpeeds[i] = 0.025 + Math.random() * 0.055;
    }
    dustGeometry.setAttribute("position", new THREE.BufferAttribute(dustPositions, 3));
    const dust = new THREE.Points(
      dustGeometry,
      new THREE.PointsMaterial({ color: 0xffedc6, size: 0.025, transparent: true, opacity: 0.55, depthWrite: false })
    );
    root.add(dust);
    animatedParts.dustMotes = {
      points: dust,
      speeds: dustSpeeds,
      basePositions: dustPositions.slice(),
    };

    const starGeo = new THREE.BufferGeometry();
    const starCount = 40;
    const positions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      positions[i * 3] = 0.95 + Math.random() * 1.5;
      positions[i * 3 + 1] = 2.15 + Math.random() * 1.5;
      positions[i * 3 + 2] = -2.78;
    }
    starGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.035, transparent: true, opacity: 0.9 }));
    stars.visible = false;
    root.add(stars);
    animatedParts.stars = stars;
  }

  // ---------------------------------------------------------------- curtain
  function buildCurtains() {
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 3.5, 64), makeMat(COLORS.black));
    rod.rotation.z = Math.PI / 2;
    rod.position.set(1.7, 4.0, -2.75);
    root.add(rod);
    [-0.02, 3.42].forEach((dx) => sph(root, 0.05, COLORS.black, dx, 4.0, -2.75));
    sph(root, 0.05, COLORS.black, 3.45, 4.0, -2.75);

    // two folded panels (alternating box depths = fold look)
    const makePanel = (cx, color) => {
      const g = new THREE.Group();
      for (let i = 0; i < 6; i++) {
        const fold = new THREE.Mesh(
          new THREE.BoxGeometry(0.11, 2.75, 0.07 + (i % 2) * 0.07),
          makeMat(color, { roughness: 1, surface: "fabric" })
        );
        fold.position.set(cx + (i - 2.5) * 0.1, 2.58, -2.68 + (i % 2) * 0.03);
        fold.castShadow = true;
        g.add(fold);
      }
      root.add(g);
      // tie-back
      const tie = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.07, 0.2), makeMat(COLORS.black));
      tie.position.set(cx, 2.3, -2.62);
      root.add(tie);
      return g;
    };
    makePanel(0.62, COLORS.coffee);
    makePanel(2.48, COLORS.coffee);
    // sheer white layer behind
    const sheer = new THREE.Mesh(
      new THREE.PlaneGeometry(1.8, 2.5),
      new THREE.MeshStandardMaterial({ color: COLORS.white, transparent: true, opacity: 0.25, side: THREE.DoubleSide })
    );
    sheer.position.set(1.7, 2.7, -2.7);
    root.add(sheer);
  }

  // ------------------------------------------------------------ furniture
  function buildDesk() {
    const deskGroup = new THREE.Group();
    deskGroup.position.set(0.3, 0, -2.3);

    box(deskGroup, 2.8, 0.12, 1.3, COLORS.wood, 0, 1.0, 0).receiveShadow = true;
    [[-1.3, -0.55], [1.3, -0.55], [-1.3, 0.55], [1.3, 0.55]].forEach(([x, z]) =>
      box(deskGroup, 0.1, 1.0, 0.1, COLORS.black, x, 0.5, z)
    );
    // drawer unit
    box(deskGroup, 0.7, 0.8, 1.1, COLORS.woodDark, 0.95, 0.5, 0);
    for (let i = 0; i < 2; i++) {
      box(deskGroup, 0.6, 0.3, 0.02, COLORS.wood, 0.95, 0.72 - i * 0.38, 0.56);
      box(deskGroup, 0.16, 0.025, 0.025, COLORS.black, 0.95, 0.72 - i * 0.38, 0.59);
      cyl(deskGroup, 0.018, 0.018, 0.035, COLORS.tan, 0.95, 0.72 - i * 0.38, 0.59, {}, 12).rotation.x = Math.PI / 2;
    }
    box(deskGroup, 2.76, 0.025, 0.035, COLORS.cream, 0, 1.055, 0.64);
    root.add(deskGroup);
  }

  function buildChair() {
    const chair = new THREE.Group();
    chair.position.set(0.3, 0, -1.0);
    box(chair, 0.7, 0.1, 0.7, COLORS.black, 0, 0.55, 0);
    box(chair, 0.7, 0.7, 0.1, COLORS.black, 0, 0.9, 0.3);
    box(chair, 0.6, 0.06, 0.6, COLORS.tan, 0, 0.62, 0, { surface: "fabric" }); // seat cushion
    [[-0.28, -0.28], [0.28, -0.28], [-0.28, 0.28], [0.28, 0.28]].forEach(([x, z]) =>
      cyl(chair, 0.04, 0.04, 0.55, COLORS.woodDark, x, 0.28, z, {}, 8)
    );
    box(chair, 0.5, 0.35, 0.05, COLORS.cream, 0, 0.55, -0.1, { surface: "fabric" }).rotation.x = 0.2; // pillow
    root.add(chair);
  }

  function buildLaptop() {
    const group = new THREE.Group();
    group.userData.type = "laptop";
    group.position.set(-0.5, 1.06, -2.45);
    const alu = { metalness: 0.3, roughness: 0.5 };
    box(group, 0.65, 0.04, 0.45, 0x2f2f2f, 0, 0, 0, alu);
    const screen = box(group, 0.65, 0.42, 0.03, 0x2f2f2f, 0, 0.21, -0.21, alu);
    screen.rotation.x = -0.35;
    rodBetween(group, new THREE.Vector3(-0.25, 0.03, -0.19), new THREE.Vector3(0.25, 0.03, -0.19), 0.012, 0x777777, 12);
    const glow = new THREE.Mesh(
      new THREE.PlaneGeometry(0.55, 0.34),
      new THREE.MeshStandardMaterial({ color: 0xcfe3ee, emissive: 0xcfe3ee, emissiveIntensity: 0.5, side: THREE.DoubleSide })
    );
    glow.position.set(0, 0.21, -0.19);
    glow.rotation.x = -0.35;
    group.add(glow);
    animatedParts.laptopScreen = glow;
    const screenLines = [];
    for (let i = 0; i < 4; i++) {
      const line = new THREE.Mesh(
        new THREE.PlaneGeometry(0.24 - i * 0.035, 0.012),
        new THREE.MeshBasicMaterial({ color: i === 0 ? 0x9ce8d3 : 0x5d9bb2, transparent: true, opacity: 0.8, side: THREE.DoubleSide })
      );
      line.position.set(-0.15, 0.3 - i * 0.055, -0.187);
      line.rotation.x = -0.35;
      group.add(line);
      screenLines.push(line);
    }
    const caret = new THREE.Mesh(
      new THREE.PlaneGeometry(0.008, 0.025),
      new THREE.MeshBasicMaterial({ color: 0xb9ffe9, transparent: true, side: THREE.DoubleSide })
    );
    caret.position.set(-0.035, 0.135, -0.187);
    caret.rotation.x = -0.35;
    group.add(caret);
    animatedParts.laptopTyping = { lines: screenLines, caret };
    sph(group, 0.009, 0x16191c, 0, 0.405, -0.23);
    const keyCount = 48;
    const keyGeometry = new THREE.BoxGeometry(0.027, 0.008, 0.025);
    const keys = new THREE.InstancedMesh(keyGeometry, makeMat(0x45484b, { roughness: 0.65 }), keyCount);
    const keyMatrix = new THREE.Matrix4();
    let keyIndex = 0;
    for (let row = 0; row < 4; row++) {
      for (let column = 0; column < 12; column++) {
        keyMatrix.makeTranslation(-0.24 + column * 0.044, 0.024, -0.13 + row * 0.05);
        keys.setMatrixAt(keyIndex++, keyMatrix);
      }
    }
    keys.instanceMatrix.needsUpdate = true;
    keys.castShadow = true;
    group.add(keys);
    box(group, 0.13, 0.006, 0.07, 0x373a3d, 0, 0.024, 0.145, { roughness: 0.6 });
    // stickers on the lid back
    box(group, 0.08, 0.08, 0.005, COLORS.tan, -0.15, 0.22, -0.235).rotation.x = -0.35;
    box(group, 0.07, 0.07, 0.005, COLORS.white, 0.1, 0.18, -0.235).rotation.x = -0.35;
    root.add(group);
    interactiveObjects.push(group);
  }

  function buildBookshelf(x, z, rotY, tall) {
    const group = new THREE.Group();
    group.userData.type = "bookshelf";
    group.position.set(x, 0, z);
    group.rotation.y = rotY;

    box(group, 1.52, 2.48, 0.04, COLORS.woodDark, 0, 1.3, -0.145);
    box(group, 0.08, 2.6, 0.35, COLORS.woodDark, -0.76, 1.3, 0);
    box(group, 0.08, 2.6, 0.35, COLORS.woodDark, 0.76, 1.3, 0);
    box(group, 1.6, 0.1, 0.35, COLORS.woodDark, 0, 0.05, 0);
    box(group, 1.6, 0.1, 0.35, COLORS.woodDark, 0, 2.55, 0);
    const bookColors = [COLORS.cream, COLORS.black, COLORS.tan, COLORS.white, COLORS.coffee, COLORS.grey];
    for (let row = 0; row < 3; row++) {
      const shelfY = 0.55 + row * 0.75;
      box(group, 1.42, 0.06, 0.3, COLORS.wood, 0, shelfY, 0.015);
      box(group, 1.42, 0.035, 0.025, COLORS.woodDark, 0, shelfY + 0.002, 0.17);

      let offset = -0.7;
      const n = 6;
      for (let b = 0; b < n; b++) {
        const w = 0.1 + Math.random() * 0.06;
        const h = row === 2 ? 0.25 + Math.random() * 0.15 : 0.25 + Math.random() * 0.2;
        const book = box(group, w, h, 0.2, bookColors[(row * 2 + b) % bookColors.length], offset + w / 2, shelfY + h / 2 + 0.03, 0.05);
        book.userData.reaction = "book";
        book.userData.mass = 2.2;
        const labelColor = [COLORS.black, COLORS.woodDark, COLORS.coffee].includes(bookColors[(row * 2 + b) % bookColors.length])
          ? COLORS.tan
          : COLORS.woodDark;
        box(group, w * 0.58, h * 0.22, 0.008, labelColor, book.position.x, book.position.y, 0.156);
        box(group, w * 0.72, 0.008, 0.16, COLORS.white, book.position.x, book.position.y + h / 2 + 0.001, 0.05);
        if (b === n - 1 && row === 1) { book.rotation.z = -0.25; book.position.x += 0.04; } // leaning book
        offset += w + 0.03;
      }
      // trinkets at the end of each row
      if (row === 0) cyl(group, 0.07, 0.06, 0.16, COLORS.white, 0.62, shelfY + 0.11, 0.05);
      if (row === 1) sph(group, 0.08, COLORS.tan, 0.62, shelfY + 0.12, 0.05);
      if (row === 2) box(group, 0.14, 0.14, 0.14, COLORS.black, 0.62, shelfY + 0.1, 0.05);
    }
    // top-of-shelf clutter
    box(group, 0.4, 0.12, 0.25, COLORS.cream, -0.4, 2.66, 0);
    box(group, 0.35, 0.1, 0.22, COLORS.coffee, -0.4, 2.77, 0);
    cyl(group, 0.1, 0.08, 0.18, COLORS.white, 0.3, 2.69, 0);
    sph(group, 0.1, 0x4d5a3a, 0.3, 2.86, 0);

    root.add(group);
    interactiveObjects.push(group);
  }

  function buildConsole() {
    const group = new THREE.Group();
    group.userData.type = "console";
    group.position.set(1.4, 1.06, -2.25);
    box(group, 0.32, 0.08, 0.2, 0x2a2a2a, 0, 0, 0, { metalness: 0.4, roughness: 0.4 });
    const g = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 0.04), glowMat(0xf2e3c8, 0.4));
    g.rotation.x = -Math.PI / 2;
    g.position.y = 0.041;
    group.add(g);
    root.add(group);
    interactiveObjects.push(group);
  }

  function buildPictureFrame() {
    const group = new THREE.Group();
    group.userData.type = "frame";
    group.position.set(-0.5, 3.05, -2.88);
    buildWallPhoto(group, 1.35, 1.65, 0, COLORS.black);
    root.add(group);
    interactiveObjects.push(group);
  }

  function buildDeskNotes() {
    const group = new THREE.Group();
    group.userData.type = "notes";
    group.position.set(0.3, 1.07, -2.05);
    [COLORS.cream, COLORS.tan, COLORS.white].forEach((c, i) => {
      const note = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.2), makeMat(c, { roughness: 1 }));
      note.rotation.x = -Math.PI / 2;
      note.rotation.z = (i - 1) * 0.25;
      note.position.set((i - 1) * 0.16, 0.001, i * 0.05);
      group.add(note);
    });
    root.add(group);
    interactiveObjects.push(group);
  }

  function buildPlants() {
    function addPottedPlant(x, z, scale, potColor, leafColor, leafCount = 7) {
      const plant = new THREE.Group();
      plant.position.set(x, 0, z);
      plant.scale.setScalar(scale);
      cyl(plant, 0.22, 0.16, 0.3, potColor, 0, 0.15, 0, {}, 12);

      const leaves = new THREE.Group();
      for (let i = 0; i < leafCount; i++) {
        const angle = (i / leafCount) * Math.PI * 2;
        const leaf = sph(
          leaves,
          0.16,
          leafColor,
          Math.cos(angle) * 0.14,
          0.48 + (i % 3) * 0.1,
          Math.sin(angle) * 0.14,
          [0.55, 1.45, 0.4]
        );
        leaf.rotation.z = Math.cos(angle) * 0.45;
        leaf.rotation.x = -Math.sin(angle) * 0.45;
      }
      plant.add(leaves);
      root.add(plant);
      return plant;
    }

    const group = new THREE.Group();
    group.userData.type = "plants";
    group.position.set(2.9, 0, -2.5);
    cyl(group, 0.22, 0.16, 0.3, COLORS.white, 0, 0.15, 0, {}, 12);
    const leafMat = makeMat(0x55663f);
    const leafGroup = new THREE.Group();
    for (let i = 0; i < 7; i++) {
      const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.16, 48, 32), leafMat);
      const a = (i / 7) * Math.PI * 2;
      const leafY = 0.5 + Math.random() * 0.35;
      leaf.position.set(Math.cos(a) * 0.14, leafY, Math.sin(a) * 0.14);
      leaf.scale.set(0.55, 1.3, 0.35);
      leaf.rotation.z = Math.cos(a) * 0.45;
      leaf.rotation.x = -Math.sin(a) * 0.45;
      leaf.castShadow = true;
      leafGroup.add(leaf);
      rodBetween(
        leafGroup,
        new THREE.Vector3(Math.cos(a) * 0.1, leafY - 0.13, Math.sin(a) * 0.1),
        new THREE.Vector3(Math.cos(a) * 0.17, leafY + 0.16, Math.sin(a) * 0.17),
        0.003,
        0x788657,
        5
      );
    }
    group.add(leafGroup);
    animatedParts.plantLeaves = leafGroup;
    animatedParts.plantLeavesBaseRotation = leafGroup.rotation.clone();
    root.add(group);
    interactiveObjects.push(group);

    // extra plants (decorative)
    const extra = new THREE.Group();
    extra.position.set(-1.45, 0, -2.4);
    cyl(extra, 0.15, 0.11, 0.22, COLORS.black, 0, 0.11, 0);
    for (let i = 0; i < 5; i++) sph(extra, 0.1, 0x4d5a3a, Math.cos(i) * 0.08, 0.3 + i * 0.06, Math.sin(i) * 0.08, [0.6, 1.5, 0.6]);
    root.add(extra);

    const hang = new THREE.Group(); // hanging pot from the ceiling-ish
    hang.position.set(-0.4, 3.75, -2.5);
    cyl(hang, 0.003, 0.003, 0.5, COLORS.black, 0, 0.3, 0, {}, 4);
    cyl(hang, 0.12, 0.08, 0.14, COLORS.tan, 0, 0, 0);
    for (let i = 0; i < 6; i++) box(hang, 0.03, 0.3 + (i % 3) * 0.1, 0.01, 0x55663f, Math.cos(i * 1.1) * 0.1, -0.2 - (i % 3) * 0.04, Math.sin(i * 1.1) * 0.1);
    root.add(hang);
    animatedParts.hangingPlant = hang;

    addPottedPlant(-1.05, 0.45, 1.0, COLORS.tan, 0x536d43, 8);
    addPottedPlant(2.72, 1.05, 0.85, COLORS.cream, 0x657b4b, 6);
  }

  // -------------------------------------------------------------------- bed
  function buildBed() {
    const bed = new THREE.Group();
    bed.position.set(-2.3, 0, 1.6); // headboard sits against the left wall

    box(bed, 2.1, 0.3, 1.6, COLORS.woodDark, 0, 0.25, 0);                // frame
    box(bed, 2.0, 0.2, 1.5, COLORS.white, 0, 0.5, 0, { surface: "fabric" }); // mattress
    box(bed, 0.1, 1.0, 1.7, COLORS.black, -1.05, 0.65, 0);               // headboard
    box(bed, 0.08, 0.5, 1.6, COLORS.woodDark, 1.05, 0.4, 0);             // footboard
    box(bed, 1.2, 0.07, 1.56, COLORS.coffee, 0.4, 0.63, 0, { surface: "fabric" }); // blanket
    box(bed, 0.4, 0.07, 1.56, COLORS.black, 0.02, 0.64, 0, { surface: "fabric" }); // blanket stripe
    box(bed, 0.5, 0.07, 1.58, COLORS.cream, 0.95, 0.64, 0, { surface: "fabric" }); // folded throw
    [-0.4, 0.4].forEach((z, i) => box(bed, 0.4, 0.14, 0.6, i ? COLORS.cream : COLORS.white, -0.8, 0.66, z, { surface: "fabric" }));
    box(bed, 0.3, 0.12, 0.3, COLORS.black, -0.55, 0.66, 0.0).rotation.y = 0.5;
    box(bed, 0.28, 0.12, 0.28, COLORS.tan, -0.35, 0.69, -0.45).rotation.y = -0.4;
    const quiltPoints = [];
    for (let x = -0.12; x < 0.9; x += 0.3) {
      for (let z = -0.54; z < 0.55; z += 0.36) {
        quiltPoints.push(
          new THREE.Vector3(x, 0.676, z),
          new THREE.Vector3(x + 0.15, 0.676, z + 0.18),
          new THREE.Vector3(x + 0.15, 0.676, z + 0.18),
          new THREE.Vector3(x + 0.3, 0.676, z),
          new THREE.Vector3(x + 0.3, 0.676, z),
          new THREE.Vector3(x + 0.15, 0.676, z - 0.18),
          new THREE.Vector3(x + 0.15, 0.676, z - 0.18),
          new THREE.Vector3(x, 0.676, z)
        );
      }
    }
    const quiltGeometry = new THREE.BufferGeometry().setFromPoints(quiltPoints);
    bed.add(new THREE.LineSegments(quiltGeometry, new THREE.LineBasicMaterial({ color: 0xd6c6ae, transparent: true, opacity: 0.8 })));
    root.add(bed);

    // nightstand + lamp + alarm clock + book
    const ns = new THREE.Group();
    ns.position.set(-3.15, 0, 0.45);
    box(ns, 0.5, 0.55, 0.5, COLORS.woodDark, 0, 0.28, 0);
    box(ns, 0.4, 0.2, 0.02, COLORS.wood, 0, 0.35, 0.26);
    sph(ns, 0.025, COLORS.tan, 0, 0.35, 0.29, null, { metalness: 0.45, roughness: 0.35 });
    cyl(ns, 0.08, 0.1, 0.04, COLORS.black, 0, 0.58, 0);
    cyl(ns, 0.012, 0.012, 0.3, COLORS.black, 0, 0.75, 0, {}, 6);
    const sh = cyl(ns, 0.07, 0.14, 0.15, COLORS.cream, 0, 0.95, 0, { emissive: 0xffe2b0, emissiveIntensity: 0.3 });
    box(ns, 0.14, 0.09, 0.06, COLORS.black, 0.14, 0.62, 0.12);
    box(ns, 0.2, 0.04, 0.15, COLORS.tan, -0.1, 0.6, 0.15);
    root.add(ns);

    // floating shelf above the bed with clutter
    box(root, 0.3, 0.05, 1.4, COLORS.wood, -3.33, 2.2, 1.6);
    [0.1, 0.35, 0.6].forEach((dz, i) => box(root, 0.18, 0.28 + i * 0.04, 0.07, [COLORS.cream, COLORS.black, COLORS.tan][i], -3.33, 2.36, 1.1 + dz * 0.5));
    cyl(root, 0.07, 0.06, 0.14, COLORS.white, -3.33, 2.3, 1.9);
    sph(root, 0.07, 0x55663f, -3.33, 2.42, 1.9);
    sph(root, 0.1, COLORS.tan, -3.33, 2.3, 2.1);
  }

  // ------------------------------------------------------------------- pets
  function buildCat(x, y, z, rotY) {
    const group = new THREE.Group();
    group.userData.type = "cat";
    group.position.set(x, y, z);
    group.rotation.y = rotY || 0;
    group.scale.setScalar(0.9);

    const catMat = makeMat(0x2a2623, { surface: "fur", roughness: 1 }); // black cat, white socks
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.22, 48, 32), catMat);
    body.scale.set(1.2, 0.9, 1);
    body.position.y = 0.2;
    body.castShadow = true;
    group.add(body);
    animatedParts.catBody = body;

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.15, 48, 32), catMat);
    head.position.set(0, 0.36, 0.2);
    head.castShadow = true;
    group.add(head);

    const earGeo = new THREE.ConeGeometry(0.05, 0.09, 48);
    [-0.08, 0.08].forEach((ex) => {
      const ear = new THREE.Mesh(earGeo, catMat);
      ear.position.set(ex, 0.47, 0.2);
      ear.rotation.x = -0.2;
      group.add(ear);
    });
    // white chest + paws
    sph(group, 0.08, COLORS.white, 0, 0.25, 0.22, [1, 1, 0.6]);
    [-0.07, 0.07].forEach((px, index) => {
      const paw = new THREE.Group();
      paw.position.set(px, 0.03, 0.2);
      sph(paw, 0.04, COLORS.white, 0, 0, 0, [1, 0.6, 1.4]);
      group.add(paw);
      if (index === 0) animatedParts.catPaw = paw;
    });

    [-0.055, 0.055].forEach((ex) => {
      sph(group, 0.025, 0xd9b35f, ex, 0.385, 0.337);
      sph(group, 0.011, 0x171514, ex, 0.385, 0.357);
      sph(group, 0.004, COLORS.white, ex - 0.004, 0.393, 0.366);
    });
    sph(group, 0.018, 0xd58d91, 0, 0.33, 0.353, [1, 0.75, 0.6]);
    rodBetween(group, new THREE.Vector3(0, 0.32, 0.35), new THREE.Vector3(-0.025, 0.3, 0.35), 0.003, 0xb9a19c, 5);
    rodBetween(group, new THREE.Vector3(0, 0.32, 0.35), new THREE.Vector3(0.025, 0.3, 0.35), 0.003, 0xb9a19c, 5);
    [-1, 1].forEach((side) => {
      for (let whisker = 0; whisker < 3; whisker++) {
        const y = 0.32 + whisker * 0.025;
        rodBetween(
          group,
          new THREE.Vector3(side * 0.07, y, 0.33),
          new THREE.Vector3(side * 0.2, y + (whisker - 1) * 0.025, 0.34),
          0.002,
          0xc8c0b9,
          4
        );
      }
    });

    const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.03, 0.35, 48), catMat);
    tail.position.set(0, 0.28, -0.28);
    tail.rotation.x = 0.9;
    group.add(tail);

    animatedParts.catTail = tail;
    animatedParts.catHead = head;
    animatedParts.catGroup = group;

    const eyeLid = new THREE.Mesh(new THREE.PlaneGeometry(0.14, 0.03), makeMat(0xf4efe6));
    eyeLid.position.set(0, 0.38, 0.34);
    eyeLid.visible = false;
    group.add(eyeLid);
    animatedParts.catBlink = eyeLid;

    root.add(group);
    interactiveObjects.push(group);
  }

  function buildDog(x, y, z) {
    // round dog cushion
    const cushion = new THREE.Group();
    cushion.position.set(x, 0, z);
    cyl(cushion, 0.8, 0.8, 0.12, COLORS.coffee, 0, 0.06, 0, { surface: "fabric" }, 48);
    cyl(cushion, 0.65, 0.65, 0.16, COLORS.cream, 0, 0.1, 0, { surface: "fabric" }, 48);
    root.add(cushion);

    const group = new THREE.Group();
    group.userData.type = "dog";
    group.position.set(x, y + 0.1, z);
    group.rotation.y = 0.5;

    const fur = makeMat(COLORS.tan, { surface: "fur", roughness: 1 });
    const white = makeMat(COLORS.white, { surface: "fur", roughness: 1 });
    const dark = makeMat(COLORS.woodDark);

    const body = new THREE.Mesh(new THREE.SphereGeometry(0.28, 48, 32), fur);
    body.scale.set(1.5, 0.8, 1);
    body.position.set(0, 0.2, -0.05);
    body.castShadow = true;
    group.add(body);
    sph(group, 0.17, COLORS.white, 0, 0.2, 0.2, [1.3, 0.7, 1]); // chest

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.19, 48, 32), fur);
    head.position.set(0.3, 0.3, 0.2);
    head.castShadow = true;
    group.add(head);
    const snout = new THREE.Mesh(new THREE.SphereGeometry(0.1, 48, 32), white);
    snout.scale.set(1, 0.8, 1.3);
    snout.position.set(0.3, 0.25, 0.37);
    group.add(snout);
    sph(group, 0.035, COLORS.black, 0.3, 0.28, 0.47);                         // nose
    [0.22, 0.38].forEach((ex) => {
      sph(group, 0.022, COLORS.black, ex, 0.35, 0.36);                        // eyes
      const ear = new THREE.Mesh(new THREE.SphereGeometry(0.09, 48, 32), dark); // floppy ears
      ear.scale.set(0.6, 1.3, 0.8);
      ear.position.set(ex + (ex < 0.3 ? -0.1 : 0.1), 0.3, 0.17);
      group.add(ear);
    });
    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.018, 16, 64), makeMat(0x9c5146, { roughness: 0.75 }));
    collar.position.set(0.17, 0.22, 0.18);
    collar.rotation.y = Math.PI / 2;
    group.add(collar);
    sph(group, 0.035, COLORS.tan, 0.17, 0.1, 0.32, [0.8, 1, 0.35], { metalness: 0.4, roughness: 0.35 });
    rodBetween(group, new THREE.Vector3(0.25, 0.18, 0.38), new THREE.Vector3(0.33, 0.16, 0.41), 0.008, COLORS.woodDark, 6);
    // paws
    [[0.15, 0.3], [0.42, 0.3]].forEach(([px, pz]) => sph(group, 0.06, COLORS.white, px - 0.1, 0.05, pz + 0.05, [1, 0.7, 1.5]));

    const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.04, 0.3, 48), fur);
    tail.position.set(-0.42, 0.22, -0.08);
    tail.rotation.z = 1.0;
    group.add(tail);

    animatedParts.dogTail = tail;
    animatedParts.dogHead = head;
    animatedParts.dogGroup = group;

    root.add(group);
    interactiveObjects.push(group);

    // toys next to the dog bed
    sph(root, 0.07, 0x3a2a20, x + 0.9, 0.07, z + 0.2);        // ball
    box(root, 0.28, 0.07, 0.07, COLORS.white, x + 0.85, 0.04, z - 0.1).rotation.y = 0.8; // bone
    cyl(root, 0.1, 0.09, 0.05, COLORS.black, x - 0.95, 0.03, z + 0.5); // water bowl
    cyl(root, 0.1, 0.09, 0.05, COLORS.white, x - 0.95, 0.03, z + 0.2);  // food bowl
  }

  // ---------------------------------------------------------------- lamp etc
  function buildDeskLamp() {
    const group = new THREE.Group();
    group.position.set(1.3, 1.06, -2.6);
    cyl(group, 0.1, 0.12, 0.03, COLORS.black, 0, 0, 0);
    const arm = cyl(group, 0.015, 0.015, 0.5, 0x2a2a2a, 0, 0.25, 0, {}, 8);
    arm.rotation.z = 0.3;
    const shade = new THREE.Mesh(
      new THREE.ConeGeometry(0.12, 0.16, 32, 2, true),
      makeMat(COLORS.cream, { side: THREE.DoubleSide })
    );
    shade.position.set(0.2, 0.5, 0);
    shade.rotation.z = Math.PI;
    group.add(shade);
    animatedParts.lampShade = shade;
    root.add(group);
  }

  function buildPhone() {
    const group = new THREE.Group();
    group.userData.type = "phone";
    group.position.set(-0.25, 1.065, -2.15);
    group.rotation.x = -Math.PI / 2;
    box(group, 0.1, 0.2, 0.01, 0x232323, 0, 0, 0, { metalness: 0.5, roughness: 0.3 });
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.08, 0.17), glowMat(0xcfe3ee, 0.25));
    screen.position.z = 0.006;
    group.add(screen);
    box(group, 0.035, 0.004, 0.002, 0x738b98, -0.015, 0.045, 0.009);
    [-0.025, 0, 0.025].forEach((x, i) => {
      const tile = new THREE.Mesh(
        new THREE.CircleGeometry(0.009, 32),
        new THREE.MeshBasicMaterial({ color: [0x9e91d8, 0x75c7ba, 0xe9ba7b][i] })
      );
      tile.position.set(x, -0.015, 0.009);
      group.add(tile);
    });
    [-0.04, -0.055].forEach((y) => box(group, 0.048, 0.003, 0.002, 0x91bfe5, 0, y, 0.009));
    box(group, 0.004, 0.025, 0.008, COLORS.black, 0.052, 0.015, 0);
    root.add(group);
    interactiveObjects.push(group);
  }

  function buildDecorations() {
    cyl(root, 0.06, 0.05, 0.09, COLORS.white, 0.85, 1.1, -2.55); // coffee cup
    const mugHandle = new THREE.Mesh(new THREE.TorusGeometry(0.043, 0.009, 16, 48), makeMat(COLORS.white));
    mugHandle.position.set(0.905, 1.1, -2.55);
    root.add(mugHandle);
    const coffeeSurface = new THREE.Mesh(new THREE.CircleGeometry(0.043, 64), makeMat(0x49301f, { roughness: 0.3 }));
    coffeeSurface.rotation.x = -Math.PI / 2;
    coffeeSurface.position.set(0.85, 1.146, -2.55);
    root.add(coffeeSurface);
    box(root, 0.4, 0.02, 0.14, COLORS.black, -0.5, 1.065, -2.05);  // keyboard
    sph(root, 0.04, COLORS.black, -0.05, 1.07, -2.05, [1, 0.6, 1.4]); // mouse

    // big rug under desk chair
    const rug = new THREE.Mesh(new THREE.CircleGeometry(1.2, 64), makeMat(COLORS.cream, { roughness: 1, surface: "fabric" }));
    rug.rotation.x = -Math.PI / 2;
    rug.position.set(0.3, 0.01, -0.3);
    rug.receiveShadow = true;
    root.add(rug);
    const rug2 = new THREE.Mesh(new THREE.RingGeometry(0.8, 1.0, 64), makeMat(COLORS.coffee, { roughness: 1, surface: "fabric" }));
    rug2.rotation.x = -Math.PI / 2;
    rug2.position.set(0.3, 0.012, -0.3);
    root.add(rug2);
    const rugStitch = new THREE.Mesh(new THREE.RingGeometry(1.04, 1.065, 64), makeMat(COLORS.tan, { roughness: 1, surface: "fabric" }));
    rugStitch.rotation.x = -Math.PI / 2;
    rugStitch.position.set(0.3, 0.014, -0.3);
    root.add(rugStitch);
    const stitchPositions = [];
    for (let i = 0; i < 48; i++) {
      const angle = (i / 48) * Math.PI * 2;
      const inner = 0.82;
      const outer = 0.85;
      stitchPositions.push(
        new THREE.Vector3(Math.cos(angle) * inner, 0, Math.sin(angle) * inner),
        new THREE.Vector3(Math.cos(angle) * outer, 0, Math.sin(angle) * outer)
      );
    }
    const stitchGeometry = new THREE.BufferGeometry().setFromPoints(stitchPositions);
    const rugStitches = new THREE.LineSegments(stitchGeometry, new THREE.LineBasicMaterial({ color: COLORS.cream }));
    rugStitches.position.set(0.3, 0.015, -0.3);
    root.add(rugStitches);

    // bedside rug
    const bedRug = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 2.0), makeMat(COLORS.black, { roughness: 1, surface: "fabric" }));
    bedRug.rotation.x = -Math.PI / 2;
    bedRug.position.set(-1.0, 0.012, 1.6);
    root.add(bedRug);
    const bedRugIn = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.8), makeMat(COLORS.cream, { roughness: 1, surface: "fabric" }));
    bedRugIn.rotation.x = -Math.PI / 2;
    bedRugIn.position.set(-1.0, 0.014, 1.6);
    root.add(bedRugIn);

    if (!(typeof RoomScene !== "undefined" && RoomScene.isLowPower)) {
      const sparkleCount = 26;
      const geo = new THREE.BufferGeometry();
      const pos = new Float32Array(sparkleCount * 3);
      for (let i = 0; i < sparkleCount; i++) {
        pos[i * 3] = -3 + Math.random() * 6;
        pos[i * 3 + 1] = 0.3 + Math.random() * 3.4;
        pos[i * 3 + 2] = -2.5 + Math.random() * 4.5;
      }
      geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      const sparkles = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xfff3e0, size: 0.02, transparent: true, opacity: 0.5 }));
      root.add(sparkles);
      animatedParts.sparkles = sparkles;
    }
  }

  // ------------------------------------------------------------- wall decor
  function buildWallDecor() {
    // round wall clock
    const clock = new THREE.Group();
    clock.position.set(-1.6, 3.55, -2.93);
    const face = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.05, 48), makeMat(COLORS.white));
    face.rotation.x = Math.PI / 2; clock.add(face);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.025, 16, 64), makeMat(COLORS.black));
    rim.position.z = 0.02; clock.add(rim);
    const innerRing = new THREE.Mesh(new THREE.TorusGeometry(0.205, 0.004, 5, 48), makeMat(COLORS.tan));
    innerRing.position.z = 0.031;
    clock.add(innerRing);
    const tickPositions = [];
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const outerRadius = i % 3 === 0 ? 0.19 : 0.18;
      const innerRadius = i % 3 === 0 ? 0.16 : 0.165;
      tickPositions.push(
        new THREE.Vector3(Math.sin(angle) * innerRadius, Math.cos(angle) * innerRadius, 0.034),
        new THREE.Vector3(Math.sin(angle) * outerRadius, Math.cos(angle) * outerRadius, 0.034)
      );
    }
    const tickGeometry = new THREE.BufferGeometry().setFromPoints(tickPositions);
    clock.add(new THREE.LineSegments(tickGeometry, new THREE.LineBasicMaterial({ color: COLORS.woodDark })));
    sph(clock, 0.025, COLORS.tan, 0, 0, 0.055, null, { metalness: 0.45, roughness: 0.35 });
    const minuteHand = new THREE.Group();
    minuteHand.position.set(0, 0, 0.045);
    box(minuteHand, 0.015, 0.16, 0.01, COLORS.black, 0, 0.07, 0);
    clock.add(minuteHand);
    const hourHand = new THREE.Group();
    hourHand.position.set(0, 0, 0.046);
    const hourHandMesh = box(hourHand, 0.015, 0.11, 0.01, COLORS.black, 0.04, 0.0, 0);
    hourHandMesh.rotation.z = -1.2;
    clock.add(hourHand);
    animatedParts.clockHands = { minute: minuteHand, hour: hourHand };
    root.add(clock);

    // Large placeholder-photo gallery on the back and left walls.
    // Replace entries in WALL_PHOTO_SOURCES above to show personal photos.
    const frames = [
      [-2.15, 2.75, -2.88, 0.95, 1.15, 0, 1],
      [-3.38, 3.15, 0.35, 0.75, 1.0, Math.PI / 2, 3],
      [-3.38, 3.15, 1.45, 0.85, 1.15, Math.PI / 2, 4],
      [-3.38, 3.15, -1.35, 0.7, 0.95, Math.PI / 2, 5],
    ];
    frames.forEach(([x, y, z, w, hgt, ry, photoIndex]) => {
      const g = new THREE.Group();
      g.position.set(x, y, z);
      g.rotation.y = ry;
      buildWallPhoto(g, w, hgt, photoIndex, photoIndex % 2 ? COLORS.black : COLORS.woodDark);
      root.add(g);
    });

    // coat hooks with a hoodie + tote on the back wall near the bookshelf
    const hooks = new THREE.Group();
    hooks.position.set(2.95, 2.0, -2.93);
    box(hooks, 0.6, 0.1, 0.05, COLORS.black, 0, 0, 0);
    [-0.2, 0, 0.2].forEach((hx) => sph(hooks, 0.025, COLORS.tan, hx, -0.03, 0.05));
    box(hooks, 0.3, 0.45, 0.06, COLORS.coffee, -0.2, -0.3, 0.08);   // hoodie
    box(hooks, 0.25, 0.3, 0.04, COLORS.cream, 0.2, -0.2, 0.08);     // tote bag
    root.add(hooks);

    // pennant garland on side wall
    for (let i = 0; i < 6; i++) {
      const tri = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.2, 3), makeMat([COLORS.white, COLORS.tan, COLORS.coffee][i % 3]));
      tri.position.set(-3.44, 3.9 - Math.sin((i / 5) * Math.PI) * 0.15 * -1 - 0.1, -2.4 + i * 0.35);
      tri.rotation.z = Math.PI; tri.rotation.y = Math.PI / 2;
      root.add(tri);
    }
  }

  function buildStringLights() {
    const n = 22;
    const bulbs = [];
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      const x = -3.2 + t * 6.4;
      const y = 4.2 - Math.sin(t * Math.PI * 3) * 0.0 - Math.abs(Math.sin(t * Math.PI * 4)) * 0.18;
      const bulb = sph(root, 0.035, i % 2 ? 0xffe2b0 : 0xfff3d6, x, y, -2.9, null, { emissive: 0xffd9a0, emissiveIntensity: 0.9 });
      bulbs.push(bulb);
      if (i < n - 1) {
        const wire = new THREE.Mesh(new THREE.BoxGeometry(6.4 / n, 0.006, 0.006), makeMat(COLORS.black));
        wire.position.set(x + 0.15, y - 0.01, -2.9);
        root.add(wire);
      }
    }
    const pl = new THREE.PointLight(0xffd9a0, 0.4, 6);
    pl.position.set(0, 3.9, -2.4);
    root.add(pl);
    animatedParts.stringBulbs = bulbs;
    animatedParts.stringLight = pl;
  }

  // --------------------------------------------------------------- clutter
  function buildFloorClutter() {
    // extra small floor clutter
    const books = new THREE.Group();
    books.position.set(-2.05, 0.08, 1.15);
    box(books, 0.32, 0.07, 0.24, COLORS.coffee, 0, 0, 0).rotation.y = 0.18;
    box(books, 0.28, 0.07, 0.22, COLORS.cream, 0.02, 0.07, 0).rotation.y = -0.12;
    box(books, 0.24, 0.06, 0.2, COLORS.black, -0.01, 0.13, 0).rotation.y = 0.08;
    root.add(books);

    const yarnBasket = new THREE.Group();
    yarnBasket.position.set(-2.25, 0, 0.45);
    cyl(yarnBasket, 0.24, 0.19, 0.28, COLORS.tan, 0, 0.14, 0, { surface: "woven" }, 32);
    sph(yarnBasket, 0.1, COLORS.pink, -0.12, 0.36, 0.02);
    sph(yarnBasket, 0.1, COLORS.lavender, 0.08, 0.38, -0.04);
    sph(yarnBasket, 0.09, COLORS.cream, 0.16, 0.34, 0.07);
    root.add(yarnBasket);

    // folded throw blanket on the side of the bed
    box(root, 0.7, 0.12, 0.38, COLORS.coffee, -3.08, 0.43, 1.65, { surface: "fabric" }).rotation.y = Math.PI / 2;
    box(root, 0.62, 0.1, 0.34, COLORS.tan, -3.04, 0.53, 1.65, { surface: "fabric" }).rotation.y = Math.PI / 2;

    // slippers beside the bed
    [-0.16, 0.16].forEach((offset) => {
      const slipper = sph(root, 0.12, COLORS.cream, -2.25 + offset, 0.07, 2.58);
      slipper.rotation.z = offset > 0 ? -0.08 : 0.08;
      slipper.scale.set(1.35, 0.55, 1.8);
    });

    // floor lamp
    const lamp = new THREE.Group();
    lamp.position.set(3.0, 0, 0.0);
    cyl(lamp, 0.18, 0.2, 0.04, COLORS.black, 0, 0.02, 0);
    cyl(lamp, 0.015, 0.015, 1.8, COLORS.black, 0, 0.92, 0, {}, 8);
    const shade = cyl(lamp, 0.15, 0.28, 0.35, COLORS.cream, 0, 1.9, 0, { emissive: 0xffe2b0, emissiveIntensity: 0.35 });
    animatedParts.floorLampShade = shade;
    root.add(lamp);

    // wicker basket with blanket
    const basket = new THREE.Group();
    basket.position.set(2.7, 0, -1.2);
    cyl(basket, 0.32, 0.26, 0.4, COLORS.tan, 0, 0.2, 0, { surface: "woven" }, 48);
    box(basket, 0.45, 0.1, 0.3, COLORS.coffee, 0, 0.45, 0, { surface: "fabric" }).rotation.y = 0.4;
    box(basket, 0.35, 0.1, 0.3, COLORS.white, 0.05, 0.54, 0.05, { surface: "fabric" }).rotation.y = -0.3;
    root.add(basket);

    // acoustic guitar leaning on wall
    const gtr = new THREE.Group();
    gtr.position.set(3.2, 0, -1.7);
    gtr.rotation.z = -0.12;
    sph(gtr, 0.22, COLORS.wood, 0, 0.35, 0, [1, 1.2, 0.35]);
    sph(gtr, 0.17, COLORS.wood, 0, 0.75, 0, [1, 1, 0.35]);
    const hole = new THREE.Mesh(new THREE.CircleGeometry(0.06, 48), makeMat(COLORS.black));
    hole.position.set(0, 0.55, 0.08); gtr.add(hole);
    const rosette = new THREE.Mesh(new THREE.TorusGeometry(0.073, 0.008, 12, 64), makeMat(COLORS.tan));
    rosette.position.set(0, 0.55, 0.082);
    gtr.add(rosette);
    box(gtr, 0.17, 0.035, 0.018, COLORS.woodDark, 0, 0.33, 0.08);
    [-0.055, -0.02, 0.02, 0.055].forEach((px) => sph(gtr, 0.008, COLORS.cream, px, 0.33, 0.092, null, { metalness: 0.2 }));
    box(gtr, 0.06, 0.9, 0.04, COLORS.black, 0, 1.2, 0);
    box(gtr, 0.1, 0.2, 0.04, COLORS.woodDark, 0, 1.75, 0);
    for (let string = 0; string < 6; string++) {
      const x = -0.023 + string * 0.0092;
      rodBetween(gtr, new THREE.Vector3(x, 0.45, 0.085), new THREE.Vector3(x, 1.84, 0.052), 0.0016, 0xd7d1c5, 5);
    }
    for (let fret = 0; fret < 7; fret++) {
      const y = 0.91 + fret * 0.105;
      rodBetween(gtr, new THREE.Vector3(-0.034, y, 0.058), new THREE.Vector3(0.034, y, 0.058), 0.004, COLORS.tan, 6);
    }
    [-1, 1].forEach((side) => {
      [1.65, 1.73, 1.81].forEach((y) => {
        rodBetween(gtr, new THREE.Vector3(side * 0.04, y, 0.02), new THREE.Vector3(side * 0.1, y, 0.02), 0.009, COLORS.tan, 8);
      });
    });
    root.add(gtr);
    animatedParts.guitar = gtr;

    // cardboard boxes stack
    box(root, 0.55, 0.4, 0.45, 0xb98b5e, 3.0, 0.2, -0.9).rotation.y = 0.2;
    box(root, 0.4, 0.3, 0.35, 0xc79a6b, 3.0, 0.55, -0.9).rotation.y = -0.1;
    box(root, 0.35, 0.25, 0.3, COLORS.cream, 3.05, 0.82, -0.9).rotation.y = 0.35;

    // floor book stacks
    [[-1.8, -2.4], [-1.9, -0.1]].forEach(([x, z], k) => {
      for (let i = 0; i < 4 + k; i++) {
        const book = box(root, 0.35 - i * 0.02, 0.07, 0.25, [COLORS.black, COLORS.cream, COLORS.tan, COLORS.coffee, COLORS.white][i], x, 0.04 + i * 0.075, z);
        book.rotation.y = i * 0.35;
        book.userData.reaction = "book";
        book.userData.mass = 2.2;
      }
    });
    // cup on the book stack
    cyl(root, 0.045, 0.04, 0.08, COLORS.white, -1.8, 0.38, -2.4);

    // shoes by the rug
    [[-0.9, -0.5, 0.3], [-0.72, -0.62, 0.5]].forEach(([x, z, r]) => {
      const s = box(root, 0.12, 0.08, 0.28, COLORS.black, x, 0.04, z); s.rotation.y = r;
      const t = box(root, 0.12, 0.03, 0.28, COLORS.white, x, 0.015, z); t.rotation.y = r;
    });

    // backpack leaning on the desk
    const bp = new THREE.Group();
    bp.position.set(-1.0, 0, -1.7);
    bp.rotation.y = 0.4;
    box(bp, 0.4, 0.55, 0.22, COLORS.black, 0, 0.28, 0);
    box(bp, 0.3, 0.25, 0.08, COLORS.coffee, 0, 0.2, 0.15);
    root.add(bp);

    // skateboard against wall
    const sk = box(root, 0.22, 0.8, 0.03, COLORS.woodDark, -3.2, 0.42, 2.7);
    sk.rotation.z = 0.0;
    sk.rotation.x = -0.12;
    [-0.25, 0.25].forEach((dy) => cyl(root, 0.04, 0.04, 0.24, COLORS.white, -3.2, 0.42 + dy, 2.74, {}, 8).rotation.z = Math.PI / 2);

    // waste bin with paper balls
    cyl(root, 0.18, 0.14, 0.4, COLORS.black, 1.9, 0.2, -1.7, {}, 14);
    [[0.04, 0.0], [-0.06, 0.05]].forEach(([dx, dz]) => sph(root, 0.06, COLORS.white, 1.9 + dx, 0.42, -1.7 + dz));
    sph(root, 0.05, COLORS.white, 1.6, 0.05, -1.4); // missed shot

    // pouf / floor cushions
    cyl(root, 0.3, 0.3, 0.3, COLORS.cream, 1.9, 0.15, 0.3, {}, 18);
    cyl(root, 0.32, 0.32, 0.06, COLORS.coffee, 1.9, 0.33, 0.3, {}, 18);
    box(root, 0.45, 0.12, 0.45, COLORS.black, 0.2, 0.07, 1.3).rotation.y = 0.4;
    box(root, 0.4, 0.1, 0.4, COLORS.tan, 0.55, 0.06, 1.0).rotation.y = -0.2;

    // small side table with record player
    const tbl = new THREE.Group();
    tbl.position.set(-0.4, 0, 2.3);
    cyl(tbl, 0.3, 0.3, 0.04, COLORS.woodDark, 0, 0.55, 0, {}, 18);
    [[0.15, 0.15], [-0.15, 0.15], [0.15, -0.15], [-0.15, -0.15]].forEach(([x, z]) => box(tbl, 0.03, 0.55, 0.03, COLORS.black, x, 0.27, z));
    box(tbl, 0.38, 0.06, 0.3, COLORS.black, 0, 0.61, 0);
    cyl(tbl, 0.11, 0.11, 0.01, 0x111111, 0, 0.65, 0, {}, 20);
    cyl(tbl, 0.03, 0.03, 0.012, COLORS.tan, 0, 0.655, 0, {}, 10);
    root.add(tbl);
    // vinyl records leaning
    [0, 1, 2].forEach((i) => box(root, 0.3, 0.3, 0.01, [COLORS.black, COLORS.cream, COLORS.coffee][i], -0.1 + i * 0.03, 0.18, 2.7).rotation.x = -0.1);
  }

  function buildDeskClutter() {
    const y = 1.06;
    // sticky-note stack and small desk calendar
    box(root, 0.34, 0.025, 0.28, COLORS.cream, -0.75, y + 0.012, -2.15).rotation.y = 0.12;
    box(root, 0.24, 0.06, 0.18, COLORS.coffee, -0.75, y + 0.055, -2.15).rotation.y = 0.12;
    for (let i = 0; i < 3; i++) {
      const tag = new THREE.Mesh(
        new THREE.PlaneGeometry(0.12, 0.12),
        makeMat([COLORS.pink, COLORS.lavender, COLORS.tan][i], { roughness: 1 })
      );
      tag.rotation.x = -Math.PI / 2;
      tag.rotation.z = (i - 1) * 0.08;
      tag.position.set(-0.82 + i * 0.07, y + 0.03, -2.08);
      root.add(tag);
    }

    // pencil cup
    cyl(root, 0.05, 0.045, 0.11, COLORS.black, 1.05, y + 0.06, -2.7);
    [0, 1, 2, 3].forEach((i) => {
      const p = box(root, 0.01, 0.16, 0.01, i % 2 ? COLORS.tan : COLORS.white, 1.05 + (i - 1.5) * 0.015, y + 0.17, -2.7);
      p.rotation.z = (i - 1.5) * 0.12;
    });
    // book stack + mug on top
    [[0.5, COLORS.black], [0.44, COLORS.cream], [0.4, COLORS.coffee]].forEach(([w, c], i) => {
      const book = box(root, w, 0.06, 0.32, c, 0.35, y + 0.06 + i * 0.065, -2.7);
      book.rotation.y = i * 0.15;
      book.userData.reaction = "book";
      book.userData.mass = 2.2;
    });
    cyl(root, 0.05, 0.045, 0.08, COLORS.white, 0.35, y + 0.24, -2.7);
    // desk plant
    cyl(root, 0.06, 0.05, 0.08, COLORS.white, -1.15, y + 0.05, -2.7);
    [0, 1, 2].forEach((i) => sph(root, 0.06, 0x55663f, -1.15 + (i - 1) * 0.04, y + 0.14 + i * 0.01, -2.7));
    // candle
    cyl(root, 0.04, 0.04, 0.06, COLORS.cream, 1.65, y + 0.04, -2.1);
    sph(root, 0.012, 0xffc766, 1.65, y + 0.1, -2.1, [0.7, 1.5, 0.7], { emissive: 0xffc766, emissiveIntensity: 1 });
    // headphones
    const hp = new THREE.Group();
    hp.position.set(1.0, y + 0.02, -2.0);
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.012, 12, 48, Math.PI), makeMat(COLORS.black));
    band.position.y = 0.0; hp.add(band);
    [-0.09, 0.09].forEach((dx) => cyl(hp, 0.04, 0.04, 0.03, COLORS.black, dx, 0, 0, {}, 10).rotation.z = Math.PI / 2);
    root.add(hp);
    // loose papers + notebook + pen
    [[-1.0, -2.1, 0.3], [-1.05, -2.0, -0.2]].forEach(([x, z, r], i) => {
      const paper = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.3), makeMat(COLORS.white, { roughness: 1 }));
      paper.rotation.set(-Math.PI / 2, 0, r);
      paper.position.set(x, y + 0.002 + i * 0.002, z);
      root.add(paper);
    });
    box(root, 0.2, 0.025, 0.28, COLORS.coffee, 1.3, y + 0.02, -2.0).rotation.y = -0.3;
    const notebookLines = [];
    const notebookAngle = -0.3;
    for (let i = 0; i < 4; i++) {
      const z = -0.09 + i * 0.055;
      const startX = 1.3 - 0.05 * Math.cos(notebookAngle) + z * Math.sin(notebookAngle);
      const endX = 1.3 + 0.05 * Math.cos(notebookAngle) + z * Math.sin(notebookAngle);
      const startZ = -2 + 0.05 * Math.sin(notebookAngle) + z * Math.cos(notebookAngle);
      const endZ = -2 - 0.05 * Math.sin(notebookAngle) + z * Math.cos(notebookAngle);
      notebookLines.push(
        new THREE.Vector3(startX, y + 0.034, startZ),
        new THREE.Vector3(endX, y + 0.034, endZ)
      );
    }
    const notebookGeometry = new THREE.BufferGeometry().setFromPoints(notebookLines);
    root.add(new THREE.LineSegments(notebookGeometry, new THREE.LineBasicMaterial({ color: 0xe1d1b9 })));
    box(root, 0.18, 0.01, 0.01, COLORS.black, 1.45, y + 0.04, -1.95).rotation.y = 0.8;
    // small speaker + cables
    box(root, 0.12, 0.2, 0.12, COLORS.black, -1.2, y + 0.12, -2.45);
    sph(root, 0.035, COLORS.grey, -1.2, y + 0.1, -2.38);
    // monitor-less sticky notes on wall above desk
    [[-0.15, 2.6], [0.1, 2.5], [0.35, 2.62]].forEach(([dx, yy], i) => {
      const n = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.16), makeMat([COLORS.cream, COLORS.tan, COLORS.white][i], { roughness: 1 }));
      n.position.set(0.2 + dx - 0.9 + 0.0, yy - 0.2 + 0.0, -2.93);
      n.rotation.z = (i - 1) * 0.15;
      root.add(n);
    });
  }
  // ---------------------------------------------------- clickable clutter
// [type, x, y, z, width, height, depth] invisible hit boxes over each item
const CLUTTER_HOTSPOTS = [
  ["guitar", 3.2, 0.95, -1.7, 0.5, 1.9, 0.25],
  ["floorlamp", 3.0, 0.95, 0.0, 0.6, 1.9, 0.6],
  ["basket", 2.7, 0.3, -1.2, 0.7, 0.6, 0.7],
  ["boxes", 3.0, 0.5, -0.9, 0.6, 1.0, 0.5],
  ["bookstack1", -1.8, 0.2, -2.4, 0.4, 0.45, 0.3],
  ["bookstack2", -1.9, 0.2, -0.1, 0.4, 0.5, 0.3],
  ["shoes", -0.8, 0.06, -0.55, 0.5, 0.14, 0.4],
  ["backpack", -1.0, 0.3, -1.7, 0.45, 0.6, 0.3],
  ["skateboard", -3.2, 0.42, 2.7, 0.3, 0.9, 0.3],
  ["bin", 1.9, 0.2, -1.7, 0.4, 0.45, 0.4],
  ["pouf", 1.9, 0.2, 0.3, 0.7, 0.45, 0.7],
  ["cushions", 0.4, 0.08, 1.15, 0.9, 0.2, 0.7],
  ["recordplayer", -0.4, 0.62, 2.3, 0.6, 0.25, 0.5],
  ["records", -0.05, 0.18, 2.7, 0.4, 0.35, 0.1],
  ["pencilcup", 1.05, 1.2, -2.7, 0.15, 0.25, 0.15],
  ["deskbooks", 0.35, 1.2, -2.7, 0.55, 0.35, 0.35],
  ["deskplant", -1.15, 1.2, -2.7, 0.2, 0.3, 0.2],
  ["candle", 1.65, 1.12, -2.1, 0.12, 0.14, 0.12],
  ["headphones", 1.0, 1.12, -2.0, 0.3, 0.15, 0.15],
  ["notebook", 1.3, 1.09, -2.0, 0.25, 0.08, 0.3],
  ["speaker", -1.2, 1.18, -2.45, 0.15, 0.25, 0.15],
  ["coffee", 0.85, 1.14, -2.55, 0.15, 0.12, 0.15],
  ["keyboard", -0.5, 1.08, -2.05, 0.4, 0.06, 0.18],
  ["clock", -1.6, 3.55, -2.93, 0.6, 0.6, 0.15],
  ["hooks", 2.95, 1.75, -2.9, 0.7, 0.7, 0.2],
  ["nightstand", -3.15, 0.6, 0.45, 0.5, 1.0, 0.5],
  ["bed", -2.3, 0.4, 1.6, 2.1, 0.5, 1.6],
  ["window", 1.7, 2.9, -2.9, 2.0, 2.0, 0.2],
  ["hangplant", -0.4, 3.6, -2.5, 0.3, 0.6, 0.3],
  ["stringlights", 0, 4.1, -2.9, 6.4, 0.35, 0.2],
  ["gallery", -3.44, 3.2, 1.75, 0.2, 1.0, 1.4],
  ["wallshelf", -3.33, 2.35, 1.6, 0.3, 0.4, 1.4],
  ["dogbowls", 0.35, 0.05, 2.2, 0.5, 0.1, 0.7],
];

function buildClutterHotspots() {
  CLUTTER_HOTSPOTS.forEach(([type, x, y, z, w, h, d]) => {
    const group = new THREE.Group();
    group.userData.type = type;
    group.position.set(x, y, z);

    const geo = new THREE.BoxGeometry(w, h, d);
    // invisible but still clickable
    group.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ visible: false })));

    // glowing outline shown on hover
    const outline = new THREE.LineSegments(
      new THREE.EdgesGeometry(geo),
      new THREE.LineBasicMaterial({ color: 0xffd9a0 })
    );
    outline.raycast = () => {}; // lines must not catch clicks
    outline.visible = false;
    group.add(outline);
    group.userData.outline = outline;

    root.add(group);
    interactiveObjects.push(group);
  });
}

  return { build };
})();