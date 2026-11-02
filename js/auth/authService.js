/**
 * 인증 및 세션 매니저 (authService.js)
 * - 학생 이메일 불필요: 아이디 -> 의사 이메일({loginId}@village.local) 변환
 * - Firebase Auth 기반 로그인 & ID 토큰 / Custom Claims 확인
 * - Mock 모드 자동 지원
 */

const CONFIG = window.CONFIG || {};

export const AuthService = {
  currentUser: null,
  listeners: [],

  init() {
    const saved = localStorage.getItem("BV_AUTH_USER");
    if (saved) {
      try {
        this.currentUser = JSON.parse(saved);
      } catch (e) {
        localStorage.removeItem("BV_AUTH_USER");
      }
    }
  },

  onChange(listener) {
    this.listeners.push(listener);
    listener(this.currentUser);
  },

  notify() {
    this.listeners.forEach(fn => fn(this.currentUser));
  },

  async login(loginId, password) {
    loginId = loginId.trim().toLowerCase();

    // Mock 모드 처리
    if (CONFIG.IS_MOCK_MODE()) {
      let role = "student";
      let name = "학생";
      if (loginId.startsWith("teacher") || loginId.includes("admin")) {
        role = "teacher";
        name = "선생님";
      } else {
        name = `${loginId} 학생`;
      }

      this.currentUser = {
        uid: "mock_" + loginId,
        loginId,
        name,
        nickname: name,
        role,
        classId: CONFIG.DEFAULT_CLASS_ID,
        mustChangePw: false,
        idToken: "mock_id_token"
      };

      localStorage.setItem("BV_AUTH_USER", JSON.stringify(this.currentUser));
      this.notify();
      return { success: true, user: this.currentUser };
    }

    // Firebase Auth 실제 로그인
    try {
      const { getAuth, signInWithEmailAndPassword } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js");
      const auth = getAuth();
      const email = `${loginId}@${CONFIG.AUTH_DOMAIN}`;
      const cred = await signInWithEmailAndPassword(auth, email, password);

      const tokenRes = await cred.user.getIdTokenResult(true);
      const claims = tokenRes.claims || {};

      this.currentUser = {
        uid: cred.user.uid,
        loginId,
        name: cred.user.displayName || loginId,
        role: claims.role || "student",
        classId: claims.classId || CONFIG.DEFAULT_CLASS_ID,
        mustChangePw: claims.mustChangePw || false,
        idToken: tokenRes.token
      };

      localStorage.setItem("BV_AUTH_USER", JSON.stringify(this.currentUser));
      this.notify();
      return { success: true, user: this.currentUser };
    } catch (err) {
      console.error("로그인 에러:", err);
      let msg = "로그인에 실패했습니다. 아이디와 비밀번호를 확인하세요.";
      if (err.code === "auth/user-not-found" || err.code === "auth/wrong-password" || err.code === "auth/invalid-credential") {
        msg = "아이디 또는 비밀번호가 올바르지 않습니다.";
      }
      return { success: false, message: msg };
    }
  },

  async logout() {
    if (!CONFIG.IS_MOCK_MODE()) {
      try {
        const { getAuth, signOut } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js");
        const auth = getAuth();
        await signOut(auth);
      } catch (e) {
        console.warn("로그아웃 오류:", e);
      }
    }
    this.currentUser = null;
    localStorage.removeItem("BV_AUTH_USER");
    this.notify();
    return { success: true };
  },

  isAuthenticated() {
    return !!this.currentUser;
  },

  isTeacher() {
    return this.currentUser && this.currentUser.role === "teacher";
  }
};
