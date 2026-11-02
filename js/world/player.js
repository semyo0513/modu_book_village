/**
 * 3D 플레이어 캐릭터 & 실시간 아바타 커스터마이징 모듈 (player.js)
 * - 동물의 숲 스타일 귀여운 저폴리 아바타
 * - 헤어 스타일(베레모, 바가지머리, 숏컷, 트윈테일, 마법사모자)
 * - 헤어 색상, 옷 색상, 피부톤, 액세서리(안경, 볼터치, 배낭) 실시간 커스텀
 * - 머리 위 닉네임 네임태그 빌보드 & 통통 튀는 Waddle 걷기 애니메이션
 */

import * as THREE from "three";

export const Player = {
  mesh: null,
  bodyGroup: null,
  headMesh: null,
  hairGroup: null,
  torsoMesh: null,
  accessoryGroup: null,
  nameTag: null,
  speed: 13.0,
  position: new THREE.Vector3(0, 0, 0), // 탁 트인 마을 중앙 십자로에서 시작 (장애물 없는 안전 구역)
  targetRotation: 0,
  isMoving: false,
  walkCycle: 0,

  // 현재 커스텀 설정
  custom: {
    hairStyle: "beret", // 'beret' | 'bowl' | 'short' | 'twintail' | 'wizard'
    hairColor: 0x5c3a21,
    clothesColor: 0x2563eb,
    skinColor: 0xffdfba,
    accessory: "blush" // 'glasses' | 'blush' | 'backpack' | 'none'
  },

  create(scene, name = "책친구") {
    this.mesh = new THREE.Group();
    this.mesh.position.copy(this.position);

    this.bodyGroup = new THREE.Group();
    this.mesh.add(this.bodyGroup);

    // 저장된 커스텀 불러오기
    this.loadCustomData();

    // 1. 머리
    const headGeo = new THREE.SphereGeometry(0.85, 16, 16);
    this.headMat = new THREE.MeshLambertMaterial({ color: this.custom.skinColor });
    this.headMesh = new THREE.Mesh(headGeo, this.headMat);
    this.headMesh.position.y = 1.75;
    this.headMesh.castShadow = true;
    this.bodyGroup.add(this.headMesh);

    // 2. 눈 (똘망똘망한 검은 눈동자 + 반사광)
    this.buildEyes();

    // 3. 헤어 & 모자 그룹
    this.hairGroup = new THREE.Group();
    this.headMesh.add(this.hairGroup);
    this.buildHair(this.custom.hairStyle, this.custom.hairColor);

    // 4. 액세서리 그룹
    this.accessoryGroup = new THREE.Group();
    this.headMesh.add(this.accessoryGroup);
    this.buildAccessory(this.custom.accessory);

    // 5. 몸통 (원뿔형 통통한 옷)
    const torsoGeo = new THREE.CylinderGeometry(0.4, 0.7, 1.0, 12);
    this.torsoMat = new THREE.MeshLambertMaterial({ color: this.custom.clothesColor });
    this.torsoMesh = new THREE.Mesh(torsoGeo, this.torsoMat);
    this.torsoMesh.position.y = 0.9;
    this.torsoMesh.castShadow = true;
    this.bodyGroup.add(this.torsoMesh);

    // 6. 다리 2개
    const legGeo = new THREE.CylinderGeometry(0.16, 0.16, 0.5, 8);
    const legMat = new THREE.MeshLambertMaterial({ color: 0x334155 });
    this.leftLeg = new THREE.Mesh(legGeo, legMat);
    this.leftLeg.position.set(-0.28, 0.25, 0);
    this.rightLeg = this.leftLeg.clone();
    this.rightLeg.position.set(0.28, 0.25, 0);
    this.bodyGroup.add(this.leftLeg, this.rightLeg);

    // 7. 발밑 부드러운 그림자
    const shadowGeo = new THREE.CircleGeometry(0.75, 16);
    const shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.25 });
    const shadow = new THREE.Mesh(shadowGeo, shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.03;
    this.mesh.add(shadow);

    // 8. 머리 위 닉네임
    this.updateNameTag(name);

    scene.add(this.mesh);
    return this.mesh;
  },

  buildEyes() {
    const eyeGeo = new THREE.SphereGeometry(0.09, 8, 8);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x1e293b });
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.28, 0.05, 0.8);

    // 반사광 하이라이트
    const glintGeo = new THREE.SphereGeometry(0.03, 6, 6);
    const glintMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const glint1 = new THREE.Mesh(glintGeo, glintMat);
    glint1.position.set(-0.02, 0.03, 0.08);
    leftEye.add(glint1);

    const rightEye = leftEye.clone();
    rightEye.position.x = 0.28;
    this.headMesh.add(leftEye, rightEye);
  },

  buildHair(style, color) {
    while (this.hairGroup.children.length > 0) {
      this.hairGroup.remove(this.hairGroup.children[0]);
    }

    const hairMat = new THREE.MeshLambertMaterial({ color: color });

    if (style === "beret") {
      // 귀여운 베레모 + 앞머리
      const capGeo = new THREE.CylinderGeometry(0.9, 0.6, 0.35, 16);
      const cap = new THREE.Mesh(capGeo, hairMat);
      cap.position.set(0, 0.75, -0.05);
      cap.rotation.z = -0.15;

      const pomGeo = new THREE.SphereGeometry(0.12, 8, 8);
      const pom = new THREE.Mesh(pomGeo, hairMat);
      pom.position.set(0, 0.25, 0);
      cap.add(pom);
      this.hairGroup.add(cap);

      // 앞머리 뱅
      const bangsGeo = new THREE.BoxGeometry(0.7, 0.2, 0.2);
      const bangs = new THREE.Mesh(bangsGeo, hairMat);
      bangs.position.set(0, 0.45, 0.75);
      this.hairGroup.add(bangs);

    } else if (style === "bowl") {
      // 둥글둥글 바가지머리
      const bowlGeo = new THREE.SphereGeometry(0.92, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.6);
      const bowl = new THREE.Mesh(bowlGeo, hairMat);
      bowl.position.set(0, 0.1, 0);
      this.hairGroup.add(bowl);

    } else if (style === "twintail") {
      // 양갈래 머리
      const baseGeo = new THREE.SphereGeometry(0.9, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.55);
      const base = new THREE.Mesh(baseGeo, hairMat);
      base.position.set(0, 0.1, 0);
      this.hairGroup.add(base);

      // 좌우 묶은 꽁지
      const tailGeo = new THREE.ConeGeometry(0.25, 0.8, 8);
      const leftTail = new THREE.Mesh(tailGeo, hairMat);
      leftTail.position.set(-0.95, -0.1, -0.1);
      leftTail.rotation.z = 0.5;
      const rightTail = leftTail.clone();
      rightTail.position.x = 0.95;
      rightTail.rotation.z = -0.5;
      this.hairGroup.add(leftTail, rightTail);

    } else if (style === "wizard") {
      // 마법사 고깔모자
      const brimGeo = new THREE.CylinderGeometry(1.2, 1.2, 0.08, 16);
      const brim = new THREE.Mesh(brimGeo, hairMat);
      brim.position.set(0, 0.7, 0);

      const coneGeo = new THREE.ConeGeometry(0.7, 1.3, 12);
      const cone = new THREE.Mesh(coneGeo, hairMat);
      cone.position.set(0, 0.65, 0);
      cone.rotation.x = -0.15;
      brim.add(cone);
      this.hairGroup.add(brim);

    } else {
      // 숏컷
      const shortGeo = new THREE.SphereGeometry(0.88, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.55);
      const shortHair = new THREE.Mesh(shortGeo, hairMat);
      shortHair.position.set(0, 0.12, 0);
      this.hairGroup.add(shortHair);
    }
  },

  buildAccessory(type) {
    while (this.accessoryGroup.children.length > 0) {
      this.accessoryGroup.remove(this.accessoryGroup.children[0]);
    }

    if (type === "blush") {
      // 분홍 볼터치
      const blushGeo = new THREE.CircleGeometry(0.12, 10);
      const blushMat = new THREE.MeshBasicMaterial({ color: 0xff6b81, transparent: true, opacity: 0.65 });
      const leftB = new THREE.Mesh(blushGeo, blushMat);
      leftB.position.set(-0.48, -0.15, 0.65);
      leftB.rotation.y = -0.5;
      const rightB = leftB.clone();
      rightB.position.x = 0.48;
      rightB.rotation.y = 0.5;
      this.accessoryGroup.add(leftB, rightB);

    } else if (type === "glasses") {
      // 동글이 안경
      const frameMat = new THREE.MeshBasicMaterial({ color: 0x334155 });
      const ringGeo = new THREE.RingGeometry(0.14, 0.18, 12);
      const leftGlass = new THREE.Mesh(ringGeo, frameMat);
      leftGlass.position.set(-0.28, 0.05, 0.84);
      const rightGlass = leftGlass.clone();
      rightGlass.position.x = 0.28;

      const bridgeGeo = new THREE.BoxGeometry(0.2, 0.04, 0.02);
      const bridge = new THREE.Mesh(bridgeGeo, frameMat);
      bridge.position.set(0, 0.05, 0.84);

      this.accessoryGroup.add(leftGlass, rightGlass, bridge);

    } else if (type === "backpack") {
      // 등 뒤 네모 가방
      const packGeo = new THREE.BoxGeometry(0.65, 0.7, 0.35);
      const packMat = new THREE.MeshLambertMaterial({ color: 0xd97706 });
      const pack = new THREE.Mesh(packGeo, packMat);
      pack.position.set(0, -0.85, -0.5);
      this.headMesh.add(pack);
    }
  },

  applyCustomization(newCustom) {
    this.custom = { ...this.custom, ...newCustom };
    this.saveCustomData();

    // 1. 피부톤 갱신
    if (this.headMat) this.headMat.color.set(this.custom.skinColor);

    // 2. 옷 색상 갱신
    if (this.torsoMat) this.torsoMat.color.set(this.custom.clothesColor);

    // 3. 헤어 재구성
    this.buildHair(this.custom.hairStyle, this.custom.hairColor);

    // 4. 액세서리 재구성
    this.buildAccessory(this.custom.accessory);
  },

  loadCustomData() {
    try {
      const saved = localStorage.getItem("BV_AVATAR_CUSTOM");
      if (saved) {
        this.custom = { ...this.custom, ...JSON.parse(saved) };
      }
    } catch (e) {}
  },

  saveCustomData() {
    try {
      localStorage.setItem("BV_AVATAR_CUSTOM", JSON.stringify(this.custom));
    } catch (e) {}
  },

  updateNameTag(name) {
    if (this.nameTag) {
      this.mesh.remove(this.nameTag);
    }

    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = "rgba(16, 185, 129, 0.85)";
    ctx.roundRect(16, 8, 224, 48, 16);
    ctx.fill();

    ctx.lineWidth = 3;
    ctx.strokeStyle = "#ffffff";
    ctx.roundRect(16, 8, 224, 48, 16);
    ctx.stroke();

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 26px 'Noto Sans KR', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(name, 128, 42);

    const texture = new THREE.CanvasTexture(canvas);
    const mat = new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthTest: false });
    const geo = new THREE.PlaneGeometry(2.2, 0.55);
    this.nameTag = new THREE.Mesh(geo, mat);
    this.nameTag.position.y = 3.1;
    this.mesh.add(this.nameTag);
  },

  move(moveX, moveZ, delta, colliders = []) {
    // 1. 끼임 방지 탈출 로직 (Push-out Repulsion)
    // 캐릭터가 어떤 이유로든 충돌체 반경 내에 겹쳐있는 경우 바깥쪽으로 즉시 밀어내어 갇힘 원천 방지
    for (const col of colliders) {
      const minSafeDist = (col.radius || 3.0) + 0.85;
      const curDx = this.position.x - col.x;
      const curDz = this.position.z - col.z;
      const curDist = Math.sqrt(curDx * curDx + curDz * curDz);

      if (curDist < minSafeDist) {
        if (curDist > 0.001) {
          const pushX = (curDx / curDist) * (minSafeDist - curDist);
          const pushZ = (curDz / curDist) * (minSafeDist - curDist);
          this.position.x += pushX;
          this.position.z += pushZ;
        } else {
          // 완전 겹침 시 남쪽으로 밀어내기
          this.position.z += minSafeDist;
        }
      }
    }

    // 2. 사용자 입력에 따른 이동 처리
    if (Math.abs(moveX) > 0.001 || Math.abs(moveZ) > 0.001) {
      this.isMoving = true;

      this.targetRotation = Math.atan2(moveX, moveZ);
      let diff = this.targetRotation - this.mesh.rotation.y;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;
      this.mesh.rotation.y += diff * 12 * delta;

      const stepX = moveX * this.speed * delta;
      const stepZ = moveZ * this.speed * delta;
      const nextX = this.position.x + stepX;
      const nextZ = this.position.z + stepZ;

      // 넓어진 맵 반경(125) 적용
      const distFromCenter = Math.sqrt(nextX * nextX + nextZ * nextZ);
      if (distFromCenter < 125) {
        let canMoveX = true;
        let canMoveZ = true;

        for (const col of colliders) {
          const minSafeDist = (col.radius || 3.0) + 0.85;

          // X축 이동 시 충돌 검사
          const testX_dx = nextX - col.x;
          const testX_dz = this.position.z - col.z;
          if (Math.sqrt(testX_dx * testX_dx + testX_dz * testX_dz) < minSafeDist) {
            canMoveX = false;
          }

          // Z축 이동 시 충돌 검사
          const testZ_dx = this.position.x - col.x;
          const testZ_dz = nextZ - col.z;
          if (Math.sqrt(testZ_dx * testZ_dx + testZ_dz * testZ_dz) < minSafeDist) {
            canMoveZ = false;
          }
        }

        // X 또는 Z 축으로 독립적으로 이동 (부드러운 벽 슬라이딩)
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
      this.walkCycle += delta * 15;
      this.bodyGroup.position.y = Math.abs(Math.sin(this.walkCycle)) * 0.25;
      this.bodyGroup.rotation.z = Math.sin(this.walkCycle) * 0.14;

      if (this.leftLeg && this.rightLeg) {
        this.leftLeg.rotation.x = Math.sin(this.walkCycle) * 0.7;
        this.rightLeg.rotation.x = -Math.sin(this.walkCycle) * 0.7;
      }
    } else {
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
