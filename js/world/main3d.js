/**
 * 3D 월드 메인 통합 컨트롤러 (main3d.js)
 * - Three.js 엔진, 마을, 플레이어, 컨트롤러, 카메라, 상호작용 결합
 * - file:// 환경과 http:// 환경 모두에서 100% 즉시 실행 보장
 */

(function(global) {
  const Main3D = {
    isInitialized: false,
    is3DMode: true,

    async init() {
      try {
        console.log("🎮 3D 책마을 엔진 초기화 시작...");

        const Engine = global.Engine;
        const VillageWorld = global.VillageWorld;
        const Player = global.Player;
        const Controls = global.Controls;
        const WorldCamera = global.WorldCamera;
        const Interactions = global.Interactions;

        if (!Engine || !VillageWorld || !Player || !Controls || !WorldCamera || !Interactions) {
          console.error("필수 3D 서브시스템 중 일부가 누락되었습니다.");
          this.switchTo2D();
          return;
        }

        // 1. Three.js Engine 시작
        this.is3DMode = true;
        const canvasWrap = document.getElementById("canvas-wrap");
        const village2D = document.getElementById("village-2d-container");
        const toggleBtn = document.getElementById("btn-mode-toggle");
        if (canvasWrap) canvasWrap.classList.remove("hidden");
        if (village2D) village2D.classList.add("hidden");
        if (toggleBtn) toggleBtn.innerHTML = "🗺️ 2D 모드로 전환";

        const success = Engine.init("canvas-container");
        if (!success) {
          this.switchTo2D();
          return;
        }

        // 2. 3D 마을 및 지형 구축
        VillageWorld.build(Engine.scene);

        // 3. 플레이어 아바타 생성
        const authUser = global.Auth && global.Auth.getCurrentUser ? global.Auth.getCurrentUser() : null;
        const userName = authUser ? (authUser.nickname || authUser.name) : "책친구";
        Player.create(Engine.scene, userName);

        // 4. 카메라 및 조작 컨트롤러 초기화
        WorldCamera.init(Engine.camera);
        Controls.init(Engine.renderer.domElement, Engine.camera);

        // 5. 건물 상호작용 리스너
        Interactions.init((buildingId) => {
          this.handleBuildingEnter(buildingId);
        });

        // 6. 엔진 틱 루프 등록
        Engine.onUpdate((delta) => {
          const moveVec = Controls.getMoveVector(Player.position);
          Player.move(moveVec.x, moveVec.z, delta, VillageWorld.colliders);
          WorldCamera.update(Player.position, delta);
          VillageWorld.update(delta);
          Interactions.update(Player.position, VillageWorld.interactables);
        });

        // 7. 학급 나무 상태 동기화
        this.refreshClassTree();

        this.isInitialized = true;
        console.log("🌲 책마을 3D 게임 월드 렌더링 완료!");
      } catch (err) {
        console.error("3D 월드 초기화 중 오류 발생 (2D 폴백 실행):", err);
        this.switchTo2D();
      }
    },

    handleBuildingEnter(buildingId) {
      if (global.BuildingModal) {
        global.BuildingModal.open(buildingId);
      }
    },

    async refreshClassTree() {
      try {
        if (global.WorldTree && global.WorldTree.group) {
          global.WorldTree.buildTreeModel(3);
          global.WorldTree.updateFruits(14);
        }
      } catch (e) {
        console.warn("나무 동기화 예외:", e);
      }
    },

    toggleCameraView() {
      if (!global.WorldCamera) return;
      const mode = global.WorldCamera.toggleViewMode();
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
      if (global.Engine && global.Engine.stop) global.Engine.stop();
      if (global.Village && typeof global.Village.init === "function") {
        global.Village.init();
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
        if (global.Engine) {
          global.Engine.start();
          global.Engine.onResize();
        }
      }
    }
  };

  global.Main3D = Main3D;
})(typeof window !== "undefined" ? window : globalThis);
