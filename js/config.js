/**
 * 책마을 웹앱 전역 설정
 * - 단일 GAS URL (GAS_API_URL)로 도서 검색과 교사 계정 관리 모두 처리
 */
export const CONFIG = {
  // Firebase 웹 설정 (Spark 플랜 서울 리전)
  FIREBASE: {
    apiKey: localStorage.getItem("FIREBASE_API_KEY") || "AIzaSy_MOCK_API_KEY_FOR_TESTING",
    authDomain: localStorage.getItem("FIREBASE_AUTH_DOMAIN") || "book-village-demo.firebaseapp.com",
    projectId: localStorage.getItem("FIREBASE_PROJECT_ID") || "book-village-demo",
    storageBucket: "book-village-demo.appspot.com",
    messagingSenderId: "1234567890",
    appId: "1:1234567890:web:abcdef123456"
  },

  // 의사 이메일 도메인
  AUTH_DOMAIN: "village.local",

  // 단일 Google Apps Script 웹앱 배포 URL (알라딘 검색 + 교사 일괄 계정 관리 통합)
  GAS_API_URL: localStorage.getItem("BOOK_VILLAGE_GAS_URL") || "",

  // Mock(오프라인 체험) 모드 자동 감지
  IS_MOCK_MODE: function() {
    return !this.FIREBASE.apiKey || this.FIREBASE.apiKey.includes("MOCK");
  },

  APP_NAME: "책마을 : 우리 반 독서 빌리지",
  VERSION: "2.5.0 (3D 동화 빌리지)",

  // 감정 태그 목록
  EMOTION_TAGS: ["🌟 깊은감동", "💡 깨달음", "😂 유쾌함", "😢 뭉클함", "🔥 열정/용기", "🤔 깊은생각", "🌿 마음의휴식"],

  // 기본 학급 정보
  DEFAULT_CLASS_ID: "2026-3-1"
};

// 하위 호환
CONFIG.GAS_ALADIN_URL = CONFIG.GAS_API_URL;
CONFIG.GAS_ADMIN_GATEWAY_URL = CONFIG.GAS_API_URL;
window.CONFIG = CONFIG;
