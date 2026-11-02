/**
 * Three.js 3D 월드 엔진 (engine.js)
 * - 씬, 카메라, 렌더러, 애니메이션 루프 관리
 * - file:// 및 http:// 환경 모두에서 100% 동작 보장 (window.THREE 사용)
 */

(function(global) {
  const THREE = global.THREE;

  const Engine = {
    scene: null,
    camera: null,
    renderer: null,
    clock: null,
    container: null,
    isRunning: false,
    updateCallbacks: [],

    init(containerId = "canvas-container") {
      this.container = document.getElementById(containerId);
      if (!this.container) {
        console.warn("3D 캔버스 컨테이너를 찾을 수 없습니다:", containerId);
        return false;
      }

      if (!this.checkWebGL()) {
        console.warn("WebGL을 지원하지 않는 브라우저입니다.");
        return false;
      }

      const THREE_REF = global.THREE;
      if (!THREE_REF) {
        console.error("Three.js 라이브러리가 로드되지 않았습니다.");
        return false;
      }

      // 1. Scene
      this.scene = new THREE_REF.Scene();
      this.scene.background = new THREE_REF.Color("#87CEEB");
      this.scene.fog = new THREE_REF.FogExp2("#87CEEB", 0.005);

      // 2. Camera
      const width = this.container.clientWidth || window.innerWidth || 800;
      const height = Math.max(this.container.clientHeight || 0, 620);
      this.camera = new THREE_REF.PerspectiveCamera(45, width / height, 0.1, 800);
      this.camera.position.set(0, 22, 35);

      // 3. Renderer
      this.renderer = new THREE_REF.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
      this.renderer.setSize(width, height);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE_REF.PCFSoftShadowMap;

      this.container.innerHTML = "";
      this.container.appendChild(this.renderer.domElement);

      // 4. Clock
      this.clock = new THREE_REF.Clock();

      // 5. Lights
      this.setupLighting(THREE_REF);

      // 6. Resize 이벤트
      window.addEventListener("resize", () => this.onResize());

      this.start();
      return true;
    },

    setupLighting(THREE_REF) {
      const ambientLight = new THREE_REF.AmbientLight(0xffffff, 0.7);
      this.scene.add(ambientLight);

      const sunLight = new THREE_REF.DirectionalLight(0xfff5e6, 1.1);
      sunLight.position.set(60, 95, 50);
      sunLight.castShadow = true;
      sunLight.shadow.mapSize.width = 1024;
      sunLight.shadow.mapSize.height = 1024;
      sunLight.shadow.camera.near = 10;
      sunLight.shadow.camera.far = 280;
      sunLight.shadow.camera.left = -95;
      sunLight.shadow.camera.right = 95;
      sunLight.shadow.camera.top = 95;
      sunLight.shadow.camera.bottom = -95;
      this.scene.add(sunLight);

      const hemiLight = new THREE_REF.HemisphereLight(0x87CEEB, 0x4caf50, 0.4);
      this.scene.add(hemiLight);
    },

    onUpdate(callback) {
      this.updateCallbacks.push(callback);
    },

    start() {
      if (this.isRunning) return;
      this.isRunning = true;
      const animate = () => {
        if (!this.isRunning) return;
        requestAnimationFrame(animate);

        const delta = Math.min(this.clock.getDelta(), 0.1);
        for (let i = 0; i < this.updateCallbacks.length; i++) {
          this.updateCallbacks[i](delta);
        }

        this.renderer.render(this.scene, this.camera);
      };
      animate();
    },

    stop() {
      this.isRunning = false;
    },

    onResize() {
      if (!this.renderer || !this.camera || !this.container) return;
      const width = this.container.clientWidth || window.innerWidth || 800;
      const height = Math.max(this.container.clientHeight || 0, 620);
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(width, height);
    },

    checkWebGL() {
      try {
        const canvas = document.createElement("canvas");
        return !!(window.WebGLRenderingContext && (canvas.getContext("webgl") || canvas.getContext("experimental-webgl")));
      } catch (e) {
        return false;
      }
    }
  };

  global.Engine = Engine;
})(typeof window !== "undefined" ? window : globalThis);
