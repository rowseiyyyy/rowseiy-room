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
    t.anisotropy = 16;
    return color ? srgb(t) : t;
  }

  // ---------- textures ----------
  function woodFloor() {
    return canvasTex(1024, 1024, (ctx, w, h) => {
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
    return canvasTex(512, 512, (ctx, w, h) => {
      ctx.fillStyle = hex;
      ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 90; i++) { // soft blotches
        const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 40 + Math.random() * 80);
        const light = Math.random() > 0.5;
        g.addColorStop(0, light ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)");
        g.addColorStop(1, "rgba(0,0,0,0)");
        ctx.save();
        ctx.translate(Math.random() * w, Math.random() * h);
        ctx.fillStyle = g;
        ctx.fillRect(-120, -120, 240, 240);
        ctx.restore();
      }
      const img = ctx.getImageData(0, 0, w, h); // fine grain
      for (let i = 0; i < img.data.length; i += 4) {
        const n = (Math.random() - 0.5) * 14;
        img.data[i] += n; img.data[i + 1] += n; img.data[i + 2] += n;
      }
      ctx.putImageData(img, 0, 0);
    });
  }

  function roughnessNoise() {
    return canvasTex(256, 256, (ctx, w, h) => {
      const img = ctx.createImageData(w, h);
      for (let i = 0; i < img.data.length; i += 4) {
        const v = 175 + Math.random() * 80;
        img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
        img.data[i + 3] = 255;
      }
      ctx.putImageData(img, 0, 0);
    }, false);
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
    const key = [w, h, d, r].map((n) => n.toFixed(4)).join();
    if (cache[key]) return cache[key];
    const g = new THREE.BoxGeometry(w, h, d, 8, 8, 8);
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
    const rough = roughnessNoise();
    const floorTex = woodFloor();
    const backTex = plaster("#efe6d8"); backTex.repeat.set(2.5, 1.6);
    const sideTex = plaster("#4b433c"); sideTex.repeat.set(2, 1.6); // lighter than the old near-black

    root.traverse((o) => {
      if (!o.isMesh || !o.material || o.material.isMeshBasicMaterial || o.material.isShadowMaterial) return;
      const g = o.geometry, m = o.material, p = g.parameters || {};

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
    const slab = (w, h, d, x, y, z, color) => {
      const m = new THREE.Mesh(roundedBox(w, h, d, 0.02), new THREE.MeshStandardMaterial({ color, roughness: 0.85 }));
      m.userData.structural = true;
      m.position.set(x, y, z);
      m.castShadow = m.receiveShadow = true;
      root.add(m);
    };
    slab(7.18, 4.4, 0.18, -0.09, 2.2, -3.13, 0xe9dfcf);  // back wall thickness
    slab(0.18, 4.4, 5.98, -3.63, 2.2, -0.19, 0x3a322c);  // side wall thickness
    slab(7.18, 0.38, 5.98, -0.09, -0.21, -0.19, 0x3a2a1d); // floor slab

    const ground = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.ShadowMaterial({ opacity: 0.22 }));
    ground.userData.structural = true;
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.41;
    ground.receiveShadow = true;
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