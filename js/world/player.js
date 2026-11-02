/**
 * 3D 플레이어 캐릭터 모듈 (player.js)
 * - 동물의 숲 스타일 저폴리 귀여운 꼬마 아바타
 * - 머리 위 닉네임 네임태그 빌보드
 * - 이동 시 통통 튀는 Waddle/Bounce 걷기 애니메이션
 */

import * as THREE from "three";

export const Player = {
  mesh: null,
  bodyGroup: null,
  headMesh: null,
  nameTag: null,
  speed: 9.0,
  position: new THREE.Vector3(0, 0, 14), // 마을 남쪽 오솔길에서 시작
  targetRotation: 0,
  isMoving: false,
  walkCycle: 0,

  create(scene, name = "책친구") {
    this.mesh = new THREE.Group();
    this.mesh.position.copy(this.position);

    this.bodyGroup = new THREE.Group();
    this.mesh.add(this.bodyGroup);

    // 1. 머리 (동물의 숲 비율: 대두 스타일)
    const headGeo = new THREE.SphereGeometry(0.75, 12, 12);
    const headMat = new THREE.MeshLambertMaterial({ color: 0xffdfba }); // 살구 피부톤
    this.headMesh = new THREE.Mesh(headGeo, headMat);
    this.headMesh.position.y = 1.6;
    this.headMesh.castShadow = true;
    this.bodyGroup.add(this.headMesh);

    // 머리카락 (귀여운 베레모/헤어 모자 스타일)
    const hairGeo = new THREE.SphereGeometry(0.78, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.55);
    const hairMat = new THREE.MeshLambertMaterial({ color: 0x5c3a21 }); // 갈색 머리
    const hair = new THREE.Mesh(hairGeo, hairMat);
    hair.position.y = 1.7;
    this.bodyGroup.add(hair);

    // 눈 2개 (작은 검은 타원)
    const eyeGeo = new THREE.SphereGeometry(0.08, 6, 6);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x222222 });
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.24, 1.6, 0.7);
    const rightEye = leftEye.clone();
    rightEye.position.set(0.24, 1.6, 0.7);
    this.bodyGroup.add(leftEye, rightEye);

    // 2. 몸통 (원뿔형 통통한 옷)
    const torsoGeo = new THREE.CylinderGeometry(0.35, 0.6, 0.9, 10);
    const torsoMat = new THREE.MeshLambertMaterial({ color: 0x2563eb }); // 파란 멜빵/셔츠
    const torso = new THREE.Mesh(torsoGeo, torsoMat);
    torso.position.y = 0.85;
    torso.castShadow = true;
    this.bodyGroup.add(torso);

    // 3. 다리 2개
    const legGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.45, 6);
    const legMat = new THREE.MeshLambertMaterial({ color: 0x334155 });
    this.leftLeg = new THREE.Mesh(legGeo, legMat);
    this.leftLeg.position.set(-0.25, 0.25, 0);
    this.rightLeg = this.leftLeg.clone();
    this.rightLeg.position.set(0.25, 0.25, 0);
    this.bodyGroup.add(this.leftLeg, this.rightLeg);

    // 4. 발 밑 그림자 (가벼운 블롭 섀도우)
    const shadowGeo = new THREE.CircleGeometry(0.65, 12);
    const shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.25 });
    const shadow = new THREE.Mesh(shadowGeo, shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.03;
    this.mesh.add(shadow);

    // 5. 머리 위 닉네임 네임태그
    this.updateNameTag(name);

    scene.add(this.mesh);
    return this.mesh;
  },

  updateNameTag(name) {
    if (this.nameTag) {
      this.mesh.remove(this.nameTag);
    }

    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
    ctx.roundRect(16, 8, 224, 48, 12);
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 26px 'Noto Sans KR', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(name, 128, 42);

    const texture = new THREE.CanvasTexture(canvas);
    const mat = new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthTest: false });
    const geo = new THREE.PlaneGeometry(2.0, 0.5);
    this.nameTag = new THREE.Mesh(geo, mat);
    this.nameTag.position.y = 2.85;
    this.mesh.add(this.nameTag);
  },

  move(moveX, moveZ, delta, colliders = []) {
    if (Math.abs(moveX) > 0.001 || Math.abs(moveZ) > 0.001) {
      this.isMoving = true;

      // 이동 방향 각도 계산
      this.targetRotation = Math.atan2(moveX, moveZ);

      // 회전각 부드러운 보간 (lerp)
      let diff = this.targetRotation - this.mesh.rotation.y;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;
      this.mesh.rotation.y += diff * 12 * delta;

      // 충돌 검사를 고려한 좌표 갱신
      const nextX = this.position.x + moveX * this.speed * delta;
      const nextZ = this.position.z + moveZ * this.speed * delta;

      // 맵 경계 체크 (반경 35 내로 제한)
      const distFromCenter = Math.sqrt(nextX * nextX + nextZ * nextZ);
      if (distFromCenter < 35) {
        // 건물 및 장애물 충돌 검사
        let canMoveX = true;
        let canMoveZ = true;

        for (const col of colliders) {
          const dx = nextX - col.x;
          const dz = this.position.z - col.z;
          if (Math.sqrt(dx * dx + dz * dz) < col.radius + 0.6) {
            canMoveX = false;
          }

          const dx2 = this.position.x - col.x;
          const dz2 = nextZ - col.z;
          if (Math.sqrt(dx2 * dx2 + dz2 * dz2) < col.radius + 0.6) {
            canMoveZ = false;
          }
        }

        if (canMoveX) this.position.x = nextX;
        if (canMoveZ) this.position.z = nextZ;
      }
    } else {
      this.isMoving = false;
    }

    this.mesh.position.copy(this.position);
    this.updateAnimation(delta);
  },

  updateAnimation(delta) {
    if (this.isMoving) {
      this.walkCycle += delta * 14;
      // 통통 튀는 상하 바운스
      this.bodyGroup.position.y = Math.abs(Math.sin(this.walkCycle)) * 0.22;
      // 좌우 귀여운 갸우뚱 회전
      this.bodyGroup.rotation.z = Math.sin(this.walkCycle) * 0.12;

      // 다리 앞뒤 흔들기
      if (this.leftLeg && this.rightLeg) {
        this.leftLeg.rotation.x = Math.sin(this.walkCycle) * 0.6;
        this.rightLeg.rotation.x = -Math.sin(this.walkCycle) * 0.6;
      }
    } else {
      // 대기(Idle) 호흡 애니메이션
      this.walkCycle += delta * 2;
      this.bodyGroup.position.y = Math.sin(this.walkCycle) * 0.04;
      this.bodyGroup.rotation.z = 0;
      if (this.leftLeg && this.rightLeg) {
        this.leftLeg.rotation.x = 0;
        this.rightLeg.rotation.x = 0;
      }
    }
  }
};
