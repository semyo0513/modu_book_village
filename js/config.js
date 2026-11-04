/**
 * 책마을 웹앱 전역 설정 (config.js)
 * - 일반 스크립트 및 ES 모듈 모두에서 안전하게 window.CONFIG를 제공
 */

(function(global) {
  const DEFAULT_GAS_URL = "https://script.google.com/macros/s/AKfycbyKt7RD6O0nDDnx8Wu-bxuVvWts_6hmZQ9SqC0WAqNQDKNVnktoFv_6t-Dosib2hpaFTQ/exec";

  // 로컬스토리지에 유효한 URL이 없으면 기본 배포 URL로 자동 보정 및 동기화
  let activeGasUrl = DEFAULT_GAS_URL;
  if (typeof localStorage !== "undefined") {
    const stored = localStorage.getItem("BOOK_VILLAGE_GAS_URL");
    if (stored && stored.trim() !== "") {
      activeGasUrl = stored.trim();
    } else {
      try {
        localStorage.setItem("BOOK_VILLAGE_GAS_URL", DEFAULT_GAS_URL);
      } catch (e) {}
    }
  }

  const CONFIG = {
    // 단일 Google Apps Script 웹앱 배포 URL (알라딘 검색 + 구글 시트 공용 DB + 교사 일괄 관리)
    GAS_API_URL: activeGasUrl,

    // Firebase 웹 설정 (modu-book-village)
    FIREBASE: {
      apiKey: (typeof localStorage !== "undefined" && localStorage.getItem("FIREBASE_API_KEY")) || "AIzaSyBjAM4dw2O4fgooftg1fAB9F5zpe_PRJeU",
      authDomain: (typeof localStorage !== "undefined" && localStorage.getItem("FIREBASE_AUTH_DOMAIN")) || "modu-book-village.firebaseapp.com",
      projectId: (typeof localStorage !== "undefined" && localStorage.getItem("FIREBASE_PROJECT_ID")) || "modu-book-village",
      storageBucket: (typeof localStorage !== "undefined" && localStorage.getItem("FIREBASE_STORAGE_BUCKET")) || "modu-book-village.firebasestorage.app",
      messagingSenderId: "277148323726",
      appId: "1:277148323726:web:5bdff6d6d85b0205e7dedf"
    },

    // 의사 이메일 도메인
    AUTH_DOMAIN: "village.local",

    // Mock(오프라인 체험) 모드 자동 감지: GAS URL이 설정되어 있으므로 항상 온라인 공용 DB 모드로 작동
    IS_MOCK_MODE: function() {
      if (this.GAS_API_URL && this.GAS_API_URL.trim() !== "") {
        return false;
      }
      return (!this.FIREBASE.apiKey || this.FIREBASE.apiKey.includes("MOCK"));
    },

    APP_NAME: "책마을 : 우리 반 독서 빌리지",
    VERSION: "2.5.2 (공용 구글 시트 DB 완벽 연동)",

    // 감정 태그 목록
    EMOTION_TAGS: ["🌟 깊은감동", "💡 깨달음", "😂 유쾌함", "😢 뭉클함", "🔥 열정/용기", "🤔 깊은생각", "🌿 마음의휴식"],

    // 기본 학급 정보 (학급 전체 공통 공유용)
    DEFAULT_CLASS_ID: "1반"
  };

  CONFIG.GAS_ALADIN_URL = CONFIG.GAS_API_URL;
  CONFIG.GAS_ADMIN_GATEWAY_URL = CONFIG.GAS_API_URL;

  // 전역 객체에 즉시 등록 (동기 실행 보장)
  global.CONFIG = CONFIG;
})(typeof window !== "undefined" ? window : globalThis);
