/**
 * 3D 월드 메인 통합 컨트롤러 (main3d.js)
 * - Three.js 엔진, 3D 마을, 플레이어, 컨트롤러, 카메라, 인터랙션 유기적 결합
 * - 건물 상호작용 발생 시 App.switchTab 또는 모달 패널 호출
 */

import { Engine } from "./engine.js";
import { VillageWorld } from "./village.js";
import { Player } from "./player.js";
import { Controls } from "./controls.js";
import { WorldCamera } from "./camera.js";
import { Interactions } from "./interactions.js";
import { BuildingModal } from "./buildingModal.js";
import { AuthService } from "../auth/authService.js";
import { Repository } from "../data/repository.js";
import { MockRepo } from "../data/mockRepo.js";
import { FirebaseRepo } from "../data/firebaseRepo.js";
import { WorldTree } from "./tree.js";

export const Main3D = {
  isInitialized: false,
  is3DMode: true,

  async init() {
    try {
      // 1. Data Repository 초기화
      if (!Repository.instance) {
        const fbSuccess = await FirebaseRepo.init();
        if (fbSuccess) {
          Repository.setImplementation(FirebaseRepo);
        } else {
          Repository.setImplementation(MockRepo);
        }
      }

      // 2. Three.js Engine 시작
      const success = Engine.init("canvas-container");
      if (!success) {
        this.switchTo2D();
        return;
      }

      // 3. 3D 마을 및 지형 구축
      VillageWorld.build(Engine.scene);

      // 4. 플레이어 아바타 생성
      AuthService.init();
      const userName = (AuthService.currentUser && AuthService.currentUser.name) || "책친구";
      Player.create(Engine.scene, userName);

      // 사용자 변경 시 네임태그 갱신
      AuthService.onChange((user) => {
        if (Player.mesh) {
          Player.updateNameTag(user ? (user.nickname || user.name) : "책친구");
        }
      });

      // 5. 카메라 및 조작 컨트롤러 초기화
      WorldCamera.init(Engine.camera);
      Controls.init(Engine.renderer.domElement, Engine.camera);

      // 6. 건물 상호작용 리스너 (건물 진입 시 기존 탭/모달 패널 오픈)
      Interactions.init((buildingId) => {
        this.handleBuildingEnter(buildingId);
      });

      // 7. 엔진 틱 루프 등록
      Engine.onUpdate((delta) => {
        const moveVec = Controls.getMoveVector(Player.position);
        Player.move(moveVec.x, moveVec.z, delta, VillageWorld.colliders);
        WorldCamera.update(Player.position, delta);
        VillageWorld.update(delta);
        Interactions.update(Player.position, VillageWorld.interactables);
      });

      // 8. 학급 나무 상태 동기화
      this.refreshClassTree();

      this.isInitialized = true;
      console.log("🌲 책마을 3D 게임 월드 로드 완료!");
    } catch (err) {
      console.error("3D 월드 초기화 중 오류 발생 (2D 폴백 실행):", err);
      this.switchTo2D();
    }
  },

  handleBuildingEnter(buildingId) {
    // 3D 뷰 위에서 전용 오버레이 모달 오픈!
    BuildingModal.open(buildingId);
  },

  async refreshClassTree() {
    try {
      const repo = Repository.get();
      const treeData = await repo.getClassTree("2026-3-1");
      if (treeData && WorldTree.group) {
        const fruits = treeData.treeFruits || 0;
        const level = Math.min(5, Math.floor((treeData.treeLeaves || fruits) / 10) + 1);
        WorldTree.buildTreeModel(level);
        WorldTree.updateFruits(fruits);
      }
    } catch (e) {
      console.warn("나무 데이터 조회 실패:", e);
    }
  },

  toggleCameraView() {
    const mode = WorldCamera.toggleViewMode();
    const btn = document.getElementById("btn-cam-view");
    if (btn) {
      btn.textContent = mode === "thirdPerson" ? "📷 3인칭 뷰" : "📐 쿼터뷰(아이소)";
    }
  },

  toggleMode() {
    if (this.is3DMode) {
      this.switchTo2D();
    } else {
      this.switchTo3D();
    }
  },

  switchTo2D() {
    this.is3DMode = false;
    const canvasWrap = document.getElementById("canvas-wrap");
    const village2D = document.getElementById("village-2d-container");
    const toggleBtn = document.getElementById("btn-mode-toggle");
    if (canvasWrap) canvasWrap.classList.add("hidden");
    if (village2D) village2D.classList.remove("hidden");
    if (toggleBtn) toggleBtn.innerHTML = "🎮 3D 게임 모드로 전환";
    if (typeof Engine !== "undefined" && Engine.stop) Engine.stop();
    if (window.Village && typeof window.Village.init === "function") {
      window.Village.init();
    }
  },

  switchTo3D() {
    this.is3DMode = true;
    const canvasWrap = document.getElementById("canvas-wrap");
    const village2D = document.getElementById("village-2d-container");
    const toggleBtn = document.getElementById("btn-mode-toggle");
    if (village2D) village2D.classList.add("hidden");
    if (canvasWrap) canvasWrap.classList.remove("hidden");
    if (toggleBtn) toggleBtn.innerHTML = "🗺️ 2D 모드로 전환";

    if (!this.isInitialized) {
      this.init();
    } else {
      Engine.start();
      Engine.onResize();
    }
  }
};

window.Main3D = Main3D;
