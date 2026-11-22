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
  let draggableObjects = [];
  let draggedObject = null;
  let objectDragPlane = null;
  let objectDragOffset = new THREE.Vector3();
  let previousDragPoint = new THREE.Vector3();
  let dragVelocity = new THREE.Vector3();
  let lastDragTime = 0;
  let objectPhysics = [];
  const floatingObjects = new Map();

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
    collectDraggableObjects();

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

  function collectDraggableObjects() {
    draggableObjects = [];
    scene.traverse((object) => {
      if (!object.isMesh) return;
      if (object.userData.structural) return;
      if (object.material && object.material.visible === false) return;
      if (object.material && object.material.transparent && object.material.opacity === 0) return;
      draggableObjects.push(object);
      object.castShadow = true;
      object.receiveShadow = true;
    });
  }

  function findDraggableRoot(object) {
    let candidate = object;
    while (
      candidate &&
      candidate.parent &&
      candidate.parent.parent &&
      candidate.parent.parent !== scene
    ) {
      candidate = candidate.parent;
    }
    return candidate;
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
    if (draggedObject) {
      dragDistance = Math.max(dragDistance, Math.sqrt(
        (event.clientX - dragStart.x) ** 2 +
        (event.clientY - dragStart.y) ** 2
      ));
      updatePointer(event);
      raycaster.setFromCamera(pointer, camera);
      const hit = new THREE.Vector3();
      if (raycaster.ray.intersectPlane(objectDragPlane, hit)) {
        const now = performance.now();
        const dt = Math.max((now - lastDragTime) / 1000, 1 / 120);
        const nextPoint = hit.clone().add(objectDragOffset);
        const delta = nextPoint.clone().sub(draggedObject.getWorldPosition(new THREE.Vector3()));
        draggedObject.position.add(delta);
        dragVelocity.copy(nextPoint).sub(previousDragPoint).multiplyScalar(1 / dt);
        previousDragPoint.copy(nextPoint);
        lastDragTime = now;
        constrainObject(draggedObject);
      }
      return;
    }

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
    updatePointer(event);
    raycaster.setFromCamera(pointer, camera);
    const intersects = raycaster.intersectObjects(draggableObjects, true);

    for (const intersection of intersects) {
      if (intersection.object.userData.structural) continue;
      if (intersection.object.material && intersection.object.material.visible === false) continue;

      draggedObject = findDraggableRoot(intersection.object);
      if (!draggedObject || draggedObject === scene) break;
      floatingObjects.delete(draggedObject);
      objectPhysics = objectPhysics.filter((item) => item.object !== draggedObject);

      draggedObject.updateMatrixWorld(true);
      const objectPoint = draggedObject.getWorldPosition(new THREE.Vector3());
      const normal = camera.getWorldDirection(new THREE.Vector3()).negate();
      objectDragPlane = new THREE.Plane().setFromNormalAndCoplanarPoint(normal, objectPoint);
      const planeHit = new THREE.Vector3();
      if (!raycaster.ray.intersectPlane(objectDragPlane, planeHit)) break;

      objectDragOffset.copy(objectPoint).sub(planeHit);
      previousDragPoint.copy(planeHit).add(objectDragOffset);
      dragVelocity.set(0, 0, 0);
      lastDragTime = performance.now();
      dragDistance = 0;
      dragStart.x = event.clientX;
      dragStart.y = event.clientY;
      canvas.classList.add("hoverable");
      return;
    }

    isDragging = true;
    dragDistance = 0;
    dragStart.x = event.clientX;
    dragStart.y = event.clientY;
  }

  function onPointerUp(event) {
    if (draggedObject) {
      const thrownObject = draggedObject;
      registerPhysics(thrownObject, dragVelocity);
      draggedObject = null;
      objectDragPlane = null;
      if (dragDistance < TAP_THRESHOLD) activateAtPoint(event);
      canvas.classList.remove("hoverable");
      return;
    }

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

  function constrainObject(object) {
    object.updateMatrixWorld(true);
    const position = object.getWorldPosition(new THREE.Vector3());
    let changed = false;

    if (position.x < -3.35) { position.x = -3.35; changed = true; }
    if (position.x > 3.35) { position.x = 3.35; changed = true; }
    if (position.z < -2.85) { position.z = -2.85; changed = true; }
    if (position.z > 2.65) { position.z = 2.65; changed = true; }
    if (position.y < 0.05) { position.y = 0.05; changed = true; }
    if (position.y > 4.2) { position.y = 4.2; changed = true; }

    if (changed) {
      if (object.parent) {
        const local = object.parent.worldToLocal(position.clone());
        object.position.copy(local);
      } else {
        object.position.copy(position);
      }
    }
  }

  function registerPhysics(object, velocity) {
    const item = objectPhysics.find((entry) => entry.object === object);
    const speed = velocity.length();
    if (speed < 0.08) {
      if (item) objectPhysics.splice(objectPhysics.indexOf(item), 1);
      startFloating(object);
      return;
    }

    if (item) {
      item.velocity.copy(velocity);
      item.lastTime = performance.now();
      return;
    }

    objectPhysics.push({
      object,
      velocity: velocity.clone(),
      angular: new THREE.Vector3(
        (Math.random() - 0.5) * 1.8,
        (Math.random() - 0.5) * 2.2,
        (Math.random() - 0.5) * 1.8
      ),
      lastTime: performance.now(),
    });
  }

  function updatePhysics() {
    const now = performance.now();
    objectPhysics = objectPhysics.filter((item) => {
      const dt = Math.min((now - item.lastTime) / 1000, 0.033);
      item.lastTime = now;

      item.object.position.addScaledVector(item.velocity, dt);
      item.object.rotation.x += item.angular.x * dt;
      item.object.rotation.y += item.angular.y * dt;
      item.object.rotation.z += item.angular.z * dt;

      const damping = Math.pow(0.88, dt * 60);
      item.velocity.multiplyScalar(damping);
      item.angular.multiplyScalar(damping);

      constrainObject(item.object);
      item.object.updateMatrixWorld(true);
      const position = item.object.getWorldPosition(new THREE.Vector3());
      if (position.y <= 0.055) {
        item.velocity.y = Math.abs(item.velocity.y) * 0.18;
        item.angular.multiplyScalar(0.7);
      }

      const moving = item.velocity.length() > 0.025 ||
        item.angular.length() > 0.025;
      if (!moving) startFloating(item.object);
      return moving;
    });
    updateFloatingObjects(now);
  }

  function startFloating(object) {
    if (object.position.y <= 0.4) return;
    floatingObjects.set(object, {
      baseY: object.position.y,
      phase: Math.random() * Math.PI * 2,
      startedAt: performance.now(),
    });
  }

  function updateFloatingObjects(now) {
    floatingObjects.forEach((float, object) => {
      if (!object.parent) {
        floatingObjects.delete(object);
        return;
      }

      const elapsed = (now - float.startedAt) / 1000;
      object.position.y = float.baseY + Math.sin(elapsed * 2.4 + float.phase) * 0.055;
    });
  }

  function updateCamera() {
    updatePhysics();
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