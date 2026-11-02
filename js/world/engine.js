/**
 * Three.js 3D 월드 엔진 (engine.js)
 * - 씬, 카메라, 렌더러, 애니메이션 루프 관리
 * - DPR 상한 1.5 (학교 저사양 크롬북/모바일 성능 보호)
 * - WebGL 호환성 감지 및 2D 폴백 지원
 */

import * as THREE from "three";

export const Engine = {
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
      console.warn("WebGL을 지원하지 않는 브라우저입니다. 2D 폴백 모드로 동작합니다.");
      return false;
    }

    // 1. Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color("#87CEEB"); // 화사한 동물의 숲 하늘색
    this.scene.fog = new THREE.FogExp2("#87CEEB", 0.005); // 넓어진 맵에 맞춰 안개 거리 완화

    // 2. Camera
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 800);
    this.camera.position.set(0, 22, 35);

    // 3. Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    this.renderer.setSize(width, height);
    // 성능 예산 준수: DPR 상한 1.5
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // 캔버스 마운트
    this.container.innerHTML = "";
    this.container.appendChild(this.renderer.domElement);

    // 4. Clock
    this.clock = new THREE.Clock();

    // 5. Lights
    this.setupLighting();

    // 6. Resize 이벤트
    window.addEventListener("resize", () => this.onResize());

    this.start();
    return true;
  },

  setupLighting() {
    // 따뜻한 앰비언트 라이트
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    this.scene.add(ambientLight);

    // 태양광 (Directional Light) - 그림자 생성
    const sunLight = new THREE.DirectionalLight(0xfff5e6, 1.1);
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

    // 반사광 (부드러운 지면 반사)
    const hemiLight = new THREE.HemisphereLight(0x87CEEB, 0x4caf50, 0.4);
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
      this.updateCallbacks.forEach(fn => fn(delta));

      this.renderer.render(this.scene, this.camera);
    };
    animate();
  },

  stop() {
    this.isRunning = false;
  },

  onResize() {
    if (!this.renderer || !this.camera || !this.container) return;
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;
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
