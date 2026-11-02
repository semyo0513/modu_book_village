/**
 * 부드러운 3인칭 팔로우 카메라 시스템 (camera.js)
 * - 캐릭터 추적 (Damping / Lerp)
 * - 시점 모드 토글: 3인칭 추적 뷰 vs 탑다운 아이소 뷰
 */

import * as THREE from "three";

export const WorldCamera = {
  camera: null,
  mode: "thirdPerson", // 'thirdPerson' | 'isometric'
  offsetThirdPerson: new THREE.Vector3(0, 12, 16),
  offsetIsometric: new THREE.Vector3(0, 38, 38),
  targetLookAt: new THREE.Vector3(),
  currentLookAt: new THREE.Vector3(),

  init(camera) {
    this.camera = camera;
    this.currentLookAt.set(0, 1.5, 0);
  },

  toggleViewMode() {
    this.mode = this.mode === "thirdPerson" ? "isometric" : "thirdPerson";
    return this.mode;
  },

  update(playerPosition, delta) {
    if (!this.camera) return;

    const offset = this.mode === "thirdPerson" ? this.offsetThirdPerson : this.offsetIsometric;
    const targetCamPos = new THREE.Vector3().copy(playerPosition).add(offset);

    // 카메라 위치 부드러운 보간 (Lerp)
    this.camera.position.lerp(targetCamPos, 5.0 * delta);

    // 시선 타겟 보간
    this.targetLookAt.copy(playerPosition).add(new THREE.Vector3(0, 1.2, 0));
    this.currentLookAt.lerp(this.targetLookAt, 6.0 * delta);
    this.camera.lookAt(this.currentLookAt);
  }
};
