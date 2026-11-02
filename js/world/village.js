/**
 * 동화적인 분위기의 고품질 3D 책마을 월드 (village.js)
 * - 맵 반경 140의 광활하고 자연스러운 동물의 숲형 마을
 * - 고급스러운 동화풍 건물 디테일 (석조 기단, 굴뚝 연기, 발광 격자창, 처마, 특색 조각)
 * - 풍차(회전 날개 애니메이션), 호수 & 아치형 나무 다리, 튤립/라벤더 꽃밭 단지
 * - 피크닉 가제보, 캠프파이어, 과일나무 숲(사과/오렌지/벚나무), 가로등 & 벚꽃 파티클
 */

import * as THREE from "three";
import { WorldTree } from "./tree.js";

export const VillageWorld = {
  buildings: [],
  interactables: [],
  colliders: [],
  windmillBlades: null,
  petalParticles: null,
  smokeParticles: [],

  build(scene) {
    this.buildings = [];
    this.interactables = [];
    this.colliders = [];
    this.smokeParticles = [];

    // 1. 대형 섬 지형 (반경 140)
    this.createTerrain(scene);

    // 2. 오솔길 네트워크
    this.createPaths(scene);

    // 3. 중앙 큰 지혜의 나무 (중앙 북쪽)
    WorldTree.create(scene, new THREE.Vector3(0, 0, -8));
    this.colliders.push({ x: 0, z: -8, radius: 4.5 });

    // 4. 고급 동화풍 7개 건물 배치
    this.createFairyBuildings(scene);

    // 5. 호수 & 아치형 나무 다리
    this.createLakeAndBridge(scene);

    // 6. 회전하는 동화풍 풍차
    this.createWindmill(scene, new THREE.Vector3(72, 0, -12));

    // 7. 대형 꽃밭 단지 (튤립, 라벤더, 데이지)
    this.createFlowerGardens(scene);

    // 8. 피크닉 정자(가제보) & 캠프파이어 터
    this.createGazebo(scene, new THREE.Vector3(-45, 0, 10));
    this.createCampfire(scene, new THREE.Vector3(32, 0, 20));

    // 9. 과일나무 숲 & 가로등
    this.createOrchardTrees(scene);
    this.createStreetLamps(scene);

    // 10. 벚꽃잎 낙하 파티클
    this.createPetalParticles(scene);
  },

  createTerrain(scene) {
    // 둥근 대지 (반경 135)
    const groundGeo = new THREE.CylinderGeometry(135, 140, 4, 64);
    const groundMat = new THREE.MeshLambertMaterial({ color: 0x6ebd44 }); // 푸르고 따뜻한 잔디색
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.position.y = -2;
    ground.receiveShadow = true;
    scene.add(ground);

    // 섬을 감싸는 맑은 에메랄드 호수/바다
    const waterGeo = new THREE.RingGeometry(136, 220, 64);
    const waterMat = new THREE.MeshLambertMaterial({ 
      color: 0x48cae4, 
      side: THREE.DoubleSide, 
      transparent: true, 
      opacity: 0.85 
    });
    const water = new THREE.Mesh(waterGeo, waterMat);
    water.rotation.x = -Math.PI / 2;
    water.position.y = -2.8;
    scene.add(water);
  },

  createPaths(scene) {
    const pathMat = new THREE.MeshLambertMaterial({ color: 0xecd1a4, roughness: 0.95 });

    // 1. 중앙 남북 메인 오솔길
    const mainPath = new THREE.Mesh(new THREE.PlaneGeometry(8, 120), pathMat);
    mainPath.rotation.x = -Math.PI / 2;
    mainPath.position.set(0, 0.02, 10);
    mainPath.receiveShadow = true;
    scene.add(mainPath);

    // 2. 동서 횡단길
    const crossPath = new THREE.Mesh(new THREE.PlaneGeometry(130, 7), pathMat);
    crossPath.rotation.x = -Math.PI / 2;
    crossPath.position.set(0, 0.02, 15);
    crossPath.receiveShadow = true;
    scene.add(crossPath);

    // 3. 북쪽 도서관 - 우체국 연결길
    const northPath = new THREE.Mesh(new THREE.PlaneGeometry(110, 6), pathMat);
    northPath.rotation.x = -Math.PI / 2;
    northPath.position.set(0, 0.02, -35);
    northPath.receiveShadow = true;
    scene.add(northPath);
  },

  createFairyBuildings(scene) {
    const defs = [
      {
        id: "library",
        name: "책마을 도서관",
        desc: "새 도서 검색 & 완독 기록",
        pos: [-44, 0, -42],
        wallColor: 0xfff8ee,
        beamColor: 0x8b5a2b,
        roofColor: 0x2563eb, // 깊고 클래식한 코발트 블루
        icon: "📚",
        extraType: "libraryBook"
      },
      {
        id: "postOffice",
        name: "책마을 우체국",
        desc: "감동 릴레이 책 꼬리잇기",
        pos: [44, 0, -42],
        wallColor: 0xfff5eb,
        beamColor: 0x8b5a2b,
        roofColor: 0xdc2626, // 따뜻한 우체국 레드
        icon: "📮",
        extraType: "mailbox"
      },
      {
        id: "feed",
        name: "마을 중앙 광장",
        desc: "우리 반 한 줄 피드 & 시계탑",
        pos: [0, 0, 18],
        isPlaza: true,
        icon: "💬"
      },
      {
        id: "broadcast",
        name: "책마을 방송국",
        desc: "가상 인터뷰 & 핫비평",
        pos: [-48, 0, 35],
        wallColor: 0xffeedd,
        beamColor: 0x6b4226,
        roofColor: 0xf59e0b, // 따뜻한 호박 주황
        icon: "🎙️",
        extraType: "antenna"
      },
      {
        id: "blindForest",
        name: "비밀의 숲 오두막",
        desc: "블라인드 북 미스터리 퀴즈",
        pos: [48, 0, 35],
        wallColor: 0xe6f4ea,
        beamColor: 0x4a3728,
        roofColor: 0x059669, // 싱그러운 숲속 에메랄드
        icon: "🔮",
        extraType: "magicVines"
      },
      {
        id: "myLibrary",
        name: "나의 아늑한 서재",
        desc: "내 서재 & 캐릭터 꾸미기 옷장",
        pos: [0, 0, 68],
        wallColor: 0xfff0f5,
        beamColor: 0x8b5a2b,
        roofColor: 0xec4899, // 사랑스러운 로즈 핑크
        icon: "🏡",
        extraType: "flowerBoxes"
      },
      {
        id: "admin",
        name: "선생님 교무실",
        desc: "학생 CSV 일괄 생성 & 관리",
        pos: [-68, 0, -6],
        wallColor: 0xf1f5f9,
        beamColor: 0x334155,
        roofColor: 0x475569, // 품격 있는 슬레이트 그레이
        icon: "🏫",
        extraType: "bellTower"
      }
    ];

    defs.forEach(def => {
      if (def.isPlaza) {
        this.createPlazaLandmark(scene, def);
      } else {
        this.createFairyCottage(scene, def);
      }
    });
  },

  createFairyCottage(scene, def) {
    const cottage = new THREE.Group();
    cottage.position.set(def.pos[0], def.pos[1], def.pos[2]);

    // 1. 석조 기단 (Stone Foundation)
    const baseGeo = new THREE.BoxGeometry(9.4, 0.8, 8.4);
    const baseMat = new THREE.MeshLambertMaterial({ color: 0x94a3b8 });
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.y = 0.4;
    base.castShadow = true;
    base.receiveShadow = true;
    cottage.add(base);

    // 현관 돌계단 2칸
    const stepGeo = new THREE.BoxGeometry(3.0, 0.35, 1.2);
    const step = new THREE.Mesh(stepGeo, baseMat);
    step.position.set(0, 0.2, 4.6);
    step.receiveShadow = true;
    cottage.add(step);

    // 2. 메인 회벽 (Plaster Wall)
    const wallGeo = new THREE.BoxGeometry(8.6, 5.0, 7.6);
    const wallMat = new THREE.MeshLambertMaterial({ color: def.wallColor });
    const wall = new THREE.Mesh(wallGeo, wallMat);
    wall.position.y = 3.3;
    wall.castShadow = true;
    wall.receiveShadow = true;
    cottage.add(wall);

    // 3. 목조 코너 기둥들 (Timber Beams)
    const beamMat = new THREE.MeshLambertMaterial({ color: def.beamColor });
    const corners = [
      [-4.3, 3.3, -3.8], [4.3, 3.3, -3.8],
      [-4.3, 3.3, 3.8], [4.3, 3.3, 3.8]
    ];
    corners.forEach(cp => {
      const colGeo = new THREE.BoxGeometry(0.5, 5.0, 0.5);
      const col = new THREE.Mesh(colGeo, beamMat);
      col.position.set(cp[0], cp[1], cp[2]);
      cottage.add(col);
    });

    // 4. 동화풍 곡면 박공 지붕 (Gable Roof with Eaves)
    const roofGroup = new THREE.Group();
    roofGroup.position.set(0, 6.2, 0);

    const roofGeo = new THREE.ConeGeometry(7.0, 3.8, 4);
    const roofMat = new THREE.MeshLambertMaterial({ color: def.roofColor });
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.rotation.y = Math.PI / 4;
    roof.scale.set(1.2, 1.0, 0.95);
    roof.castShadow = true;
    roofGroup.add(roof);

    // 처마 테두리
    const trimGeo = new THREE.BoxGeometry(9.6, 0.4, 8.6);
    const trimMat = new THREE.MeshLambertMaterial({ color: def.beamColor });
    const trim = new THREE.Mesh(trimGeo, trimMat);
    trim.position.y = -0.1;
    roofGroup.add(trim);
    cottage.add(roofGroup);

    // 5. 굴뚝 (Chimney) & 연기 파티클
    const chimneyGeo = new THREE.BoxGeometry(1.2, 3.2, 1.2);
    const chimneyMat = new THREE.MeshLambertMaterial({ color: 0xa855f7 });
    const chimney = new THREE.Mesh(chimneyGeo, chimneyMat);
    chimney.position.set(2.8, 7.5, -1.8);
    chimney.castShadow = true;
    cottage.add(chimney);

    // 굴뚝 연기 파티클 생성기 등록
    this.createChimneySmoke(cottage, new THREE.Vector3(2.8, 9.2, -1.8));

    // 6. 아치형 앤틱 나무 문 & 손잡이
    const doorGeo = new THREE.BoxGeometry(1.8, 3.0, 0.2);
    const doorMat = new THREE.MeshLambertMaterial({ color: 0x5c3a21 });
    const door = new THREE.Mesh(doorGeo, doorMat);
    door.position.set(0, 2.3, 3.9);
    cottage.add(door);

    const handleGeo = new THREE.SphereGeometry(0.1, 8, 8);
    const handleMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
    const handle = new THREE.Mesh(handleGeo, handleMat);
    handle.position.set(0.6, 2.3, 4.02);
    cottage.add(handle);

    // 7. 따뜻하게 빛나는 격자 창문들 (Glowing Windows)
    const winMat = new THREE.MeshBasicMaterial({ color: 0xfef08a }); // 은은한 촛불/램프 노란빛
    const frameMat = new THREE.MeshLambertMaterial({ color: 0x5c3a21 });

    const winPositions = [
      [-2.4, 3.0, 3.86], [2.4, 3.0, 3.86], // 전면 창문 2개
      [-4.32, 3.2, 0], [4.32, 3.2, 0]      // 좌우 측면 창문
    ];

    winPositions.forEach((wp, idx) => {
      const winGeo = new THREE.PlaneGeometry(1.3, 1.6);
      const win = new THREE.Mesh(winGeo, winMat);
      win.position.set(wp[0], wp[1], wp[2]);
      if (idx === 2) win.rotation.y = -Math.PI / 2;
      if (idx === 3) win.rotation.y = Math.PI / 2;

      // 창문 십자 격자
      const hBar = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.08, 0.04), frameMat);
      const vBar = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.6, 0.04), frameMat);
      win.add(hBar, vBar);

      cottage.add(win);
    });

    // 8. 건물별 특색 장식 (Extra details)
    this.addBuildingExtras(cottage, def);

    // 9. 건물 앞 입체 간판 & 이모지
    const sign = this.createFairySign(def.name, def.icon);
    sign.position.set(0, 5.8, 4.1);
    cottage.add(sign);

    scene.add(cottage);

    // 충돌체 등록
    this.colliders.push({
      x: def.pos[0],
      z: def.pos[2],
      radius: 5.5
    });

    // 상호작용 트리거 지점 (문 앞)
    this.interactables.push({
      id: def.id,
      name: def.name,
      desc: def.desc,
      x: def.pos[0],
      z: def.pos[2] + 5.5,
      radius: 4.0
    });
  },

  addBuildingExtras(cottage, def) {
    if (def.extraType === "libraryBook") {
      // 도서관 지붕 위 거대한 마법의 책 조각
      const bookGeo = new THREE.BoxGeometry(2.4, 0.4, 1.8);
      const bookMat = new THREE.MeshLambertMaterial({ color: 0xfacc15 });
      const book = new THREE.Mesh(bookGeo, bookMat);
      book.position.set(0, 8.5, 0);
      book.rotation.z = 0.2;
      cottage.add(book);

    } else if (def.extraType === "mailbox") {
      // 우체국 앞 귀여운 빨간 우체통
      const postGeo = new THREE.CylinderGeometry(0.35, 0.35, 1.4, 12);
      const postMat = new THREE.MeshLambertMaterial({ color: 0xef4444 });
      const post = new THREE.Mesh(postGeo, postMat);
      post.position.set(3.2, 0.7, 4.8);
      post.castShadow = true;
      cottage.add(post);

    } else if (def.extraType === "antenna") {
      // 방송국 지붕 라디오 안테나
      const antGeo = new THREE.CylinderGeometry(0.06, 0.08, 2.5);
      const antMat = new THREE.MeshLambertMaterial({ color: 0x475569 });
      const ant = new THREE.Mesh(antGeo, antMat);
      ant.position.set(0, 9.2, 0);
      cottage.add(ant);

      const dishGeo = new THREE.SphereGeometry(0.6, 8, 8, 0, Math.PI);
      const dish = new THREE.Mesh(dishGeo, antMat);
      dish.position.set(0, 9.6, 0);
      dish.rotation.x = Math.PI / 4;
      cottage.add(dish);

    } else if (def.extraType === "flowerBoxes") {
      // 내 서재 창문 밑 꽃 화분
      const boxGeo = new THREE.BoxGeometry(1.6, 0.35, 0.4);
      const boxMat = new THREE.MeshLambertMaterial({ color: 0x854d0e });
      const box1 = new THREE.Mesh(boxGeo, boxMat);
      box1.position.set(-2.4, 2.0, 4.0);
      const box2 = box1.clone();
      box2.position.x = 2.4;
      cottage.add(box1, box2);

    } else if (def.extraType === "bellTower") {
      // 교무실 시계 종탑
      const towerGeo = new THREE.BoxGeometry(2.4, 3.2, 2.4);
      const towerMat = new THREE.MeshLambertMaterial({ color: 0x475569 });
      const tower = new THREE.Mesh(towerGeo, towerMat);
      tower.position.set(0, 8.8, 0);

      const clockGeo = new THREE.CircleGeometry(0.7, 16);
      const clockMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const clock = new THREE.Mesh(clockGeo, clockMat);
      clock.position.set(0, 0.3, 1.22);
      tower.add(clock);
      cottage.add(tower);
    }
  },

  createChimneySmoke(parent, pos) {
    const count = 5;
    const smokeGroup = new THREE.Group();
    smokeGroup.position.copy(pos);

    const puffs = [];
    for (let i = 0; i < count; i++) {
      const geo = new THREE.SphereGeometry(0.35 + i * 0.1, 8, 8);
      const mat = new THREE.MeshBasicMaterial({ 
        color: 0xffffff, 
        transparent: true, 
        opacity: 0.65 - i * 0.1 
      });
      const puff = new THREE.Mesh(geo, mat);
      puff.position.set(
        (Math.random() - 0.5) * 0.3,
        i * 0.6,
        (Math.random() - 0.5) * 0.3
      );
      smokeGroup.add(puff);
      puffs.push({ mesh: puff, baseOffset: i * 0.6 });
    }

    parent.add(smokeGroup);
    this.smokeParticles.push({ group: smokeGroup, puffs });
  },

  createPlazaLandmark(scene, def) {
    const plaza = new THREE.Group();
    plaza.position.set(def.pos[0], def.pos[1], def.pos[2]);

    // 1. 대형 원형 석조 광장 바닥
    const baseGeo = new THREE.CylinderGeometry(14, 14.5, 0.4, 32);
    const baseMat = new THREE.MeshLambertMaterial({ color: 0xd4b886 });
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.y = 0.2;
    base.receiveShadow = true;
    plaza.add(base);

    // 2. 광장 중앙 분수대 (Water Fountain)
    const fountainRim = new THREE.Mesh(
      new THREE.CylinderGeometry(4.2, 4.4, 1.2, 24),
      new THREE.MeshLambertMaterial({ color: 0x94a3b8 })
    );
    fountainRim.position.y = 0.8;
    fountainRim.castShadow = true;
    plaza.add(fountainRim);

    // 분수대 물
    const fountainWater = new THREE.Mesh(
      new THREE.CircleGeometry(4.0, 24),
      new THREE.MeshLambertMaterial({ color: 0x38bdf8 })
    );
    fountainWater.rotation.x = -Math.PI / 2;
    fountainWater.position.y = 1.35;
    plaza.add(fountainWater);

    // 분수대 중심 기둥
    const pillar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.6, 0.9, 2.8, 12),
      new THREE.MeshLambertMaterial({ color: 0x94a3b8 })
    );
    pillar.position.y = 2.4;
    pillar.castShadow = true;
    plaza.add(pillar);

    // 3. 광장 대형 게시판 (한 줄 피드 알림판)
    const boardGroup = new THREE.Group();
    boardGroup.position.set(0, 0, 7.5);

    const board = new THREE.Mesh(
      new THREE.BoxGeometry(6.5, 3.8, 0.4),
      new THREE.MeshLambertMaterial({ color: 0x8b5a2b })
    );
    board.position.y = 3.2;
    board.castShadow = true;
    boardGroup.add(board);

    const sign = this.createFairySign("마을 광장 피드", "💬");
    sign.position.set(0, 5.5, 0.25);
    boardGroup.add(sign);
    plaza.add(boardGroup);

    scene.add(plaza);

    this.colliders.push({ x: def.pos[0], z: def.pos[2], radius: 4.8 });
    this.interactables.push({
      id: def.id,
      name: def.name,
      desc: def.desc,
      x: def.pos[0],
      z: def.pos[2] + 9.5,
      radius: 4.0
    });
  },

  createFairySign(title, icon) {
    const canvas = document.createElement("canvas");
    canvas.width = 300;
    canvas.height = 130;
    const ctx = canvas.getContext("2d");

    // 동화풍 말풍선 간판
    ctx.fillStyle = "#ffffff";
    ctx.roundRect(10, 10, 280, 110, 24);
    ctx.fill();

    ctx.lineWidth = 6;
    ctx.strokeStyle = "#10b981";
    ctx.roundRect(10, 10, 280, 110, 24);
    ctx.stroke();

    ctx.fillStyle = "#0f172a";
    ctx.font = "bold 40px 'Noto Sans KR', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`${icon} ${title}`, 150, 78);

    const texture = new THREE.CanvasTexture(canvas);
    const mat = new THREE.MeshBasicMaterial({ map: texture, transparent: true });
    const geo = new THREE.PlaneGeometry(3.6, 1.6);
    return new THREE.Mesh(geo, mat);
  },

  createLakeAndBridge(scene) {
    // 동남쪽 연못/호수 (반경 18)
    const lakeCenter = new THREE.Vector3(26, -0.1, -12);
    const lakeGeo = new THREE.CircleGeometry(16, 32);
    const lakeMat = new THREE.MeshLambertMaterial({ 
      color: 0x38bdf8, 
      transparent: true, 
      opacity: 0.88 
    });
    const lake = new THREE.Mesh(lakeGeo, lakeMat);
    lake.rotation.x = -Math.PI / 2;
    lake.position.copy(lakeCenter);
    scene.add(lake);

    // 호수 주변 수련/연꽃 잎 6개
    const padMat = new THREE.MeshLambertMaterial({ color: 0x22c55e });
    for (let i = 0; i < 6; i++) {
      const pad = new THREE.Mesh(new THREE.CircleGeometry(0.9, 8), padMat);
      pad.rotation.x = -Math.PI / 2;
      pad.position.set(
        lakeCenter.x + Math.sin(i * 1.1) * 8,
        0.02,
        lakeCenter.z + Math.cos(i * 1.1) * 8
      );
      scene.add(pad);
    }

    // 아치형 나무 다리 (Wooden Bridge)
    const bridgeGroup = new THREE.Group();
    bridgeGroup.position.set(lakeCenter.x, 0.6, lakeCenter.z);

    const deckGeo = new THREE.BoxGeometry(4.5, 0.35, 14);
    const deckMat = new THREE.MeshLambertMaterial({ color: 0x8b5a2b });
    const deck = new THREE.Mesh(deckGeo, deckMat);
    deck.position.y = 0.6;
    deck.castShadow = true;
    bridgeGroup.add(deck);

    // 다리 난간 2개
    const railMat = new THREE.MeshLambertMaterial({ color: 0x6b4226 });
    const rail1 = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.9, 14), railMat);
    rail1.position.set(-2.1, 1.2, 0);
    const rail2 = rail1.clone();
    rail2.position.x = 2.1;
    bridgeGroup.add(rail1, rail2);

    scene.add(bridgeGroup);
    this.colliders.push({ x: lakeCenter.x - 7, z: lakeCenter.z, radius: 4.5 });
    this.colliders.push({ x: lakeCenter.x + 7, z: lakeCenter.z, radius: 4.5 });
  },

  createWindmill(scene, pos) {
    const wm = new THREE.Group();
    wm.position.copy(pos);

    // 풍차 둥근 원뿔 몸통
    const bodyGeo = new THREE.CylinderGeometry(3.0, 4.8, 14, 16);
    const bodyMat = new THREE.MeshLambertMaterial({ color: 0xfffbeb });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 7.0;
    body.castShadow = true;
    wm.add(body);

    // 원뿔 지붕
    const roofGeo = new THREE.ConeGeometry(3.6, 4.0, 16);
    const roofMat = new THREE.MeshLambertMaterial({ color: 0xb91c1c });
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.y = 16.0;
    roof.castShadow = true;
    wm.add(roof);

    // 회전하는 4개 날개 (Windmill Blades)
    this.windmillBlades = new THREE.Group();
    this.windmillBlades.position.set(0, 13.5, 3.2);

    const bladeMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
    const centerPin = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.6, 8), bladeMat);
    centerPin.rotation.x = Math.PI / 2;
    this.windmillBlades.add(centerPin);

    for (let i = 0; i < 4; i++) {
      const bladeArm = new THREE.Mesh(new THREE.BoxGeometry(0.9, 6.5, 0.1), bladeMat);
      bladeArm.position.y = 3.5;
      bladeArm.castShadow = true;

      const pivot = new THREE.Group();
      pivot.rotation.z = (Math.PI / 2) * i;
      pivot.add(bladeArm);
      this.windmillBlades.add(pivot);
    }

    wm.add(this.windmillBlades);
    scene.add(wm);

    this.colliders.push({ x: pos.x, z: pos.z, radius: 5.5 });
  },

  createFlowerGardens(scene) {
    const plots = [
      { x: -18, z: -15, color: 0xef4444, name: "빨간 튤립밭" },
      { x: -18, z: 2, color: 0xf59e0b, name: "해바라기 꽃밭" },
      { x: 18, z: -15, color: 0xa855f7, name: "라벤더 꽃밭" },
      { x: 18, z: 2, color: 0xffffff, name: "화이트 데이지밭" }
    ];

    plots.forEach(p => {
      // 화단 흙 베이스
      const bed = new THREE.Mesh(
        new THREE.BoxGeometry(8, 0.2, 8),
        new THREE.MeshLambertMaterial({ color: 0x78350f })
      );
      bed.position.set(p.x, 0.1, p.z);
      bed.receiveShadow = true;
      scene.add(bed);

      // 울타리 4면
      const fenceMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
      const f1 = new THREE.Mesh(new THREE.BoxGeometry(8.2, 0.6, 0.2), fenceMat);
      f1.position.set(p.x, 0.4, p.z - 4.1);
      const f2 = f1.clone();
      f2.position.z = p.z + 4.1;
      const f3 = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.6, 8.2), fenceMat);
      f3.position.set(p.x - 4.1, 0.4, p.z);
      const f4 = f3.clone();
      f4.position.x = p.x + 4.1;
      scene.add(f1, f2, f3, f4);

      // 화단 속 꽃송이 12개 인스턴스
      const flowerMat = new THREE.MeshLambertMaterial({ color: p.color });
      for (let fx = -2.5; fx <= 2.5; fx += 1.8) {
        for (let fz = -2.5; fz <= 2.5; fz += 1.8) {
          const stem = new THREE.Mesh(
            new THREE.CylinderGeometry(0.04, 0.04, 0.6),
            new THREE.MeshLambertMaterial({ color: 0x22c55e })
          );
          stem.position.set(p.x + fx, 0.4, p.z + fz);

          const blossom = new THREE.Mesh(
            new THREE.SphereGeometry(0.25, 6, 6),
            flowerMat
          );
          blossom.position.y = 0.35;
          stem.add(blossom);
          scene.add(stem);
        }
      }

      this.colliders.push({ x: p.x, z: p.z, radius: 4.2 });
    });
  },

  createGazebo(scene, pos) {
    const gz = new THREE.Group();
    gz.position.copy(pos);

    // 8각 바닥
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(5.0, 5.2, 0.5, 8),
      new THREE.MeshLambertMaterial({ color: 0xdeb887 })
    );
    base.position.y = 0.25;
    gz.add(base);

    // 지붕 & 기둥 6개
    const roof = new THREE.Mesh(
      new THREE.ConeGeometry(5.8, 3.2, 8),
      new THREE.MeshLambertMaterial({ color: 0x10b981 })
    );
    roof.position.y = 5.2;
    roof.castShadow = true;
    gz.add(roof);

    const pillarMat = new THREE.MeshLambertMaterial({ color: 0x8b5a2b });
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const pil = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 3.6), pillarMat);
      pil.position.set(Math.cos(angle) * 4.2, 2.0, Math.sin(angle) * 4.2);
      gz.add(pil);
    }

    // 중앙 원형 티테이블
    const table = new THREE.Mesh(
      new THREE.CylinderGeometry(1.4, 1.4, 1.2, 12),
      pillarMat
    );
    table.position.y = 0.8;
    gz.add(table);

    scene.add(gz);
    this.colliders.push({ x: pos.x, z: pos.z, radius: 4.8 });
  },

  createCampfire(scene, pos) {
    const cf = new THREE.Group();
    cf.position.copy(pos);

    // 돌 테두리
    const stoneMat = new THREE.MeshLambertMaterial({ color: 0x64748b });
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const stone = new THREE.Mesh(new THREE.DodecahedronGeometry(0.4), stoneMat);
      stone.position.set(Math.cos(angle) * 1.5, 0.3, Math.sin(angle) * 1.5);
      cf.add(stone);
    }

    // 장작더미
    const woodMat = new THREE.MeshLambertMaterial({ color: 0x451a03 });
    const w1 = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 1.8), woodMat);
    w1.rotation.z = Math.PI / 4;
    w1.position.y = 0.35;
    const w2 = w1.clone();
    w2.rotation.z = -Math.PI / 4;
    cf.add(w1, w2);

    // 모닥불 불꽃
    const flameGeo = new THREE.ConeGeometry(0.65, 1.4, 8);
    const flameMat = new THREE.MeshBasicMaterial({ color: 0xf97316 });
    const flame = new THREE.Mesh(flameGeo, flameMat);
    flame.position.y = 0.9;
    cf.add(flame);

    // 주변 통나무 벤치 3개
    for (let j = 0; j < 3; j++) {
      const bAngle = (j / 3) * Math.PI * 2 + 0.3;
      const log = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 3.2), woodMat);
      log.rotation.z = Math.PI / 2;
      log.position.set(Math.cos(bAngle) * 3.5, 0.35, Math.sin(bAngle) * 3.5);
      log.rotation.y = -bAngle;
      cf.add(log);
    }

    scene.add(cf);
    this.colliders.push({ x: pos.x, z: pos.z, radius: 3.5 });
  },

  createOrchardTrees(scene) {
    // 맵 곳곳에 배치할 사과나무(빨강), 오렌지나무(주황), 분홍 벚나무들
    const treeLocs = [
      { x: -32, z: -25, color: 0x4caf50, fruitColor: 0xef4444 }, // 사과
      { x: -25, z: -40, color: 0x4caf50, fruitColor: 0xef4444 },
      { x: 30, z: -28, color: 0x4caf50, fruitColor: 0xf97316 },  // 오렌지
      { x: 25, z: 45, color: 0xffb7c5, fruitColor: null },       // 벚나무
      { x: -28, z: 50, color: 0xffb7c5, fruitColor: null },
      { x: -55, z: -25, color: 0x4caf50, fruitColor: 0xef4444 },
      { x: 55, z: -25, color: 0x4caf50, fruitColor: 0xf97316 },
      { x: 60, z: 15, color: 0xffb7c5, fruitColor: null }
    ];

    treeLocs.forEach(tl => {
      const tg = new THREE.Group();
      tg.position.set(tl.x, 0, tl.z);

      // 밑동
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.6, 0.9, 4.0, 8),
        new THREE.MeshLambertMaterial({ color: 0x8b5a2b })
      );
      trunk.position.y = 2.0;
      trunk.castShadow = true;
      tg.add(trunk);

      // 둥근 잎 덩어리
      const foliage = new THREE.Mesh(
        new THREE.DodecahedronGeometry(2.6, 1),
        new THREE.MeshLambertMaterial({ color: tl.color })
      );
      foliage.position.y = 5.2;
      foliage.castShadow = true;
      tg.add(foliage);

      // 열매
      if (tl.fruitColor) {
        for (let i = 0; i < 5; i++) {
          const fr = new THREE.Mesh(
            new THREE.SphereGeometry(0.3, 6, 6),
            new THREE.MeshLambertMaterial({ color: tl.fruitColor })
          );
          const fAngle = (i / 5) * Math.PI * 2;
          fr.position.set(Math.cos(fAngle) * 2.2, 5.0 + (i % 2) * 0.6, Math.sin(fAngle) * 2.2);
          tg.add(fr);
        }
      }

      scene.add(tg);
      this.colliders.push({ x: tl.x, z: tl.z, radius: 2.2 });
    });
  },

  createStreetLamps(scene) {
    const lampLocs = [
      [-6, 0, -25], [6, 0, -25],
      [-6, 0, 5], [6, 0, 5],
      [-6, 0, 35], [6, 0, 35],
      [-25, 0, 15], [25, 0, 15]
    ];

    lampLocs.forEach(lp => {
      const lamp = new THREE.Group();
      lamp.position.set(lp[0], lp[1], lp[2]);

      const post = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.16, 4.2),
        new THREE.MeshLambertMaterial({ color: 0x334155 })
      );
      post.position.y = 2.1;
      post.castShadow = true;
      lamp.add(post);

      const bulb = new THREE.Mesh(
        new THREE.SphereGeometry(0.4, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xfef08a })
      );
      bulb.position.y = 4.3;
      lamp.add(bulb);

      scene.add(lamp);
      this.colliders.push({ x: lp[0], z: lp[2], radius: 0.8 });
    });
  },

  createPetalParticles(scene) {
    const count = 180;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const speeds = [];

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 160;
      positions[i * 3 + 1] = Math.random() * 25;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 160;

      speeds.push({
        y: 0.9 + Math.random() * 1.4,
        x: (Math.random() - 0.5) * 0.6
      });
    }

    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));

    const mat = new THREE.PointsMaterial({
      color: 0xffb7c5,
      size: 0.55,
      transparent: true,
      opacity: 0.85
    });

    this.petalParticles = new THREE.Points(geo, mat);
    this.petalSpeeds = speeds;
    scene.add(this.petalParticles);
  },

  update(delta) {
    WorldTree.update(delta);

    // 1. 풍차 날개 회전
    if (this.windmillBlades) {
      this.windmillBlades.rotation.z -= delta * 0.8;
    }

    // 2. 굴뚝 연기 몽글몽글 상승 애니메이션
    this.smokeParticles.forEach(sp => {
      sp.puffs.forEach(p => {
        p.mesh.position.y += delta * 0.8;
        p.mesh.scale.addScalar(delta * 0.15);
        if (p.mesh.position.y > 3.5) {
          p.mesh.position.y = 0;
          p.mesh.scale.set(1, 1, 1);
        }
      });
    });

    // 3. 벚꽃잎 낙하 파티클
    if (this.petalParticles) {
      const pos = this.petalParticles.geometry.attributes.position.array;
      for (let i = 0; i < this.petalSpeeds.length; i++) {
        pos[i * 3 + 1] -= this.petalSpeeds[i].y * delta;
        pos[i * 3] += Math.sin(pos[i * 3 + 1] * 0.5) * delta * 0.8;

        if (pos[i * 3 + 1] < 0) {
          pos[i * 3 + 1] = 25;
          pos[i * 3] = (Math.random() - 0.5) * 160;
          pos[i * 3 + 2] = (Math.random() - 0.5) * 160;
        }
      }
      this.petalParticles.geometry.attributes.position.needsUpdate = true;
    }
  }
};
