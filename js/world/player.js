/**
 * 3D 플레이어 캐릭터 모듈 (player.js)
 */

(function(global) {
  const Player = {
    mesh: null,
    bodyGroup: null,
    headMesh: null,
    headMat: null,
    hairGroup: null,
    torsoMesh: null,
    torsoMat: null,
    accessoryGroup: null,
    nameTag: null,
    leftLeg: null,
    rightLeg: null,
    speed: 13.0,
    position: null,
    targetRotation: 0,
    isMoving: false,
    walkCycle: 0,

    custom: {
      hairStyle: "beret",
      hairColor: 0x5c3a21,
      clothesColor: 0x2563eb,
      skinColor: 0xffdfba,
      accessory: "blush"
    },

    create(scene, name = "책친구") {
      const THREE = global.THREE;
      this.position = new THREE.Vector3(0, 0, 0); // 안전 교차로

      this.mesh = new THREE.Group();
      this.mesh.position.copy(this.position);

      this.bodyGroup = new THREE.Group();
      this.mesh.add(this.bodyGroup);

      this.loadCustomData();

      // 1. 머리
      const headGeo = new THREE.SphereGeometry(0.85, 16, 16);
      this.headMat = new THREE.MeshLambertMaterial({ color: this.custom.skinColor });
      this.headMesh = new THREE.Mesh(headGeo, this.headMat);
      this.headMesh.position.y = 1.75;
      this.headMesh.castShadow = true;
      this.bodyGroup.add(this.headMesh);

      // 2. 눈
      this.buildEyes(THREE);

      // 3. 헤어 & 모자
      this.hairGroup = new THREE.Group();
      this.headMesh.add(this.hairGroup);
      this.buildHair(this.custom.hairStyle, this.custom.hairColor);

      // 4. 액세서리
      this.accessoryGroup = new THREE.Group();
      this.headMesh.add(this.accessoryGroup);
      this.buildAccessory(this.custom.accessory);

      // 5. 몸통
      const torsoGeo = new THREE.CylinderGeometry(0.4, 0.7, 1.0, 12);
      this.torsoMat = new THREE.MeshLambertMaterial({ color: this.custom.clothesColor });
      this.torsoMesh = new THREE.Mesh(torsoGeo, this.torsoMat);
      this.torsoMesh.position.y = 0.9;
      this.torsoMesh.castShadow = true;
      this.bodyGroup.add(this.torsoMesh);

      // 6. 다리
      const legGeo = new THREE.CylinderGeometry(0.16, 0.16, 0.5, 8);
      const legMat = new THREE.MeshLambertMaterial({ color: 0x334155 });
      this.leftLeg = new THREE.Mesh(legGeo, legMat);
      this.leftLeg.position.set(-0.28, 0.25, 0);
      this.rightLeg = this.leftLeg.clone();
      this.rightLeg.position.set(0.28, 0.25, 0);
      this.bodyGroup.add(this.leftLeg, this.rightLeg);

      // 7. 발밑 그림자
      const shadowGeo = new THREE.CircleGeometry(0.75, 16);
      const shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.25 });
      const shadow = new THREE.Mesh(shadowGeo, shadowMat);
      shadow.rotation.x = -Math.PI / 2;
      shadow.position.y = 0.03;
      this.mesh.add(shadow);

      // 8. 네임태그
      this.updateNameTag(name);

      scene.add(this.mesh);
      return this.mesh;
    },

    buildEyes(THREE) {
      const eyeGeo = new THREE.SphereGeometry(0.09, 8, 8);
      const eyeMat = new THREE.MeshBasicMaterial({ color: 0x1e293b });
      const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
      leftEye.position.set(-0.28, 0.05, 0.8);

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
      const THREE = global.THREE;
      while (this.hairGroup.children.length > 0) {
        this.hairGroup.remove(this.hairGroup.children[0]);
      }

      const hairMat = new THREE.MeshLambertMaterial({ color: color });

      if (style === "beret") {
        const capGeo = new THREE.CylinderGeometry(0.9, 0.6, 0.35, 16);
        const cap = new THREE.Mesh(capGeo, hairMat);
        cap.position.set(0, 0.75, -0.05);
        cap.rotation.z = -0.15;

        const pomGeo = new THREE.SphereGeometry(0.12, 8, 8);
        const pom = new THREE.Mesh(pomGeo, hairMat);
        pom.position.set(0, 0.25, 0);
        cap.add(pom);
        this.hairGroup.add(cap);

        const bangsGeo = new THREE.BoxGeometry(0.7, 0.2, 0.2);
        const bangs = new THREE.Mesh(bangsGeo, hairMat);
        bangs.position.set(0, 0.45, 0.75);
        this.hairGroup.add(bangs);

      } else if (style === "bowl") {
        const bowlGeo = new THREE.SphereGeometry(0.92, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.6);
        const bowl = new THREE.Mesh(bowlGeo, hairMat);
        bowl.position.set(0, 0.1, 0);
        this.hairGroup.add(bowl);

      } else if (style === "twintail") {
        const baseGeo = new THREE.SphereGeometry(0.9, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.55);
        const base = new THREE.Mesh(baseGeo, hairMat);
        base.position.set(0, 0.1, 0);
        this.hairGroup.add(base);

        const tailGeo = new THREE.ConeGeometry(0.25, 0.8, 8);
        const leftTail = new THREE.Mesh(tailGeo, hairMat);
        leftTail.position.set(-0.95, -0.1, -0.1);
        leftTail.rotation.z = 0.5;
        const rightTail = leftTail.clone();
        rightTail.position.x = 0.95;
        rightTail.rotation.z = -0.5;
        this.hairGroup.add(leftTail, rightTail);

      } else if (style === "wizard") {
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
        const shortGeo = new THREE.SphereGeometry(0.88, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.55);
        const shortHair = new THREE.Mesh(shortGeo, hairMat);
        shortHair.position.set(0, 0.12, 0);
        this.hairGroup.add(shortHair);
      }
    },

    buildAccessory(type) {
      const THREE = global.THREE;
      while (this.accessoryGroup.children.length > 0) {
        this.accessoryGroup.remove(this.accessoryGroup.children[0]);
      }

      if (type === "blush") {
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

      if (this.headMat) this.headMat.color.set(this.custom.skinColor);
      if (this.torsoMat) this.torsoMat.color.set(this.custom.clothesColor);
      this.buildHair(this.custom.hairStyle, this.custom.hairColor);
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
      const THREE = global.THREE;
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
      for (let i = 0; i < colliders.length; i++) {
        const col = colliders[i];
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
            this.position.z += minSafeDist;
          }
        }
      }

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

        const distFromCenter = Math.sqrt(nextX * nextX + nextZ * nextZ);
        if (distFromCenter < 125) {
          let canMoveX = true;
          let canMoveZ = true;

          for (let i = 0; i < colliders.length; i++) {
            const col = colliders[i];
            const minSafeDist = (col.radius || 3.0) + 0.85;

            const testX_dx = nextX - col.x;
            const testX_dz = this.position.z - col.z;
            if (Math.sqrt(testX_dx * testX_dx + testX_dz * testX_dz) < minSafeDist) {
              canMoveX = false;
            }

            const testZ_dx = this.position.x - col.x;
            const testZ_dz = nextZ - col.z;
            if (Math.sqrt(testZ_dx * testZ_dx + testZ_dz * testZ_dz) < minSafeDist) {
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

  global.Player = Player;
})(typeof window !== "undefined" ? window : globalThis);
