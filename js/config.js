/**
 * 책마을 웹앱 전역 설정 (Firebase + GAS 2개 분리)
 * - GitHub Pages 공개 저장소에 비밀키가 들어가지 않도록 설정
 * - Firebase Web 설정은 공개 설정값(보안은 firestore.rules가 담당)
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

  // 의사 이메일 도메인 (학생 이메일 미수집용 가상 도메인)
  AUTH_DOMAIN: "village.local",

  // GAS ① 알라딘 Open API 프록시 URL
  GAS_ALADIN_URL: localStorage.getItem("BOOK_VILLAGE_ALADIN_URL") || "",

  // GAS ② 교사용 관리 게이트웨이 (일괄 계정 생성/비번 재발급) URL
  GAS_ADMIN_GATEWAY_URL: localStorage.getItem("BOOK_VILLAGE_ADMIN_GATEWAY_URL") || "",

  // Mock(오프라인 체험) 모드 자동 감지
  IS_MOCK_MODE: function() {
    return !this.FIREBASE.apiKey || this.FIREBASE.apiKey.includes("MOCK");
  },

  APP_NAME: "책마을 : 우리 반 독서 빌리지",
  VERSION: "2.0.0 (3D Three.js + Firebase)",

  // 감정 태그 목록
  EMOTION_TAGS: ["🌟 깊은감동", "💡 깨달음", "😂 유쾌함", "😢 뭉클함", "🔥 열정/용기", "🤔 깊은생각", "🌿 마음의휴식"],

  // 기본 학급 정보
  DEFAULT_CLASS_ID: "2026-3-1"
};

// 전역 윈도우 객체 호환 (기존 비모듈 스크립트 대응)
window.CONFIG = CONFIG;
