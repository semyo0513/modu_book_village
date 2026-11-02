/**
 * 사용자 입력 컨트롤러 (controls.js)
 */

(function(global) {
  const Controls = {
    keys: {},
    targetPoint: null,
    joystickVector: { x: 0, z: 0 },
    raycaster: null,
    mouse: null,

    init(domElement, camera) {
      const THREE = global.THREE;
      this.raycaster = new THREE.Raycaster();
      this.mouse = new THREE.Vector2();

      // 1. 키보드 이벤트
      window.addEventListener("keydown", (e) => {
        this.keys[e.key.toLowerCase()] = true;
        this.targetPoint = null;
      });

      window.addEventListener("keyup", (e) => {
        this.keys[e.key.toLowerCase()] = false;
      });

      // 2. 마우스 클릭 지점 이동
      domElement.addEventListener("pointerdown", (e) => {
        if (e.target.closest(".overlay-panel") || e.target.closest("#world-interaction-prompt") || e.target.closest("#world-building-modal") || e.target.closest("#navbar")) {
          return;
        }

        const rect = domElement.getBoundingClientRect();
        this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, camera);
        const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
        const intersection = new THREE.Vector3();
        this.raycaster.ray.intersectPlane(groundPlane, intersection);

        if (intersection) {
          this.targetPoint = intersection;
        }
      });

      // 3. 모바일 가상 조이스틱
      this.setupVirtualJoystick();
    },

    setupVirtualJoystick() {
      const joystickZone = document.getElementById("virtual-joystick-zone");
      const joystickKnob = document.getElementById("virtual-joystick-knob");
      if (!joystickZone || !joystickKnob) return;

      let touchId = null;
      let startX = 0, startY = 0;

      joystickZone.addEventListener("touchstart", (e) => {
        const touch = e.changedTouches[0];
        touchId = touch.identifier;
        const rect = joystickZone.getBoundingClientRect();
        startX = rect.left + rect.width / 2;
        startY = rect.top + rect.height / 2;
        this.targetPoint = null;
      }, { passive: true });

      joystickZone.addEventListener("touchmove", (e) => {
        for (let i = 0; i < e.changedTouches.length; i++) {
          const touch = e.changedTouches[i];
          if (touch.identifier === touchId) {
            const dx = touch.clientX - startX;
            const dy = touch.clientY - startY;
            const dist = Math.min(Math.sqrt(dx * dx + dy * dy), 40);
            const angle = Math.atan2(dy, dx);

            const knobX = Math.cos(angle) * dist;
            const knobY = Math.sin(angle) * dist;
            joystickKnob.style.transform = `translate(${knobX}px, ${knobY}px)`;

            this.joystickVector.x = knobX / 40;
            this.joystickVector.z = knobY / 40;
            break;
          }
        }
      }, { passive: true });

      const resetJoystick = () => {
        touchId = null;
        joystickKnob.style.transform = "translate(0px, 0px)";
        this.joystickVector.x = 0;
        this.joystickVector.z = 0;
      };

      joystickZone.addEventListener("touchend", resetJoystick);
      joystickZone.addEventListener("touchcancel", resetJoystick);
    },

    getMoveVector(currentPos) {
      if (global.BuildingModal && global.BuildingModal.isOpen) {
        return { x: 0, z: 0 };
      }
      const activeTag = document.activeElement ? document.activeElement.tagName : "";
      if (activeTag === "INPUT" || activeTag === "TEXTAREA") {
        return { x: 0, z: 0 };
      }

      let moveX = 0;
      let moveZ = 0;

      if (this.keys["w"] || this.keys["arrowup"]) moveZ -= 1;
      if (this.keys["s"] || this.keys["arrowdown"]) moveZ += 1;
      if (this.keys["a"] || this.keys["arrowleft"]) moveX -= 1;
      if (this.keys["d"] || this.keys["arrowright"]) moveX += 1;

      if (Math.abs(this.joystickVector.x) > 0.1 || Math.abs(this.joystickVector.z) > 0.1) {
        moveX = this.joystickVector.x;
        moveZ = this.joystickVector.z;
      }

      if (this.targetPoint && moveX === 0 && moveZ === 0) {
        const dx = this.targetPoint.x - currentPos.x;
        const dz = this.targetPoint.z - currentPos.z;
        const dist = Math.sqrt(dx * dx + dz * dz);

        if (dist > 0.4) {
          moveX = dx / dist;
          moveZ = dz / dist;
        } else {
          this.targetPoint = null;
        }
      }

      const len = Math.sqrt(moveX * moveX + moveZ * moveZ);
      if (len > 1.0) {
        moveX /= len;
        moveZ /= len;
      }

      return { x: moveX, z: moveZ };
    }
  };

  global.Controls = Controls;
})(typeof window !== "undefined" ? window : globalThis);
