/**
 * 중앙 독서 지혜의 나무 3D 모듈 (tree.js)
 * - 레벨 1~5 성장 단계 모델링
 * - 열매 수(treeFruits)에 따른 사과 InstancedMesh 렌더링 (Draw Call 최적화)
 * - 바람에 부드럽게 흔들리는 나뭇잎 애니메이션
 */

import * as THREE from "three";

export const WorldTree = {
  group: null,
  fruitMesh: null,
  trunkMesh: null,
  foliageMeshes: [],
  currentLevel: 1,
  fruitCount: 0,
  time: 0,

  create(scene, position = new THREE.Vector3(0, 0, -2)) {
    this.group = new THREE.Group();
    this.group.position.copy(position);

    this.buildTreeModel(3); // 기본 3단계
    this.updateFruits(12);

    scene.add(this.group);
    return this.group;
  },

  buildTreeModel(level = 3) {
    this.currentLevel = level;
    this.foliageMeshes = [];

    // 기존 자식 객체 제거
    while (this.group.children.length > 0) {
      this.group.remove(this.group.children[0]);
    }

    // 1. 거대한 나무 밑동 & 기둥
    const trunkGeo = new THREE.CylinderGeometry(1.6, 2.4, 7, 8);
    const trunkMat = new THREE.MeshLambertMaterial({ color: 0x8B5A2B });
    this.trunkMesh = new THREE.Mesh(trunkGeo, trunkMat);
    this.trunkMesh.position.y = 3.5;
    this.trunkMesh.castShadow = true;
    this.trunkMesh.receiveShadow = true;
    this.group.add(this.trunkMesh);

    // 2. 울창한 나뭇잎 덩어리들 (동물의 숲 스타일 둥글둥글 구체 클러스터)
    const foliageMat = new THREE.MeshLambertMaterial({ 
      color: level >= 5 ? 0xFFD700 : 0x4CAF50, // 5단계는 황금빛
      flatShading: true 
    });

    const clusters = [
      { r: 4.5, x: 0, y: 8.5, z: 0 },
      { r: 3.2, x: -2.8, y: 7.5, z: 1.2 },
      { r: 3.4, x: 2.8, y: 7.8, z: -1.0 },
      { r: 3.0, x: 1.2, y: 8.0, z: 2.6 },
      { r: 3.0, x: -1.4, y: 8.2, z: -2.5 },
      { r: 2.8, x: 0, y: 11.0, z: 0 } // 상단 크라운
    ];

    clusters.forEach(c => {
      const geo = new THREE.DodecahedronGeometry(c.r, 1);
      const mesh = new THREE.Mesh(geo, foliageMat);
      mesh.position.set(c.x, c.y, c.z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.group.add(mesh);
      this.foliageMeshes.push(mesh);
    });

    // 3. 밑동 주변 꽃 & 디딤돌
    this.buildBaseDecorations();

    // 4. 열매 재구성
    if (this.fruitCount > 0) {
      this.updateFruits(this.fruitCount);
    }
  },

  buildBaseDecorations() {
    // 나무 밑 벤치/화단
    const ringGeo = new THREE.RingGeometry(2.6, 3.8, 12);
    const ringMat = new THREE.MeshLambertMaterial({ color: 0xdeb887, side: THREE.DoubleSide });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.05;
    ring.receiveShadow = true;
    this.group.add(ring);
  },

  updateFruits(count) {
    this.fruitCount = count;
    if (this.fruitMesh) {
      this.group.remove(this.fruitMesh);
      this.fruitMesh.geometry.dispose();
      this.fruitMesh = null;
    }

    if (count <= 0) return;

    // 사과 열매 인스턴싱 (최대 60개)
    const displayCount = Math.min(count, 60);
    const appleGeo = new THREE.SphereGeometry(0.35, 6, 6);
    const appleMat = new THREE.MeshLambertMaterial({ color: 0xff3838, roughness: 0.3 });

    this.fruitMesh = new THREE.InstancedMesh(appleGeo, appleMat, displayCount);
    this.fruitMesh.castShadow = true;

    const dummy = new THREE.Object3D();
    for (let i = 0; i < displayCount; i++) {
      // 나뭇잎 클러스터 표면에 매달리는 위치 계산
      const angle = (i / displayCount) * Math.PI * 2 * 3;
      const radius = 3.2 + Math.sin(i * 1.5) * 1.4;
      const height = 6.2 + (i % 5) * 0.9;

      dummy.position.set(
        Math.cos(angle) * radius,
        height,
        Math.sin(angle) * radius
      );
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      this.fruitMesh.setMatrixAt(i, dummy.matrix);
    }

    this.fruitMesh.instanceMatrix.needsUpdate = true;
    this.group.add(this.fruitMesh);
  },

  update(delta) {
    this.time += delta;
    // 산들바람에 나뭇잎이 살랑거리는 미세 회전 연출
    this.foliageMeshes.forEach((mesh, idx) => {
      mesh.rotation.y = Math.sin(this.time * 1.2 + idx) * 0.03;
      mesh.rotation.z = Math.cos(this.time * 0.9 + idx) * 0.02;
    });
  }
};
