/**
 * 사용자 인증 및 세션 관리 모듈
 */
const Auth = {
  TOKEN_KEY: "BOOK_VILLAGE_AUTH_TOKEN",
  USER_KEY: "BOOK_VILLAGE_AUTH_USER",

  getToken() {
    return localStorage.getItem(this.TOKEN_KEY);
  },

  getCurrentUser() {
    const u = localStorage.getItem(this.USER_KEY);
    return u ? JSON.parse(u) : null;
  },

  setCurrentUser(user) {
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
  },

  isLoggedIn() {
    return !!this.getToken() && !!this.getCurrentUser();
  },

  isTeacher() {
    const user = this.getCurrentUser();
    return user && user.role === "teacher";
  },

  async login(userId, password) {
    const res = await API.request("login", { userId, password });
    if (res.success) {
      localStorage.setItem(this.TOKEN_KEY, res.token);
      localStorage.setItem(this.USER_KEY, JSON.stringify(res.user));
      this.updateNavbarUI();
      return { success: true, user: res.user };
    }
    return { success: false, message: res.message };
  },

  logout() {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    this.updateNavbarUI();
    window.location.reload();
  },

  // 퀵 로그인 (데모/체험 편의용)
  async quickLogin(userId) {
    const pw = userId === "teacher" ? "admin1234" : "1234";
    return await this.login(userId, pw);
  },

  updateNavbarUI() {
    const user = this.getCurrentUser();
    const guestNav = document.getElementById("nav-guest");
    const userNav = document.getElementById("nav-user");
    const userNameSpan = document.getElementById("nav-user-name");
    const userRoleSpan = document.getElementById("nav-user-role");
    const teacherMenu = document.getElementById("nav-teacher-menu");

    if (user && guestNav && userNav) {
      guestNav.classList.add("hidden");
      userNav.classList.remove("hidden");
      userNav.classList.add("flex");

      if (userNameSpan) userNameSpan.textContent = user.name;
      if (userRoleSpan) {
        userRoleSpan.textContent = user.role === "teacher" ? "선생님" : `${user.number}번 학생`;
        userRoleSpan.className = user.role === "teacher" 
          ? "badge-pill bg-purple-100 text-purple-700 text-xs" 
          : "badge-pill bg-emerald-100 text-emerald-700 text-xs";
      }

      if (teacherMenu) {
        if (user.role === "teacher") {
          teacherMenu.classList.remove("hidden");
        } else {
          teacherMenu.classList.add("hidden");
        }
      }
    } else if (guestNav && userNav) {
      guestNav.classList.remove("hidden");
      userNav.classList.add("hidden");
      userNav.classList.remove("flex");
      if (teacherMenu) teacherMenu.classList.add("hidden");
    }
  }
};
