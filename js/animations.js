/**
 * animations.js
 * Lightweight idle animations (plants, cat, lamp glow) and the
 * day/night transition. Respects prefers-reduced-motion.
 */

const Animations = (() => {
  let animatedParts = {};
  let lights = {};
  let scene;
  let clock = new THREE.Clock();
  let isNight = false;
  let reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // cat state machine
  const CAT_STATES = ["sitting", "blinking", "lookAround", "walking", "sleeping"];
  let catState = "sitting";
  let catStateTimer = 0;
  let catWalkTarget = new THREE.Vector3();

  function init({ animatedParts: parts, lights: sceneLights, scene: scn }) {
    animatedParts = parts;
    lights = sceneLights;
    scene = scn;
    scheduleNextCatState(2 + Math.random() * 3);

    window.matchMedia("(prefers-reduced-motion: reduce)").addEventListener("change", (e) => {
      reducedMotion = e.matches;
    });
  }

  function scheduleNextCatState(delay) {
    catStateTimer = delay;
  }

  function pickNextCatState() {
    // at night, heavily favor sleeping
    if (isNight && Math.random() < 0.65) return "sleeping";
    const pool = ["sitting", "blinking", "lookAround", "walking"];
    return pool[Math.floor(Math.random() * pool.length)];
  }

  function updateCat(delta) {
    if (!animatedParts.catGroup) return;
    const { catGroup, catTail, catHead, catBlink } = animatedParts;

    catStateTimer -= delta;
    if (catStateTimer <= 0) {
      catState = pickNextCatState();
      catStateTimer = catState === "walking" ? 2.5 : 1.5 + Math.random() * 2.5;

      if (catState === "walking") {
        catWalkTarget.set(
          -2.5 + Math.random() * 2,
          0,
          1.0 + Math.random() * 1.5
        );
      }
      if (catBlink) catBlink.visible = catState === "blinking" || catState === "sleeping";
    }

    if (reducedMotion) return; // keep pose but skip continuous motion

    if (catTail) {
      catTail.rotation.z = Math.sin(clock.elapsedTime * 2) * 0.15;
    }

    if (catState === "lookAround" && catHead) {
      catHead.rotation.y = Math.sin(clock.elapsedTime * 1.5) * 0.4;
    } else if (catHead) {
      catHead.rotation.y *= 0.9;
    }

    if (catState === "walking") {
      const dir = catWalkTarget.clone().sub(catGroup.position);
      dir.y = 0;
      if (dir.length() > 0.05) {
        dir.normalize();
        catGroup.position.addScaledVector(dir, delta * 0.6);
        catGroup.rotation.y = Math.atan2(dir.x, dir.z);
      }
    }

    if (catState === "sleeping") {
      catGroup.rotation.x = 0.3;
      catGroup.position.y = -0.05;
    } else {
      catGroup.rotation.x *= 0.9;
      catGroup.position.y *= 0.9;
    }
  }

  function updateAmbient(delta) {
    if (reducedMotion) return;
    const t = clock.elapsedTime;

    if (animatedParts.plantLeaves) {
      animatedParts.plantLeaves.rotation.z = Math.sin(t * 0.8) * 0.03;
      animatedParts.plantLeaves.rotation.x = Math.cos(t * 0.6) * 0.02;
    }

    if (animatedParts.laptopScreen) {
      const pulse = 0.45 + Math.sin(t * 1.2) * 0.08;
      animatedParts.laptopScreen.material.emissiveIntensity = pulse;
    }

    if (lights.lamp && isNight) {
  lights.lamp.intensity = lights.lamp.userData.base * (0.97 + Math.sin(t * 3) * 0.03);
}
    if (animatedParts.sparkles) {
      const positions = animatedParts.sparkles.geometry.attributes.position;
      for (let i = 0; i < positions.count; i++) {
        let y = positions.getY(i) + delta * 0.05;
        if (y > 3.6) y = 0.3; // loop back to the floor once it drifts too high
        positions.setY(i, y);
      }
      positions.needsUpdate = true;
    }
  }

  function setNightMode(night) {
  isNight = night;
  const from = RoomScene.mood, to = night ? 1 : 0;
  const duration = reducedMotion ? 0 : 1200, start = performance.now();
  if (animatedParts.moon) animatedParts.moon.visible = night;
  if (animatedParts.stars) animatedParts.stars.visible = night;
  function step(now) {
    const p = duration === 0 ? 1 : Math.min((now - start) / duration, 1);
    const e = 1 - Math.pow(1 - p, 3);
    RoomScene.setMood(from + (to - from) * e);
    if (p < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

  function update() {
    const delta = clock.getDelta();
    updateCat(delta);
    updateAmbient(delta);
  }

  return { init, update, setNightMode, get isNight() { return isNight; } };
})();