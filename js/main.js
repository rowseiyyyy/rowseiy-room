/**
 * main.js
 * Wires together scene, room, interactions, animations, and UI.
 */

(function () {
  function setIcon(button, paths) {
    button.innerHTML = `<svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true">${paths}</svg>`;
  }

  const icons = {
    moon: '<path d="M20.9 13A9 9 0 0 1 11 3.1 9 9 0 1 0 20.9 13Z"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"/>',
    mute: '<path d="M11 5 6 9H3v6h3l5 4V5Zm4 4 5 6m0-6-5 6"/>',
    volume: '<path d="M11 5 6 9H3v6h3l5 4V5Zm4 4a5 5 0 0 1 0 6m3-9a9 9 0 0 1 0 12"/>',
  };

  RoomScene.init();
  const { interactiveObjects, animatedParts, root } = Room.build(RoomScene.scene);
  Realism.apply(root, RoomScene);

  Interactions.init({
    camera: RoomScene.camera,
    scene: RoomScene.scene,
    canvas: document.getElementById("scene-canvas"),
    interactiveObjects,
    onActivate: (type) => Portfolio.open(type),
  });

  Animations.init({
    animatedParts,
    lights: RoomScene.lights,
    scene: RoomScene.scene,
    root,
  });

  // ---------- Day/Night persistence ----------
  const daynightBtn = document.getElementById("daynight-toggle");
  const savedMode = localStorage.getItem("rosemay-room-mode");
  let isNight = savedMode === "night";
  applyNightMode(isNight, false);

  daynightBtn.addEventListener("click", () => {
    isNight = !isNight;
    applyNightMode(isNight, true);
    localStorage.setItem("rosemay-room-mode", isNight ? "night" : "day");
  });

  function applyNightMode(night, animate) {
    Animations.setNightMode(night);
    document.documentElement.dataset.theme = night ? "night" : "day";
    setIcon(daynightBtn, night ? icons.sun : icons.moon);
    daynightBtn.setAttribute("aria-label", night ? "Switch to day mode" : "Switch to night mode");
  }

  // ---------- Music toggle (muted by default, no autoplay) ----------
  const musicBtn = document.getElementById("music-toggle");
  const music = document.getElementById("bg-music");
  setIcon(musicBtn, icons.mute);
  let musicOn = false;
  musicBtn.addEventListener("click", () => {
    if (!music.src) return; // no track configured - button still gives feedback but does nothing
    musicOn = !musicOn;
    if (musicOn) music.play().catch(() => {});
    else music.pause();
    setIcon(musicBtn, musicOn ? icons.volume : icons.mute);
    musicBtn.setAttribute("aria-pressed", String(musicOn));
  });

  // ---------- Welcome toast ----------
  const toast = document.getElementById("welcome-toast");
  setTimeout(() => toast.classList.add("show"), 500);
  setTimeout(() => toast.classList.remove("show"), 5500);

  // ---------- Loading screen ----------
  const loadingScreen = document.getElementById("loading-screen");
  setTimeout(() => loadingScreen.classList.add("hidden"), 400);

  // ---------- Smooth hover scale/tilt easing for interactive objects ----------
  function easeInteractiveObjects() {
    interactiveObjects.forEach((group) => {
      const targetScale = group.userData.hoverTargetScale || 1;
      const currentScale = group.userData.hoverCurrentScale || 1;
      const newScale = currentScale + (targetScale - currentScale) * 0.15;
      group.userData.hoverCurrentScale = newScale;
      const baseScale = group.userData.baseScale || new THREE.Vector3(1, 1, 1);
      const landingScale = group.userData.landingScale || new THREE.Vector3(1, 1, 1);
      group.scale.set(
        baseScale.x * newScale * landingScale.x,
        baseScale.y * newScale * landingScale.y,
        baseScale.z * newScale * landingScale.z
      );

      const targetTilt = group.userData.hoverTilt || 0;
      group.rotation.z += (targetTilt - group.rotation.z) * 0.15;
    });
  }

  // ---------- Render loop ----------
  function animate() {
    requestAnimationFrame(animate);
    Interactions.updateCamera();
    Animations.update();
    easeInteractiveObjects();
    RoomScene.renderer.render(RoomScene.scene, RoomScene.camera);
  }
  animate();
})();