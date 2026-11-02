/**
 * 3D 동물의 숲 마을 지형 & 건물 배치 모듈 (village.js)
 * - 7개 주요 건물 모델링 및 상호작용 지점 등록
 * - 오솔길, 울타리, 가로등, 꽃밭, 벚꽃잎 낙하 파티클
 */

import * as THREE from "three";
import { WorldTree } from "./tree.js";

export const VillageWorld = {
  buildings: [],
  interactables: [],
  colliders: [],
  petalParticles: null,

  build(scene) {
    this.buildings = [];
    this.interactables = [];
    this.colliders = [];

    // 1. 잔디 지형 생성 (반경 60의 둥근 섬 형태)
    this.createTerrain(scene);

    // 2. 황톳길 오솔길 시스템
    this.createPaths(scene);

    // 3. 중앙 큰 나무
    WorldTree.create(scene, new THREE.Vector3(0, 0, -2));
    this.colliders.push({ x: 0, z: -2, radius: 2.5 });

    // 4. 7개 핵심 건물 배치
    this.createBuildings(scene);

    // 5. 마을 데코레이션 (울타리, 가로등, 꽃밭)
    this.createDecorations(scene);

    // 6. 벚꽃잎 흩날리는 파티클 효과
    this.createPetalParticles(scene);
  },

  createTerrain(scene) {
    // 둥근 푸른 언덕 지형
    const groundGeo = new THREE.CylinderGeometry(50, 52, 2, 48);
    const groundMat = new THREE.MeshLambertMaterial({ color: 0x78c850 }); // 상큼한 연두 잔디색
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.position.y = -1;
    ground.receiveShadow = true;
    scene.add(ground);

    // 물결치는 강/바다 테두리
    const waterGeo = new THREE.RingGeometry(51, 80, 48);
    const waterMat = new THREE.MeshLambertMaterial({ color: 0x5bc0eb, side: THREE.DoubleSide });
    const water = new THREE.Mesh(waterGeo, waterMat);
    water.rotation.x = -Math.PI / 2;
    water.position.y = -1.5;
    scene.add(water);
  },

  createPaths(scene) {
    const pathMat = new THREE.MeshLambertMaterial({ color: 0xe8c792, roughness: 0.9 });

    // 중앙 메인 도로
    const mainPath = new THREE.Mesh(new THREE.PlaneGeometry(5, 36), pathMat);
    mainPath.rotation.x = -Math.PI / 2;
    mainPath.position.set(0, 0.02, 6);
    mainPath.receiveShadow = true;
    scene.add(mainPath);

    // 좌우 가로지르는 길
    const crossPath = new THREE.Mesh(new THREE.PlaneGeometry(36, 4.5), pathMat);
    crossPath.rotation.x = -Math.PI / 2;
    crossPath.position.set(0, 0.02, 3);
    crossPath.receiveShadow = true;
    scene.add(crossPath);

    // 북쪽 도서관/우체국 연결길
    const northCross = new THREE.Mesh(new THREE.PlaneGeometry(34, 4), pathMat);
    northCross.rotation.x = -Math.PI / 2;
    northCross.position.set(0, 0.02, -12);
    northCross.receiveShadow = true;
    scene.add(northCross);
  },

  createBuildings(scene) {
    const buildingDefs = [
      {
        id: "library",
        name: "도서관",
        desc: "새 책 검색 & 완독 등록",
        pos: [-14, 0, -14],
        wallColor: 0xfff0db,
        roofColor: 0x3b82f6, // 파란 지붕
        icon: "📚"
      },
      {
        id: "postOffice",
        name: "우체국",
        desc: "책 꼬리잇기 릴레이",
        pos: [14, 0, -14],
        wallColor: 0xfff0db,
        roofColor: 0xef4444, // 빨간 지붕
        icon: "📮"
      },
      {
        id: "feed",
        name: "마을 광장",
        desc: "우리 반 한 줄 피드",
        pos: [0, 0, 8],
        isPlaza: true,
        icon: "💬"
      },
      {
        id: "broadcast",
        name: "방송국",
        desc: "가상 인터뷰 & 핫비평",
        pos: [-16, 0, 8],
        wallColor: 0xffe6e6,
        roofColor: 0xf59e0b, // 주황 지붕
        icon: "🎙️"
      },
      {
        id: "blindForest",
        name: "비밀의 숲",
        desc: "블라인드 북 탐험",
        pos: [16, 0, 8],
        wallColor: 0xecfdf5,
        roofColor: 0x10b981, // 초록 지붕
        icon: "✨"
      },
      {
        id: "myLibrary",
        name: "내 서재",
        desc: "내 기록 & 아바타 방",
        pos: [0, 0, 18],
        wallColor: 0xfef3c7,
        roofColor: 0xec4899, // 분홍 지붕
        icon: "🏡"
      },
      {
        id: "admin",
        name: "교무실",
        desc: "선생님 관리자 설정",
        pos: [-22, 0, -3],
        wallColor: 0xf1f5f9,
        roofColor: 0x64748b, // 짙은 회색 지붕
        icon: "📋"
      }
    ];

    buildingDefs.forEach(def => {
      if (def.isPlaza) {
        // 마을 광장 게시판 & 분수대
        this.createPlazaCenter(scene, def);
      } else {
        this.createHouse(scene, def);
      }
    });
  },

  createHouse(scene, def) {
    const group = new THREE.Group();
    group.position.set(def.pos[0], def.pos[1], def.pos[2]);

    // 1. 벽체
    const wallGeo = new THREE.BoxGeometry(6, 4, 5);
    const wallMat = new THREE.MeshLambertMaterial({ color: def.wallColor });
    const wall = new THREE.Mesh(wallGeo, wallMat);
    wall.position.y = 2;
    wall.castShadow = true;
    wall.receiveShadow = true;
    group.add(wall);

    // 2. 삼각 박공 지붕
    const roofGeo = new THREE.ConeGeometry(5.2, 2.5, 4);
    const roofMat = new THREE.MeshLambertMaterial({ color: def.roofColor });
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.y = 5.25;
    roof.rotation.y = Math.PI / 4;
    roof.scale.set(1.1, 1, 0.9);
    roof.castShadow = true;
    group.add(roof);

    // 3. 문 & 창문
    const doorGeo = new THREE.PlaneGeometry(1.4, 2.2);
    const doorMat = new THREE.MeshLambertMaterial({ color: 0x8b5a2b });
    const door = new THREE.Mesh(doorGeo, doorMat);
    door.position.set(0, 1.1, 2.52);
    group.add(door);

    // 4. 간판 표식 (건물 이름 & 이모지)
    const signGroup = this.createBuildingSign(def.name, def.icon);
    signGroup.position.set(0, 4.4, 2.6);
    group.add(signGroup);

    scene.add(group);

    // 충돌체 등록
    this.colliders.push({
      x: def.pos[0],
      z: def.pos[2],
      radius: 3.5
    });

    // 상호작용 트리거 지점 등록 (문 앞)
    this.interactables.push({
      id: def.id,
      name: def.name,
      desc: def.desc,
      x: def.pos[0],
      z: def.pos[2] + 3.8,
      radius: 2.5
    });
  },

  createPlazaCenter(scene, def) {
    const group = new THREE.Group();
    group.position.set(def.pos[0], def.pos[1], def.pos[2]);

    // 광장 시계탑/게시판 오브젝트
    const boardGeo = new THREE.BoxGeometry(4, 2.5, 0.4);
    const boardMat = new THREE.MeshLambertMaterial({ color: 0xdeb887 });
    const board = new THREE.Mesh(boardGeo, boardMat);
    board.position.y = 2.2;
    board.castShadow = true;
    group.add(board);

    // 게시판 다리 2개
    const legGeo = new THREE.CylinderGeometry(0.15, 0.15, 2.2);
    const legMat = new THREE.MeshLambertMaterial({ color: 0x8b5a2b });
    const leg1 = new THREE.Mesh(legGeo, legMat);
    leg1.position.set(-1.4, 1.1, 0);
    const leg2 = leg1.clone();
    leg2.position.set(1.4, 1.1, 0);
    group.add(leg1, leg2);

    // 간판 표식
    const sign = this.createBuildingSign("마을 광장 피드", "💬");
    sign.position.set(0, 3.8, 0);
    group.add(sign);

    scene.add(group);

    this.colliders.push({ x: def.pos[0], z: def.pos[2], radius: 2.0 });
    this.interactables.push({
      id: def.id,
      name: def.name,
      desc: def.desc,
      x: def.pos[0],
      z: def.pos[2] + 2.0,
      radius: 2.5
    });
  },

  createBuildingSign(title, icon) {
    // 캔버스 텍스처로 텍스트 렌더링
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 128;
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
    ctx.roundRect(8, 8, 240, 112, 16);
    ctx.fill();

    ctx.lineWidth = 4;
    ctx.strokeStyle = "#10b981";
    ctx.roundRect(8, 8, 240, 112, 16);
    ctx.stroke();

    ctx.fillStyle = "#1e293b";
    ctx.font = "bold 36px 'Noto Sans KR', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`${icon} ${title}`, 128, 74);

    const texture = new THREE.CanvasTexture(canvas);
    const mat = new THREE.MeshBasicMaterial({ map: texture, transparent: true });
    const geo = new THREE.PlaneGeometry(2.4, 1.2);
    const mesh = new THREE.Mesh(geo, mat);
    return mesh;
  },

  createDecorations(scene) {
    // 오솔길 양옆 가로등 4개
    const lampPositions = [
      [-3.5, 0, 0], [3.5, 0, 0],
      [-3.5, 0, 12], [3.5, 0, 12]
    ];

    lampPositions.forEach(pos => {
      const lamp = new THREE.Group();
      lamp.position.set(pos[0], pos[1], pos[2]);

      const post = new THREE.Mesh(
        new THREE.CylinderGeometry(0.1, 0.12, 3.5),
        new THREE.MeshLambertMaterial({ color: 0x334155 })
      );
      post.position.y = 1.75;
      post.castShadow = true;
      lamp.add(post);

      const bulb = new THREE.Mesh(
        new THREE.SphereGeometry(0.35, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xfef08a })
      );
      bulb.position.y = 3.6;
      lamp.add(bulb);

      scene.add(lamp);
      this.colliders.push({ x: pos[0], z: pos[2], radius: 0.6 });
    });
  },

  createPetalParticles(scene) {
    const count = 120;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const speeds = [];

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 60;
      positions[i * 3 + 1] = Math.random() * 20;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 60;

      speeds.push({
        y: 0.8 + Math.random() * 1.2,
        x: (Math.random() - 0.5) * 0.5,
        rot: Math.random() * Math.PI
      });
    }

    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));

    const mat = new THREE.PointsMaterial({
      color: 0xffb7c5, // 연분홍 벚꽃색
      size: 0.45,
      transparent: true,
      opacity: 0.85
    });

    this.petalParticles = new THREE.Points(geo, mat);
    this.petalSpeeds = speeds;
    scene.add(this.petalParticles);
  },

  update(delta) {
    WorldTree.update(delta);

    // 벚꽃잎 낙하 파티클 애니메이션
    if (this.petalParticles) {
      const pos = this.petalParticles.geometry.attributes.position.array;
      for (let i = 0; i < this.petalSpeeds.length; i++) {
        pos[i * 3 + 1] -= this.petalSpeeds[i].y * delta;
        pos[i * 3] += Math.sin(pos[i * 3 + 1] * 0.5) * delta * 0.8;

        // 바닥에 닿으면 하늘 위로 리스폰
        if (pos[i * 3 + 1] < 0) {
          pos[i * 3 + 1] = 20;
          pos[i * 3] = (Math.random() - 0.5) * 60;
          pos[i * 3 + 2] = (Math.random() - 0.5) * 60;
        }
      }
      this.petalParticles.geometry.attributes.position.needsUpdate = true;
    }
  }
};
