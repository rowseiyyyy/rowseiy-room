/**
 * realism.js  (new file)
 * Post-processes the room that room.js builds, so you do not have to rewrite room.js:
 *  - real wood-plank floor + plaster walls (generated in code, no image files)
 *  - rounded, light-catching edges on every box
 *  - every mesh casts AND receives shadows
 *  - soft contact shadows under furniture + dark corners where walls meet the floor
 *  - thick cut-away walls and a floor slab, so the room looks like a real diorama
 *
 * Load AFTER room.js. Call once:  Realism.apply(root, RoomScene);
 */

const Realism = (() => {
  let maxAnisotropy = 16;
  let bevelSegments = 12;
  let textureScale = 1;
  const textureSize = (size) => Math.max(128, Math.round(size * textureScale));

  const srgb = (t) => {
    if ("colorSpace" in t) t.colorSpace = THREE.SRGBColorSpace;
    else t.encoding = THREE.sRGBEncoding;
    return t;
  };

  function canvasTex(w, h, draw, color = true) {
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    draw(c.getContext("2d"), w, h);
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = maxAnisotropy;
    return color ? srgb(t) : t;
  }

  // ---------- textures ----------
  function woodFloor() {
    const size = textureSize(2048);
    return canvasTex(size, size, (ctx, w, h) => {
      ctx.fillStyle = "#1e140d"; // dark gaps between planks
      ctx.fillRect(0, 0, w, h);
      const planks = 8, pw = w / planks;
      for (let i = 0; i < planks; i++) {
        let y = -Math.random() * h * 0.3;
        while (y < h) {
          const len = h * (0.25 + Math.random() * 0.35);
          const v = (Math.random() - 0.5) * 30;
          ctx.fillStyle = `rgb(${82 + v},${58 + v * 0.8},${42 + v * 0.6})`;
          ctx.fillRect(i * pw + 1.5, y + 1.5, pw - 3, len - 3);
          for (let g = 0; g < 28; g++) { // grain
            ctx.strokeStyle = `rgba(25,12,6,${0.05 + Math.random() * 0.09})`;
            ctx.lineWidth = 0.5 + Math.random() * 1.5;
            const gx = i * pw + 4 + Math.random() * (pw - 8);
            ctx.beginPath();
            ctx.moveTo(gx, y + 2);
            ctx.bezierCurveTo(gx + 4, y + len * 0.3, gx - 4, y + len * 0.6, gx + 1, y + len - 2);
            ctx.stroke();
          }
          y += len;
        }
      }
    });
  }

  function plaster(hex) {
    const size = textureSize(1024);
    return canvasTex(size, size, (ctx, w, h) => {
      ctx.fillStyle = hex;
      ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 1800; i++) {
        const shade = Math.random() > 0.5 ? 255 : 40;
        ctx.fillStyle = `rgba(${shade},${shade},${shade},${0.008 + Math.random() * 0.018})`;
        ctx.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 2, 1 + Math.random() * 2);
      }
      const img = ctx.getImageData(0, 0, w, h); // fine grain
      for (let i = 0; i < img.data.length; i += 4) {
        const n = (Math.random() - 0.5) * 7;
        img.data[i] += n; img.data[i + 1] += n; img.data[i + 2] += n;
      }
      ctx.putImageData(img, 0, 0);
    });
  }

  function roughnessNoise() {
    const size = textureSize(512);
    return canvasTex(size, size, (ctx, w, h) => {
      const img = ctx.createImageData(w, h);
      for (let i = 0; i < img.data.length; i += 4) {
        const v = 175 + Math.random() * 80;
        img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
        img.data[i + 3] = 255;
      }
      ctx.putImageData(img, 0, 0);
    }, false);
  }

  function fabricWeave(color = true) {
    const size = textureSize(1024);
    return canvasTex(size, size, (ctx, w, h) => {
      ctx.fillStyle = color ? "#ede9e0" : "#808080";
      ctx.fillRect(0, 0, w, h);
      for (let y = 0; y < h; y += 7) {
        ctx.fillStyle = color ? "rgba(255,255,255,0.12)" : "rgba(245,245,245,0.36)";
        ctx.fillRect(0, y, w, 2);
      }
      for (let x = 0; x < w; x += 7) {
        ctx.fillStyle = color ? "rgba(75,68,58,0.055)" : "rgba(35,35,35,0.26)";
        ctx.fillRect(x, 0, 2, h);
      }
    }, color);
  }

  function furGrain(color = true) {
    const size = textureSize(1024);
    return canvasTex(size, size, (ctx, w, h) => {
      ctx.fillStyle = color ? "#eee9e0" : "#808080";
      ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 2500; i++) {
        const x = Math.random() * w;
        const y = Math.random() * h;
        const light = Math.random() > 0.5;
        const shade = color
          ? `rgba(${light ? "255,252,244" : "66,58,49"},${0.025 + Math.random() * 0.055})`
          : `rgba(${light ? "255,255,255" : "35,35,35"},0.18)`;
        ctx.strokeStyle = shade;
        ctx.lineWidth = color ? 0.6 + Math.random() * 1.1 : 1;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.quadraticCurveTo(x + Math.random() * 3 - 1.5, y + 3, x + Math.random() * 2 - 1, y + 7 + Math.random() * 5);
        ctx.stroke();
      }
    }, color);
  }

  function woodGrain(color = true) {
    const size = textureSize(1024);
    return canvasTex(size, size, (ctx, w, h) => {
      ctx.fillStyle = color ? "#e8e1d7" : "#808080";
      ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 180; i++) {
        const y = Math.random() * h;
        const shade = Math.random() > 0.5 ? 46 : 255;
        const alpha = color ? 0.025 + Math.random() * 0.045 : 0.12 + Math.random() * 0.18;
        ctx.strokeStyle = `rgba(${shade},${shade},${shade},${alpha})`;
        ctx.lineWidth = 0.5 + Math.random() * (color ? 1.4 : 2);
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.bezierCurveTo(w * 0.28, y - 5 + Math.random() * 10, w * 0.68, y - 5 + Math.random() * 10, w, y);
        ctx.stroke();
      }
      for (let i = 0; i < 5; i++) {
        const x = Math.random() * w;
        const y = Math.random() * h;
        ctx.strokeStyle = color ? "rgba(58,38,22,0.07)" : "rgba(25,25,25,0.3)";
        ctx.lineWidth = 1;
        for (let ring = 0; ring < 3; ring++) {
          ctx.beginPath();
          ctx.ellipse(x, y, 4 + ring * 3, 2 + ring * 1.4, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
    }, color);
  }

  function blobTex() {
    return canvasTex(128, 128, (ctx, w, h) => {
      const g = ctx.createRadialGradient(w / 2, h / 2, 4, w / 2, h / 2, w / 2);
      g.addColorStop(0, "rgba(0,0,0,0.55)");
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    }, false);
  }

  function gradientStrip(vertical) {
    return canvasTex(8, 128, (ctx, w, h) => {
      const g = ctx.createLinearGradient(0, h, 0, 0);
      g.addColorStop(0, "rgba(0,0,0,0.5)");
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    }, false);
  }

  // ---------- rounded box (soft, light-catching edges) ----------
  const cache = {};
  function roundedBox(w, h, d, r = 0.016) {
    r = Math.min(r, Math.min(w, h, d) * 0.45);
    const key = [w, h, d, r, bevelSegments].map((n) => n.toFixed(4)).join();
    if (cache[key]) return cache[key];
    const g = new THREE.BoxGeometry(w, h, d, bevelSegments, bevelSegments, bevelSegments);
    const pos = g.attributes.position, nor = g.attributes.normal;
    const hx = w / 2 - r, hy = h / 2 - r, hz = d / 2 - r;
    const v = new THREE.Vector3(), c = new THREE.Vector3(), n = new THREE.Vector3();
    const cl = THREE.MathUtils.clamp;
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      c.set(cl(v.x, -hx, hx), cl(v.y, -hy, hy), cl(v.z, -hz, hz));
      n.copy(v).sub(c);
      if (n.lengthSq() > 1e-12) {
        n.normalize();
        v.copy(c).addScaledVector(n, r);
        pos.setXYZ(i, v.x, v.y, v.z);
        nor.setXYZ(i, n.x, n.y, n.z);
      }
    }
    return (cache[key] = g);
  }

  // ---------- main pass ----------
  function apply(root, S) {
    maxAnisotropy = Math.min(16, S.renderer.capabilities.getMaxAnisotropy());
    bevelSegments = S.isMobile ? 8 : 12;
    textureScale = S.isMobile ? 0.5 : 1;
    const rough = roughnessNoise();
    const floorTex = woodFloor();
    const woodTex = woodGrain();
    const woodBump = woodGrain(false);
    const fabricTex = fabricWeave();
    const fabricBump = fabricWeave(false);
    const furTex = furGrain();
    const furBump = furGrain(false);
    const backTex = plaster("#efe6d8"); backTex.repeat.set(2.5, 1.6);
    const sideTex = plaster("#665144"); sideTex.repeat.set(2, 1.6);

    root.traverse((o) => {
      if (!o.isMesh || !o.material || o.material.isMeshBasicMaterial || o.material.isShadowMaterial) return;
      const g = o.geometry, m = o.material, p = g.parameters || {};

      const surface = m.userData && m.userData.surface;
      if (surface === "fabric" || surface === "woven" || surface === "fur") {
        m.map = surface === "fur" ? furTex : fabricTex;
        m.bumpMap = surface === "fur" ? furBump : fabricBump;
        m.bumpScale = surface === "fur" ? 0.009 : 0.006;
        m.roughness = 0.96;
        m.needsUpdate = true;
      }

      if (
        m.isMeshStandardMaterial &&
        !m.map &&
        [0x8a5e3b, 0x3f2a1b, 0x6f4a32].includes(m.color.getHex()) &&
        (g.type === "BoxGeometry" || g.type === "CylinderGeometry")
      ) {
        m.map = woodTex;
        m.bumpMap = woodBump;
        m.bumpScale = 0.008;
        m.needsUpdate = true;
      }

      if (g.type === "PlaneGeometry") {
        if (p.width === 7 && p.height === 5.8) {            // floor
          o.userData.structural = true;
          floorTex.repeat.set(4, 4);
          m.map = floorTex; m.color.set(0xffffff); m.roughness = 0.7; m.roughnessMap = rough; m.needsUpdate = true;
          m.polygonOffset = true;
          m.polygonOffsetFactor = 1;
          m.polygonOffsetUnits = 1;
        } else if (p.width === 7 && p.height === 4.4) {      // back wall
          o.userData.structural = true;
          backTex.repeat.set(3, 2);
          m.map = backTex; m.color.set(0xffffff); m.roughness = 0.95; m.needsUpdate = true;
          m.polygonOffset = true;
          m.polygonOffsetFactor = 1;
          m.polygonOffsetUnits = 1;
        } else if (p.width === 5.8 && p.height === 4.4) {    // side wall
          o.userData.structural = true;
          sideTex.repeat.set(3, 2);
          m.map = sideTex; m.color.set(0xffffff); m.roughness = 0.95; m.needsUpdate = true;
          m.polygonOffset = true;
          m.polygonOffsetFactor = 1;
          m.polygonOffsetUnits = 1;
        } else if (p.width === 0.02 && p.height === 5.8) {   // old plank lines, now in the texture
          o.visible = false;
        }
        o.receiveShadow = !(p.height === 4.4); // walls skip shadow maps, which removes the stripes
        return;
      }

      if (g.type === "BoxGeometry" && !(g.parameters.widthSegments > 1)) {
        const isWindowBlock = p.width === 2 && p.height === 2 && p.depth === 0.15;
        o.geometry = roundedBox(p.width, p.height, p.depth);
        g.dispose();
        o.castShadow = !isWindowBlock; // lets window light through the frame, mullions still cast
      } else if (!m.transparent) {
        o.castShadow = true;
      }

      o.receiveShadow = !m.transparent;
      if (!m.transparent && m.isMeshStandardMaterial && !m.roughnessMap) {
        m.roughnessMap = rough;
        if (!S.hasEnvIntensity) m.envMapIntensity = 0.35;
        m.needsUpdate = true;
      }
    });

    addDioramaBase(root);
    addContactShadows(root);
    addCornerAO(root);
  }

  function addDioramaBase(root) {
    const slab = (w, h, d, x, y, z, color, castsShadow = true) => {
      const m = new THREE.Mesh(roundedBox(w, h, d, 0.02), new THREE.MeshStandardMaterial({ color, roughness: 0.85 }));
      m.userData.structural = true;
      m.position.set(x, y, z);
      m.castShadow = castsShadow;
      m.receiveShadow = true;
      root.add(m);
    };
    // Keep the cutaway shell from casting a room-sized silhouette outside.
    slab(7.18, 4.4, 0.18, -0.09, 2.2, -3.13, 0xe9dfcf, false);  // back wall thickness
    slab(0.18, 4.4, 5.98, -3.63, 2.2, -0.19, 0x3a322c, false);  // side wall thickness
    slab(7.18, 0.38, 5.98, -0.09, -0.21, -0.19, 0x3a2a1d, false); // floor slab

    const ground = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.ShadowMaterial({ opacity: 0.22 }));
    ground.userData.structural = true;
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.41;
    // Props cast onto the room floor instead of creating large exterior shadows.
    ground.receiveShadow = false;
    root.add(ground);
  }

  function addContactShadows(root) {
    const map = blobTex();
    // [x, z, width, depth, opacity]
    [
      [0.3, -2.3, 3.2, 1.7, 0.9], [-2.3, 1.6, 2.6, 2.1, 0.9], [-2.6, -2.8, 2.1, 0.9, 0.8],
      [-3.1, -1.1, 0.9, 2.1, 0.8], [0.3, -1.0, 1.0, 1.0, 0.7], [-3.15, 0.45, 0.8, 0.8, 0.7],
      [1.3, 1.7, 1.9, 1.9, 0.7], [3.0, 0.0, 0.7, 0.7, 0.6], [2.7, -1.2, 0.9, 0.9, 0.7],
      [3.0, -0.9, 0.9, 0.8, 0.7], [1.9, 0.3, 0.9, 0.9, 0.6], [1.9, -1.7, 0.6, 0.6, 0.6],
      [2.9, -2.5, 0.7, 0.7, 0.6], [-0.4, 2.3, 0.8, 0.8, 0.6], [-1.0, -1.7, 0.7, 0.5, 0.6],
    ].forEach(([x, z, w, d, op]) => {
      const m = new THREE.Mesh(
        new THREE.PlaneGeometry(w, d),
        new THREE.MeshBasicMaterial({ map, transparent: true, opacity: op, depthWrite: false })
      );
      m.userData.structural = true;
      m.rotation.x = -Math.PI / 2;
      m.position.set(x, 0.004, z);
      m.renderOrder = 1;
      root.add(m);
    });
  }

  function addCornerAO(root) {
    const map = gradientStrip();
    const mat = () => new THREE.MeshBasicMaterial({ map, transparent: true, depthWrite: false });
    const back = new THREE.Mesh(new THREE.PlaneGeometry(7, 1.0), mat());
    back.userData.structural = true;
    back.position.set(0, 0.5, -2.93);
    const side = new THREE.Mesh(new THREE.PlaneGeometry(5.8, 1.0), mat());
    side.userData.structural = true;
    side.rotation.y = Math.PI / 2;
    side.position.set(-3.39, 0.5, -0.1);
    root.add(back, side);
  }

  return { apply };
})();