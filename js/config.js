/**
 * 책마을 웹앱 전역 설정
 */
const CONFIG = {
  // Google Apps Script 웹앱 배포 URL
  GAS_API_URL: localStorage.getItem("BOOK_VILLAGE_GAS_URL") || "https://script.google.com/macros/s/AKfycbyKt7RD6O0nDDnx8Wu-bxuVvWts_6hmZQ9SqC0WAqNQDKNVnktoFv_6t-Dosib2hpaFTQ/exec",
  
  // GAS 배포 전에도 바로 사용해볼 수 있는 데모/모의(Mock) 모드 여부
  // GAS_API_URL이 비어있으면 자동으로 Mock 모드로 동작합니다.
  IS_MOCK_MODE: function() {
    return !this.GAS_API_URL || this.GAS_API_URL.trim() === "";
  },

  APP_NAME: "책마을 : 우리 반 독서 빌리지",
  VERSION: "1.0.0",

  // 감정 태그 목록
  EMOTION_TAGS: ["🌟 깊은감동", "💡 깨달음", "😂 유쾌함", "😢 뭉클함", "🔥 열정/용기", "🤔 깊은생각", "🌿 마음의휴식"],

  // 기본 학급 정보
  DEFAULT_CLASS_ID: "1반"
};
