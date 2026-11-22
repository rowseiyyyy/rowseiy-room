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
  const landingBounces = new Map();
  let bookWobble = null;
  let catGroup = null;
  let dragStartWorldY = 0;
  let dragStartWasFloating = false;

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
    catGroup = interactiveObjects.find((object) => object.userData.type === "cat") || null;
    interactiveObjects.forEach((object) => {
      object.userData.baseScale = object.scale.clone();
      object.userData.hoverCurrentScale = 1;
    });
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
        const nextLocalPoint = draggedObject.parent
          ? draggedObject.parent.worldToLocal(nextPoint.clone())
          : nextPoint;
        draggedObject.position.copy(nextLocalPoint);
        dragVelocity.copy(nextPoint).sub(previousDragPoint).multiplyScalar(1 / dt);
        previousDragPoint.copy(nextPoint);
        lastDragTime = now;
        constrainObject(draggedObject);
        if (bookWobble && bookWobble.object === draggedObject) {
          const wobble = Math.sin(now * 0.035) * 0.12;
          draggedObject.rotation.x = bookWobble.rotationX + wobble * 0.4;
          draggedObject.rotation.z = bookWobble.rotationZ + wobble;
        }
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

      draggedObject = intersection.object.userData.reaction === "book"
        ? intersection.object
        : findDraggableRoot(intersection.object);
      if (!draggedObject || draggedObject === scene) break;
      dragStartWasFloating = floatingObjects.has(draggedObject);
      stopFloating(draggedObject);
      const bounce = landingBounces.get(draggedObject);
      if (bounce && !draggedObject.userData.baseScale) draggedObject.scale.copy(bounce.baseScale);
      landingBounces.delete(draggedObject);
      if (draggedObject.userData.landingScale) draggedObject.userData.landingScale.set(1, 1, 1);
      objectPhysics = objectPhysics.filter((item) => item.object !== draggedObject);
      if (draggedObject.userData.reaction === "book") {
        bookWobble = {
          object: draggedObject,
          rotationX: draggedObject.rotation.x,
          rotationZ: draggedObject.rotation.z,
        };
      }

      draggedObject.updateMatrixWorld(true);
      const objectPoint = draggedObject.getWorldPosition(new THREE.Vector3());
      dragStartWorldY = objectPoint.y;
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
      if (bookWobble && bookWobble.object === thrownObject) {
        thrownObject.rotation.x = bookWobble.rotationX;
        thrownObject.rotation.z = bookWobble.rotationZ;
        bookWobble = null;
      }
      const releaseY = thrownObject.getWorldPosition(new THREE.Vector3()).y;
      thrownObject.userData.floatEligible = dragStartWasFloating || releaseY > dragStartWorldY + 0.15;
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
      if (group) {
        Animations.playInteraction(group.userData.type);
        onObjectActivated(group.userData.type);
      }
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

    const mass = object.userData.mass || estimateMass(object);
    const launchVelocity = velocity.clone().clampLength(0, 7);
    if (item) {
      item.velocity.copy(launchVelocity);
      item.lastTime = performance.now();
      return;
    }

    objectPhysics.push({
      object,
      velocity: launchVelocity,
      mass,
      angular: new THREE.Vector3(
        (Math.random() - 0.5) * 2.6 / mass,
        (Math.random() - 0.5) * 3.2 / mass,
        (Math.random() - 0.5) * 2.6 / mass
      ),
      lastTime: performance.now(),
    });
  }

  function estimateMass(object) {
    object.updateMatrixWorld(true);
    const size = new THREE.Box3().setFromObject(object).getSize(new THREE.Vector3());
    return THREE.MathUtils.clamp(0.45 + Math.cbrt(size.x * size.y * size.z) * 1.5, 0.45, 3.5);
  }

  function updatePhysics() {
    const now = performance.now();
    objectPhysics = objectPhysics.filter((item) => {
      const dt = Math.min((now - item.lastTime) / 1000, 0.033);
      item.lastTime = now;

      item.velocity.y -= 3.8 * dt;
      const worldPosition = item.object.getWorldPosition(new THREE.Vector3());
      worldPosition.addScaledVector(item.velocity, dt);
      setWorldPosition(item.object, worldPosition);
      item.object.rotation.x += item.angular.x * dt;
      item.object.rotation.y += item.angular.y * dt;
      item.object.rotation.z += item.angular.z * dt;

      const damping = Math.pow(0.88, dt * 60);
      item.velocity.multiplyScalar(damping);
      item.angular.multiplyScalar(damping);

      item.object.updateMatrixWorld(true);
      const position = item.object.getWorldPosition(new THREE.Vector3());
      if (position.y <= 0.05 && item.velocity.y < 0) {
        const impactSpeed = -item.velocity.y;
        position.y = 0.05;
        setWorldPosition(item.object, position);
        item.velocity.y = impactSpeed > 0.45
          ? impactSpeed * THREE.MathUtils.clamp(0.7 / item.mass, 0.18, 0.72)
          : 0;
        if (impactSpeed > 0.5) startLandingBounce(item.object, impactSpeed, item.mass, now);
        item.angular.multiplyScalar(0.7);
      }
      constrainObject(item.object);
      maybeTriggerCat(item.object, now);

      const moving = item.velocity.length() > 0.025 ||
        item.angular.length() > 0.025;
      if (!moving) startFloating(item.object);
      return moving;
    });
    updateFloatingObjects(now);
    updateLandingBounces(now);
  }

  function startFloating(object) {
    if (!object.userData.floatEligible || object.getWorldPosition(new THREE.Vector3()).y <= 0.4) return;
    if (floatingObjects.has(object)) return;

    const light = new THREE.PointLight(0xbdeeff, 0, 1.5, 2);
    light.position.y = 0.18;
    object.add(light);

    const count = 9;
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    const trail = new THREE.Points(
      geometry,
      new THREE.PointsMaterial({
        color: 0xbdeeff,
        size: 0.045,
        transparent: true,
        opacity: 0.8,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    );
    object.add(trail);

    floatingObjects.set(object, {
      baseY: object.position.y,
      phase: Math.random() * Math.PI * 2,
      startedAt: performance.now(),
      baseRotationY: object.rotation.y,
      light,
      trail,
    });
    object.userData.floatEligible = false;
  }

  function updateFloatingObjects(now) {
    floatingObjects.forEach((float, object) => {
      if (!object.parent) {
        stopFloating(object);
        return;
      }

      const elapsed = (now - float.startedAt) / 1000;
      object.position.y = float.baseY + Math.sin(elapsed * 2.4 + float.phase) * 0.055;
      object.rotation.y = float.baseRotationY + elapsed * 0.22;
      float.light.intensity = 0.35 + (Math.sin(elapsed * 3 + float.phase) + 1) * 0.2;

      const positions = float.trail.geometry.attributes.position;
      for (let i = 0; i < positions.count; i++) {
        const angle = elapsed * 1.5 + float.phase + i * (Math.PI * 2 / positions.count);
        const radius = 0.12 + (i % 3) * 0.035;
        positions.setXYZ(
          i,
          Math.cos(angle) * radius,
          0.12 + (i / positions.count) * 0.28 + Math.sin(angle * 1.7) * 0.035,
          Math.sin(angle) * radius
        );
      }
      positions.needsUpdate = true;
    });
  }

  function stopFloating(object) {
    const float = floatingObjects.get(object);
    if (!float) return;
    object.remove(float.light, float.trail);
    float.trail.geometry.dispose();
    float.trail.material.dispose();
    floatingObjects.delete(object);
  }

  function setWorldPosition(object, position) {
    object.position.copy(object.parent ? object.parent.worldToLocal(position.clone()) : position);
  }

  function startLandingBounce(object, impactSpeed, mass, now) {
    landingBounces.set(object, {
      baseScale: (object.userData.baseScale || object.scale).clone(),
      startedAt: now,
      strength: THREE.MathUtils.clamp(impactSpeed * 0.025 / mass, 0.035, 0.16),
    });
    object.userData.landingScale = new THREE.Vector3(1, 1, 1);
  }

  function updateLandingBounces(now) {
    landingBounces.forEach((bounce, object) => {
      const progress = (now - bounce.startedAt) / 240;
      if (progress >= 1) {
        object.userData.landingScale.set(1, 1, 1);
        if (!object.userData.baseScale) object.scale.copy(bounce.baseScale);
        landingBounces.delete(object);
        return;
      }

      const squash = Math.sin(progress * Math.PI) * bounce.strength;
      object.userData.landingScale.set(1 + squash, 1 - squash * 1.3, 1 + squash);
      if (!object.userData.baseScale) {
        object.scale.set(
          bounce.baseScale.x * object.userData.landingScale.x,
          bounce.baseScale.y * object.userData.landingScale.y,
          bounce.baseScale.z * object.userData.landingScale.z
        );
      }
    });
  }

  function maybeTriggerCat(object, now) {
    if (!catGroup || object === catGroup) return;
    const catPosition = catGroup.getWorldPosition(new THREE.Vector3());
    const objectPosition = object.getWorldPosition(new THREE.Vector3());
    if (catPosition.distanceTo(objectPosition) > 0.9) return;
    if (now < (catGroup.userData.nextBatAt || 0)) return;

    catGroup.userData.batStartedAt = now;
    catGroup.userData.nextBatAt = now + 1300;
  }

  function updateCamera() {
    updatePhysics();
    // ease camera toward target angles for a smooth, non-jarring look-around
    baseAzimuth += (targetAzimuth - baseAzimuth) * 0.08;
    baseElevation += (targetElevation - baseElevation) * 0.08;

    const az = baseAzimuth;
    const el = baseElevation;
    const idle = !isDragging && !draggedObject && !window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? performance.now() / 1000
      : 0;
    const breath = idle ? Math.sin(idle * 0.45) * 0.012 : 0;
    camera.position.x = lookAtPoint.x + cameraRadius * Math.cos(el) * Math.sin(az);
    camera.position.y = lookAtPoint.y + cameraRadius * Math.sin(el) + breath;
    camera.position.z = lookAtPoint.z + cameraRadius * Math.cos(el) * Math.cos(az);
    camera.lookAt(lookAtPoint);
  }

  return { init, updateCamera, get hovered() { return hovered; } };
})();