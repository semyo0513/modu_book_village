/**
 * 부드러운 3인칭 팔로우 카메라 시스템 (camera.js)
 */

(function(global) {
  const WorldCamera = {
    camera: null,
    mode: "thirdPerson",
    offsetThirdPerson: null,
    offsetIsometric: null,
    targetLookAt: null,
    currentLookAt: null,

    init(camera) {
      const THREE = global.THREE;
      this.camera = camera;
      this.offsetThirdPerson = new THREE.Vector3(0, 12, 16);
      this.offsetIsometric = new THREE.Vector3(0, 38, 38);
      this.targetLookAt = new THREE.Vector3();
      this.currentLookAt = new THREE.Vector3(0, 1.5, 0);
    },

    toggleViewMode() {
      this.mode = this.mode === "thirdPerson" ? "isometric" : "thirdPerson";
      return this.mode;
    },

    update(playerPosition, delta) {
      if (!this.camera || !this.offsetThirdPerson) return;
      const THREE = global.THREE;

      const offset = this.mode === "thirdPerson" ? this.offsetThirdPerson : this.offsetIsometric;
      const targetCamPos = new THREE.Vector3().copy(playerPosition).add(offset);

      this.camera.position.lerp(targetCamPos, 5.0 * delta);

      this.targetLookAt.copy(playerPosition).add(new THREE.Vector3(0, 1.2, 0));
      this.currentLookAt.lerp(this.targetLookAt, 6.0 * delta);
      this.camera.lookAt(this.currentLookAt);
    }
  };

  global.WorldCamera = WorldCamera;
})(typeof window !== "undefined" ? window : globalThis);
