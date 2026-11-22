/**
 * animations.js
 * Lightweight idle animations (plants, cat, lamp glow) and the
 * day/night transition. Respects prefers-reduced-motion.
 */

const Animations = (() => {
  let animatedParts = {};
  let lights = {};
  let scene;
  let root;
  let revealStartedAt = performance.now();
  let clock = new THREE.Clock();
  let isNight = false;
  let reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // cat state machine
  const CAT_STATES = ["sitting", "blinking", "lookAround", "walking", "sleeping"];
  let catState = "sitting";
  let catStateTimer = 0;
  let catWalkTarget = new THREE.Vector3();
  let guitarStrumUntil = 0;
  let typingStartedAt = 0;
  let clockSpinUntil = 0;

  function init({ animatedParts: parts, lights: sceneLights, scene: scn, root: roomRoot }) {
    animatedParts = parts;
    lights = sceneLights;
    scene = scn;
    root = roomRoot;
    revealStartedAt = performance.now();
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

    const now = performance.now();
    const stretchAt = catGroup.userData.stretchStartedAt || 0;
    const stretchProgress = Math.max(0, 1 - (now - stretchAt) / 1100);
    if (animatedParts.catBody) {
      animatedParts.catBody.scale.y = 0.9 * (1 + Math.sin(stretchProgress * Math.PI) * 0.28);
      animatedParts.catBody.scale.x = 1.2 * (1 + Math.sin(stretchProgress * Math.PI) * 0.08);
    }

    const batAt = catGroup.userData.batStartedAt || 0;
    const batProgress = Math.max(0, 1 - (now - batAt) / 650);
    if (animatedParts.catPaw) {
      animatedParts.catPaw.rotation.z = Math.sin((1 - batProgress) * Math.PI * 3) * 0.72 * batProgress;
    }

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

    if (root) {
      const reveal = THREE.MathUtils.clamp((performance.now() - revealStartedAt) / 1100, 0, 1);
      const ease = 1 - Math.pow(1 - reveal, 3);
      root.position.y = (1 - ease) * -0.18;
      root.rotation.y = (1 - ease) * -0.055;
      root.scale.setScalar(0.96 + ease * 0.04);
    }

    if (animatedParts.plantLeaves) {
      animatedParts.plantLeaves.rotation.z = Math.sin(t * 0.8) * 0.055;
      animatedParts.plantLeaves.rotation.x = Math.cos(t * 0.6) * 0.035;
    }

    if (animatedParts.hangingPlant) {
      animatedParts.hangingPlant.rotation.z = Math.sin(t * 0.55) * 0.035;
      animatedParts.hangingPlant.rotation.x = Math.cos(t * 0.42) * 0.025;
    }

    if (animatedParts.laptopScreen) {
      const pulse = 0.45 + Math.sin(t * 1.2) * 0.08;
      animatedParts.laptopScreen.material.emissiveIntensity = pulse;
    }

    if (lights.lamp && isNight) {
      lights.lamp.intensity = lights.lamp.userData.base * (
        0.99 + Math.sin(t * 2.7) * 0.008 + Math.sin(t * 7.1) * 0.003
      );
    }
    const lampGlow = 0.32 + Math.sin(t * 2.7) * 0.012 + Math.sin(t * 7.1) * 0.006;
    if (animatedParts.lampShade) animatedParts.lampShade.material.emissiveIntensity = lampGlow;
    if (animatedParts.floorLampShade) animatedParts.floorLampShade.material.emissiveIntensity = lampGlow;

    if (animatedParts.stringBulbs) {
      animatedParts.stringBulbs.forEach((bulb, i) => {
        bulb.material.emissiveIntensity = 0.75 + (Math.sin(t * 2.4 + i * 0.83) + 1) * 0.13;
      });
    }
    if (animatedParts.stringLight) {
      animatedParts.stringLight.intensity = 0.35 + (Math.sin(t * 2.4) + 1) * 0.08;
    }

    if (animatedParts.dustMotes) {
      const { points, speeds } = animatedParts.dustMotes;
      const positions = points.geometry.attributes.position;
      for (let i = 0; i < positions.count; i++) {
        const x = animatedParts.dustMotes.basePositions[i * 3] + Math.sin(t * 0.7 + i) * 0.12;
        const y = positions.getY(i) + speeds[i] * delta;
        positions.setX(i, x > 2.8 ? 0.45 : x);
        positions.setY(i, y > 3.4 ? 0.8 : y);
      }
      positions.needsUpdate = true;
    }

    if (animatedParts.clockHands) {
      const spin = performance.now() < clockSpinUntil ? 5 : 1;
      animatedParts.clockHands.minute.rotation.z = -t * 0.22 * spin;
      animatedParts.clockHands.hour.rotation.z = -t * 0.018 * spin;
    }

    if (animatedParts.guitar) {
      const guitar = animatedParts.guitar;
      if (guitar.userData.baseRotationX === undefined) guitar.userData.baseRotationX = guitar.rotation.x;
      if (guitar.userData.baseRotationY === undefined) guitar.userData.baseRotationY = guitar.rotation.y;
      const strumming = performance.now() < guitarStrumUntil;
      const pulse = strumming ? Math.sin(t * 34) : 0;
      guitar.rotation.x = guitar.userData.baseRotationX + pulse * 0.1;
      guitar.rotation.y = guitar.userData.baseRotationY + pulse * 0.07;
    }

    if (animatedParts.laptopTyping) {
      const typing = typingStartedAt > 0 && performance.now() - typingStartedAt < 2800;
      const typingTime = (performance.now() - typingStartedAt) / 1000;
      animatedParts.laptopTyping.lines.forEach((line, i) => {
        const baseWidth = 0.24 - i * 0.035;
        const reveal = typing ? THREE.MathUtils.clamp((typingTime * 4 - i * 0.45) % 1.2, 0.1, 1) : 1;
        line.scale.x = reveal;
        line.material.opacity = typing ? 0.55 + (Math.sin(t * 9 + i) + 1) * 0.2 : 0.8;
        line.position.x = -0.15 - (0.24 - baseWidth) * 0.5;
      });
      animatedParts.laptopTyping.caret.visible = typing && Math.floor(t * 4) % 2 === 0;
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

  function playInteraction(type) {
    if (type === "guitar") guitarStrumUntil = performance.now() + 700;
    if (type === "laptop") typingStartedAt = performance.now();
    if (type === "clock") clockSpinUntil = performance.now() + 900;
    if (type === "cat" && animatedParts.catGroup) {
      animatedParts.catGroup.userData.stretchStartedAt = performance.now();
    }
  }

  return { init, update, setNightMode, playInteraction, get isNight() { return isNight; } };
})();