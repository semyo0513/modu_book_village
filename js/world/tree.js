/**
 * 중앙 독서 지혜의 나무 3D 모듈 (tree.js)
 */

(function(global) {
  const WorldTree = {
    group: null,
    fruitMesh: null,
    trunkMesh: null,
    foliageMeshes: [],
    currentLevel: 1,
    fruitCount: 0,
    time: 0,

    create(scene, position) {
      const THREE = global.THREE;
      this.group = new THREE.Group();
      this.group.position.copy(position || new THREE.Vector3(0, 0, -8));

      this.buildTreeModel(3);
      this.updateFruits(12);

      scene.add(this.group);
      return this.group;
    },

    buildTreeModel(level = 3) {
      const THREE = global.THREE;
      this.currentLevel = level;
      this.foliageMeshes = [];

      while (this.group.children.length > 0) {
        this.group.remove(this.group.children[0]);
      }

      // 1. 나무 밑동
      const trunkGeo = new THREE.CylinderGeometry(1.8, 2.6, 8, 8);
      const trunkMat = new THREE.MeshLambertMaterial({ color: 0x8B5A2B });
      this.trunkMesh = new THREE.Mesh(trunkGeo, trunkMat);
      this.trunkMesh.position.y = 4.0;
      this.trunkMesh.castShadow = true;
      this.trunkMesh.receiveShadow = true;
      this.group.add(this.trunkMesh);

      // 2. 나뭇잎 클러스터
      const foliageMat = new THREE.MeshLambertMaterial({ 
        color: level >= 5 ? 0xFFD700 : 0x4CAF50,
        flatShading: true 
      });

      const clusters = [
        { r: 4.8, x: 0, y: 9.5, z: 0 },
        { r: 3.5, x: -3.2, y: 8.5, z: 1.5 },
        { r: 3.6, x: 3.2, y: 8.8, z: -1.2 },
        { r: 3.2, x: 1.5, y: 9.0, z: 3.0 },
        { r: 3.2, x: -1.8, y: 9.2, z: -3.0 },
        { r: 3.0, x: 0, y: 12.5, z: 0 }
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

      this.buildBaseDecorations(THREE);

      if (this.fruitCount > 0) {
        this.updateFruits(this.fruitCount);
      }
    },

    buildBaseDecorations(THREE) {
      const ringGeo = new THREE.RingGeometry(2.8, 4.2, 12);
      const ringMat = new THREE.MeshLambertMaterial({ color: 0xdeb887, side: THREE.DoubleSide });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.05;
      ring.receiveShadow = true;
      this.group.add(ring);
    },

    updateFruits(count) {
      const THREE = global.THREE;
      this.fruitCount = count;
      if (this.fruitMesh) {
        this.group.remove(this.fruitMesh);
        if (this.fruitMesh.geometry) this.fruitMesh.geometry.dispose();
        this.fruitMesh = null;
      }

      if (count <= 0) return;

      const displayCount = Math.min(count, 60);
      const appleGeo = new THREE.SphereGeometry(0.38, 6, 6);
      const appleMat = new THREE.MeshLambertMaterial({ color: 0xff3838, roughness: 0.3 });

      this.fruitMesh = new THREE.InstancedMesh(appleGeo, appleMat, displayCount);
      this.fruitMesh.castShadow = true;

      const dummy = new THREE.Object3D();
      for (let i = 0; i < displayCount; i++) {
        const angle = (i / displayCount) * Math.PI * 2 * 3;
        const radius = 3.5 + Math.sin(i * 1.5) * 1.5;
        const height = 7.0 + (i % 5) * 1.0;

        dummy.position.set(
          Math.cos(angle) * radius,
          height,
          Math.sin(angle) * radius
        );
        dummy.updateMatrix();
        this.fruitMesh.setMatrixAt(i, dummy.matrix);
      }

      this.fruitMesh.instanceMatrix.needsUpdate = true;
      this.group.add(this.fruitMesh);
    },

    update(delta) {
      this.time += delta;
      for (let i = 0; i < this.foliageMeshes.length; i++) {
        const mesh = this.foliageMeshes[i];
        mesh.rotation.y = Math.sin(this.time * 1.2 + i) * 0.03;
        mesh.rotation.z = Math.cos(this.time * 0.9 + i) * 0.02;
      }
    }
  };

  global.WorldTree = WorldTree;
})(typeof window !== "undefined" ? window : globalThis);
