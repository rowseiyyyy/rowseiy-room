/**
 * interactions.js
 * Handles hover feedback, click detection (raycasting), and a subtle
 * click-and-drag camera look-around. Also wires up the accessible
 * object-nav buttons so keyboard/mobile users can reach every section.
 */

const Interactions = (() => {
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let camera, scene, canvas, interactiveObjects;
  let hovered = null;
  let onObjectActivated = () => {};

  // gentle camera look-around
  let isDragging = false;
  let dragStart = { x: 0, y: 0 };
  let dragDistance = 0; // total pointer travel since pointerdown, used to tell a tap from a drag
  const TAP_THRESHOLD = 6; // px - below this, a pointerup counts as a click/tap
  let baseAzimuth = 0;
  let baseElevation = 0;
  let targetAzimuth = 0;
  let targetElevation = 0;
  let cameraRadius = 9.7;
  const lookAtPoint = new THREE.Vector3(0, 0.6, 0);

  function init({ camera: cam, scene: scn, canvas: cvs, interactiveObjects: objs, onActivate }) {
    camera = cam;
    scene = scn;
    canvas = cvs;
    interactiveObjects = objs;
    onObjectActivated = onActivate || onObjectActivated;

    const initialOffset = camera.position.clone().sub(lookAtPoint);
    cameraRadius = initialOffset.length();
    baseAzimuth = Math.atan2(initialOffset.x, initialOffset.z);
    baseElevation = Math.atan2(initialOffset.y, Math.sqrt(initialOffset.x ** 2 + initialOffset.z ** 2));
    targetAzimuth = baseAzimuth;
    targetElevation = baseElevation;

    // Use pointer events for both mouse and touch so drag-to-look and
    // tap-to-select work the same way on desktop and mobile.
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointerup", onPointerUp);

    setupObjectNav();
  }

  function setupObjectNav() {
    document.querySelectorAll(".object-nav button").forEach((btn) => {
      btn.addEventListener("click", () => {
        onObjectActivated(btn.dataset.target);
      });
    });
  }

  function findTargetGroup(object) {
    let obj = object;
    while (obj) {
      if (obj.userData && obj.userData.type) return obj;
      obj = obj.parent;
    }
    return null;
  }

  function updatePointer(event) {
    const rect = canvas.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  function onPointerMove(event) {
    if (isDragging) {
      const dx = event.clientX - dragStart.x;
      const dy = event.clientY - dragStart.y;
      dragDistance = Math.max(dragDistance, Math.sqrt(dx * dx + dy * dy));
      targetAzimuth = baseAzimuth - dx * 0.0025;
      targetElevation = THREE.MathUtils.clamp(baseElevation + dy * 0.0018, 0.15, 0.75);
      return;
    }

    updatePointer(event);
    raycaster.setFromCamera(pointer, camera);
    const intersects = raycaster.intersectObjects(interactiveObjects, true);
    const hint = document.getElementById("hover-hint");

    if (intersects.length > 0) {
      const group = findTargetGroup(intersects[0].object);
      if (group && group !== hovered) {
        clearHover();
        hovered = group;
        applyHoverEffect(hovered, true);
        canvas.classList.add("hoverable");
      }
      if (group) {
        hint.textContent = hintLabel(group.userData.type);
        hint.style.left = event.clientX + "px";
        hint.style.top = event.clientY + "px";
        hint.classList.add("show");
      }
    } else {
      clearHover();
      canvas.classList.remove("hoverable");
      hint.classList.remove("show");
    }
  }

  function clearHover() {
    if (hovered) applyHoverEffect(hovered, false);
    hovered = null;
  }

 function applyHoverEffect(group, isHover) {
  group.userData.hoverTargetScale = isHover ? 1.08 : 1;
  group.userData.hoverTilt = isHover ? 0.06 : 0;
  if (group.userData.outline) group.userData.outline.visible = isHover;
}

  function hintLabel(type) {
    const labels = {
      laptop: "View Projects",
      bookshelf: "View Skills",
      console: "View Hobbies",
      frame: "About Me",
      notes: "Education",
      cat: "Fun Facts",
      plants: "Currently Learning",
      phone: "Contact",
      dog: "Fun Facts",
    };
    const c = PORTFOLIO_DATA.clutter && PORTFOLIO_DATA.clutter[type];
    return labels[type] || (c ? c.title : "Click to explore");
  }

  function onPointerDown(event) {
    isDragging = true;
    dragDistance = 0;
    dragStart.x = event.clientX;
    dragStart.y = event.clientY;
  }

  function onPointerUp(event) {
    isDragging = false;
    baseAzimuth = targetAzimuth;
    baseElevation = targetElevation;

    // Treat as a tap/click only if the pointer barely moved - otherwise
    // it was a look-around drag and shouldn't also trigger a selection.
    if (dragDistance < TAP_THRESHOLD) {
      activateAtPoint(event);
    }
  }

  function activateAtPoint(event) {
    updatePointer(event);
    raycaster.setFromCamera(pointer, camera);
    const intersects = raycaster.intersectObjects(interactiveObjects, true);
    if (intersects.length > 0) {
      const group = findTargetGroup(intersects[0].object);
      if (group) onObjectActivated(group.userData.type);
    }
  }

  function updateCamera() {
    // ease camera toward target angles for a smooth, non-jarring look-around
    baseAzimuth += (targetAzimuth - baseAzimuth) * 0.08;
    baseElevation += (targetElevation - baseElevation) * 0.08;

    const az = baseAzimuth;
    const el = baseElevation;
    camera.position.x = lookAtPoint.x + cameraRadius * Math.cos(el) * Math.sin(az);
    camera.position.y = lookAtPoint.y + cameraRadius * Math.sin(el);
    camera.position.z = lookAtPoint.z + cameraRadius * Math.cos(el) * Math.cos(az);
    camera.lookAt(lookAtPoint);
  }

  return { init, updateCamera, get hovered() { return hovered; } };
})();