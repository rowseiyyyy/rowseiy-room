/**
 * room.js
 * Builds the cozy developer room out of simple Three.js primitives.
 * Interactive objects are wrapped in a THREE.Group with userData.type
 * so interactions.js can identify what was clicked/hovered via raycasting.
 */

const Room = (() => {
  const interactiveObjects = []; // groups with userData.type
  const animatedParts = {}; // references used by animations.js
  let root; // group holding entire room, so we can rotate slightly if desired

  const COLORS = {
    floor: 0xead9c4,
    wall: 0xf7ecdf,
    wallAccent: 0xf4dfe4,
    wood: 0xa97c58,
    woodDark: 0x8a6142,
    pink: 0xf4c9d6,
    sage: 0xb7c9b0,
    blue: 0xbcd8e8,
    lavender: 0xd9cdf0,
    cream: 0xfdf6ee,
  };

  function makeMat(color, opts = {}) {
    return new THREE.MeshStandardMaterial({ color, roughness: 0.8, metalness: 0.05, ...opts });
  }

  function build(scene) {
    root = new THREE.Group();
    scene.add(root);

    buildFloorAndWalls();
    buildWindow();
    buildDesk();
    buildChair();
    buildLaptop();
    buildBookshelf();
    buildConsole();
    buildPictureFrame();
    buildDeskNotes();
    buildPlants();
    buildCat();
    buildDeskLamp();
    buildPhone();
    buildDecorations();

    return { interactiveObjects, animatedParts, root };
  }

  function buildFloorAndWalls() {
    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(9, 48),
      makeMat(COLORS.floor, { roughness: 0.95 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    root.add(floor);

    const backWall = new THREE.Mesh(
      new THREE.PlaneGeometry(14, 7),
      makeMat(COLORS.wall)
    );
    backWall.position.set(0, 3.5, -4);
    backWall.receiveShadow = true;
    root.add(backWall);

    const sideWall = new THREE.Mesh(
      new THREE.PlaneGeometry(10, 7),
      makeMat(COLORS.wallAccent)
    );
    sideWall.rotation.y = Math.PI / 2;
    sideWall.position.set(-6, 3.5, 0);
    sideWall.receiveShadow = true;
    root.add(sideWall);

    // baseboard trim for a bit of coziness
    const trim = new THREE.Mesh(
      new THREE.BoxGeometry(14, 0.2, 0.1),
      makeMat(COLORS.woodDark)
    );
    trim.position.set(0, 0.1, -3.95);
    root.add(trim);
  }

  function buildWindow() {
    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(2.4, 2.4, 0.15),
      makeMat(COLORS.wood)
    );
    frame.position.set(2.2, 3.6, -3.92);
    root.add(frame);

    const glass = new THREE.Mesh(
      new THREE.PlaneGeometry(2.0, 2.0),
      new THREE.MeshStandardMaterial({ color: 0xdff0f5, transparent: true, opacity: 0.55, roughness: 0.1 })
    );
    glass.position.set(2.2, 3.6, -3.83);
    root.add(glass);

    // mullions
    const mV = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.0, 0.05), makeMat(COLORS.wood));
    mV.position.set(2.2, 3.6, -3.8);
    root.add(mV);
    const mH = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.08, 0.05), makeMat(COLORS.wood));
    mH.position.set(2.2, 3.6, -3.8);
    root.add(mH);

    // moon (hidden by day, shown at night by animations.js)
    const moon = new THREE.Mesh(
      new THREE.SphereGeometry(0.28, 16, 16),
      new THREE.MeshStandardMaterial({ color: 0xf5f0e6, emissive: 0xf5f0e6, emissiveIntensity: 0.6 })
    );
    moon.position.set(2.6, 4.0, -3.75);
    moon.visible = false;
    root.add(moon);
    animatedParts.moon = moon;

    // simple stars (points), hidden by day
    const starGeo = new THREE.BufferGeometry();
    const starCount = 40;
    const positions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      positions[i * 3] = 1.4 + Math.random() * 1.5;
      positions[i * 3 + 1] = 2.8 + Math.random() * 1.6;
      positions[i * 3 + 2] = -3.78;
    }
    starGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const stars = new THREE.Points(
      starGeo,
      new THREE.PointsMaterial({ color: 0xffffff, size: 0.035, transparent: true, opacity: 0.9 })
    );
    stars.visible = false;
    root.add(stars);
    animatedParts.stars = stars;
  }

  function buildDesk() {
    const deskGroup = new THREE.Group();
    deskGroup.position.set(0.6, 0, -1.6);

    const top = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.12, 1.3), makeMat(COLORS.wood));
    top.position.y = 1.0;
    top.castShadow = true;
    top.receiveShadow = true;
    deskGroup.add(top);

    const legGeo = new THREE.BoxGeometry(0.1, 1.0, 0.1);
    const legPositions = [
      [-1.3, 0.5, -0.55], [1.3, 0.5, -0.55], [-1.3, 0.5, 0.55], [1.3, 0.5, 0.55],
    ];
    legPositions.forEach(([x, y, z]) => {
      const leg = new THREE.Mesh(legGeo, makeMat(COLORS.woodDark));
      leg.position.set(x, y, z);
      leg.castShadow = true;
      deskGroup.add(leg);
    });

    root.add(deskGroup);
  }

  function buildChair() {
    const chair = new THREE.Group();
    chair.position.set(0.6, 0, 0.6);

    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.1, 0.7), makeMat(COLORS.sage));
    seat.position.y = 0.55;
    seat.castShadow = true;
    chair.add(seat);

    const back = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 0.1), makeMat(COLORS.sage));
    back.position.set(0, 0.9, 0.3);
    back.castShadow = true;
    chair.add(back);

    const legGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.55, 8);
    [[-0.28, -0.28], [0.28, -0.28], [-0.28, 0.28], [0.28, 0.28]].forEach(([x, z]) => {
      const leg = new THREE.Mesh(legGeo, makeMat(COLORS.woodDark));
      leg.position.set(x, 0.28, z);
      chair.add(leg);
    });

    root.add(chair);
  }

  function buildLaptop() {
    const group = new THREE.Group();
    group.userData.type = "laptop";
    group.position.set(-0.2, 1.06, -1.75);

    const base = new THREE.Mesh(
      new THREE.BoxGeometry(0.65, 0.04, 0.45),
      makeMat(0x9aa5b1, { metalness: 0.3, roughness: 0.5 })
    );
    base.castShadow = true;
    group.add(base);

    const screen = new THREE.Mesh(
      new THREE.BoxGeometry(0.65, 0.42, 0.03),
      makeMat(0x9aa5b1, { metalness: 0.3, roughness: 0.5 })
    );
    screen.position.set(0, 0.21, -0.21);
    screen.rotation.x = -0.35;
    screen.castShadow = true;
    group.add(screen);

    const glow = new THREE.Mesh(
      new THREE.PlaneGeometry(0.55, 0.34),
      new THREE.MeshStandardMaterial({
        color: 0xbcd8e8, emissive: 0xbcd8e8, emissiveIntensity: 0.5, side: THREE.DoubleSide,
      })
    );
    glow.position.set(0, 0.21, -0.19);
    glow.rotation.x = -0.35;
    group.add(glow);
    animatedParts.laptopScreen = glow;

    root.add(group);
    interactiveObjects.push(group);
  }

  function buildBookshelf() {
    const group = new THREE.Group();
    group.userData.type = "bookshelf";
    // Placed flat against the back wall (rather than the side wall) so its
    // shelves and books face the camera directly instead of being seen edge-on.
    group.position.set(-4.3, 0, -3.65);

    const frame = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.6, 0.35), makeMat(COLORS.woodDark));
    frame.position.y = 1.3;
    frame.castShadow = true;
    group.add(frame);

    const shelfColors = [COLORS.pink, COLORS.sage, COLORS.blue, COLORS.lavender];
    for (let row = 0; row < 3; row++) {
      const shelfY = 0.55 + row * 0.75;
      const shelf = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.05, 0.3), makeMat(COLORS.wood));
      shelf.position.set(0, shelfY, 0);
      group.add(shelf);

      // little book stack per shelf
      let offset = -0.6;
      for (let b = 0; b < 4; b++) {
        const w = 0.14 + Math.random() * 0.06;
        const h = 0.25 + Math.random() * 0.15;
        const book = new THREE.Mesh(
          new THREE.BoxGeometry(w, h, 0.22),
          makeMat(shelfColors[(row + b) % shelfColors.length])
        );
        book.position.set(offset + w / 2, shelfY + h / 2 + 0.03, 0);
        book.castShadow = true;
        group.add(book);
        offset += w + 0.04;
      }
    }

    root.add(group);
    interactiveObjects.push(group);
  }

  function buildConsole() {
    const group = new THREE.Group();
    group.userData.type = "console";
    group.position.set(1.7, 1.06, -1.55);

    const body = new THREE.Mesh(
      new THREE.BoxGeometry(0.32, 0.08, 0.2),
      makeMat(0x6b6b6b, { metalness: 0.4, roughness: 0.4 })
    );
    body.castShadow = true;
    group.add(body);

    const screenGlow = new THREE.Mesh(
      new THREE.PlaneGeometry(0.24, 0.04),
      new THREE.MeshStandardMaterial({ color: 0xf4c9d6, emissive: 0xf4c9d6, emissiveIntensity: 0.4 })
    );
    screenGlow.rotation.x = -Math.PI / 2;
    screenGlow.position.y = 0.041;
    group.add(screenGlow);

    root.add(group);
    interactiveObjects.push(group);
  }

  function buildPictureFrame() {
    const group = new THREE.Group();
    group.userData.type = "frame";
    group.position.set(-2.6, 3.0, -3.9);

    const frame = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.3, 0.08), makeMat(COLORS.woodDark));
    group.add(frame);

    const pic = new THREE.Mesh(
      new THREE.PlaneGeometry(0.85, 1.15),
      makeMat(COLORS.pink, { roughness: 1 })
    );
    pic.position.z = 0.05;
    group.add(pic);

    root.add(group);
    interactiveObjects.push(group);
  }

  function buildDeskNotes() {
    const group = new THREE.Group();
    group.userData.type = "notes";
    group.position.set(0.6, 1.07, -1.35);

    const colors = [COLORS.lavender, COLORS.pink, COLORS.blue];
    colors.forEach((c, i) => {
      const note = new THREE.Mesh(
        new THREE.PlaneGeometry(0.2, 0.2),
        makeMat(c, { roughness: 1 })
      );
      note.rotation.x = -Math.PI / 2;
      note.rotation.z = (i - 1) * 0.25;
      note.position.set((i - 1) * 0.16, 0.001, i * 0.05);
      group.add(note);
    });

    root.add(group);
    interactiveObjects.push(group);
  }

  function buildPlants() {
    const group = new THREE.Group();
    group.userData.type = "plants";
    group.position.set(2.7, 0, -3.3);

    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.16, 0.3, 12), makeMat(COLORS.woodDark));
    pot.position.y = 0.15;
    pot.castShadow = true;
    group.add(pot);

    const leafMat = makeMat(COLORS.sage);
    const leafGroup = new THREE.Group();
    for (let i = 0; i < 5; i++) {
      const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 8), leafMat);
      const angle = (i / 5) * Math.PI * 2;
      leaf.position.set(Math.cos(angle) * 0.12, 0.5 + Math.random() * 0.15, Math.sin(angle) * 0.12);
      leaf.castShadow = true;
      leafGroup.add(leaf);
    }
    group.add(leafGroup);
    animatedParts.plantLeaves = leafGroup;

    root.add(group);
    interactiveObjects.push(group);
  }

  function buildCat() {
    const group = new THREE.Group();
    group.userData.type = "cat";
    group.position.set(-1.8, 0, 1.6);

    const catMat = makeMat(0xe8a97a);
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 12), catMat);
    body.scale.set(1.2, 0.9, 1);
    body.position.y = 0.22;
    body.castShadow = true;
    group.add(body);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.15, 12, 12), catMat);
    head.position.set(0, 0.38, 0.2);
    head.castShadow = true;
    group.add(head);

    const earGeo = new THREE.ConeGeometry(0.05, 0.09, 8);
    [-0.08, 0.08].forEach((x) => {
      const ear = new THREE.Mesh(earGeo, catMat);
      ear.position.set(x, 0.48, 0.2);
      ear.rotation.x = -0.2;
      group.add(ear);
    });

    const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.03, 0.35, 8), catMat);
    tail.position.set(0, 0.3, -0.28);
    tail.rotation.x = 0.9;
    group.add(tail);
    animatedParts.catTail = tail;
    animatedParts.catHead = head;
    animatedParts.catGroup = group;

    // simple closed-eye "blink" plane, hidden by default
    const eyeLidGeo = new THREE.PlaneGeometry(0.14, 0.03);
    const eyeLid = new THREE.Mesh(eyeLidGeo, makeMat(0x4a3f38));
    eyeLid.position.set(0, 0.4, 0.34);
    eyeLid.visible = false;
    group.add(eyeLid);
    animatedParts.catBlink = eyeLid;

    root.add(group);
    interactiveObjects.push(group);
  }

  function buildDeskLamp() {
    const group = new THREE.Group();
    group.position.set(1.6, 1.06, -1.9);

    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.03, 12), makeMat(COLORS.woodDark));
    group.add(base);

    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.5, 8), makeMat(0x8a8a8a));
    arm.position.y = 0.25;
    arm.rotation.z = 0.3;
    group.add(arm);

    const shade = new THREE.Mesh(
      new THREE.ConeGeometry(0.12, 0.16, 12, 1, true),
      makeMat(COLORS.pink, { side: THREE.DoubleSide })
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
    group.position.set(0.05, 1.065, -1.45);
    group.rotation.x = -Math.PI / 2;

    const body = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 0.2, 0.01),
      makeMat(0x3d3d3d, { metalness: 0.5, roughness: 0.3 })
    );
    group.add(body);

    const screen = new THREE.Mesh(
      new THREE.PlaneGeometry(0.08, 0.17),
      new THREE.MeshStandardMaterial({ color: 0xbcd8e8, emissive: 0xbcd8e8, emissiveIntensity: 0.25 })
    );
    screen.position.z = 0.006;
    group.add(screen);

    root.add(group);
    interactiveObjects.push(group);
  }

  function buildDecorations() {
    // coffee cup
    const cup = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.05, 0.09, 12),
      makeMat(COLORS.cream)
    );
    cup.position.set(1.15, 1.1, -1.85);
    cup.castShadow = true;
    root.add(cup);

    // keyboard
    const keyboard = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, 0.02, 0.14),
      makeMat(0xd8d0c5)
    );
    keyboard.position.set(-0.2, 1.065, -1.35);
    root.add(keyboard);

    // mouse
    const mouse = new THREE.Mesh(
      new THREE.SphereGeometry(0.04, 8, 8),
      makeMat(0xd8d0c5)
    );
    mouse.scale.set(1, 0.6, 1.4);
    mouse.position.set(0.25, 1.07, -1.35);
    root.add(mouse);

    // small rug for coziness
    const rug = new THREE.Mesh(
      new THREE.CircleGeometry(1.4, 32),
      makeMat(COLORS.pink, { roughness: 1 })
    );
    rug.rotation.x = -Math.PI / 2;
    rug.position.set(0.6, 0.01, 0.6);
    rug.receiveShadow = true;
    root.add(rug);

    // resting nook / small bed shape in the corner
    const bed = new THREE.Mesh(
      new THREE.CylinderGeometry(0.9, 0.9, 0.15, 20),
      makeMat(COLORS.lavender, { roughness: 1 })
    );
    bed.position.set(-2.6, 0.075, 2.6);
    bed.receiveShadow = true;
    root.add(bed);

    // gentle floating dust/sparkle particles — skipped on low-power devices
    if (!(typeof RoomScene !== "undefined" && RoomScene.isLowPower)) {
      const sparkleCount = 26;
      const sparkleGeo = new THREE.BufferGeometry();
      const sparklePositions = new Float32Array(sparkleCount * 3);
      for (let i = 0; i < sparkleCount; i++) {
        sparklePositions[i * 3] = -4 + Math.random() * 7;
        sparklePositions[i * 3 + 1] = 0.3 + Math.random() * 3.2;
        sparklePositions[i * 3 + 2] = -3 + Math.random() * 6;
      }
      sparkleGeo.setAttribute("position", new THREE.BufferAttribute(sparklePositions, 3));
      const sparkles = new THREE.Points(
        sparkleGeo,
        new THREE.PointsMaterial({ color: 0xfff3e0, size: 0.02, transparent: true, opacity: 0.5 })
      );
      root.add(sparkles);
      animatedParts.sparkles = sparkles;
    }
  }

  return { build };
})();