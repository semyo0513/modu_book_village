/**
 * 책마을 메인 앱 컨트롤러 & 모달 인터랙션 매니저 (app.js)
 */

const App = {
  currentTab: "village",

  async init() {
    Auth.updateNavbarUI();
    Village.init();

    // URL 해시 라우팅 지원
    const hash = window.location.hash.replace("#", "");
    if (hash && ["village", "feed", "relay", "blind", "interview", "myroom", "admin"].includes(hash)) {
      this.switchTab(hash);
    }
  },

  switchTab(tabName) {
    this.currentTab = tabName;
    window.location.hash = tabName;

    // 모든 탭 컨테이너 숨김
    const tabPanels = document.querySelectorAll(".tab-panel");
    tabPanels.forEach(el => el.classList.add("hidden"));

    // 선택된 탭 표시
    const activePanel = document.getElementById(`panel-${tabName}`);
    if (activePanel) {
      activePanel.classList.remove("hidden");
    }

    // 네비게이션 활성 상태 갱신
    const navButtons = document.querySelectorAll(".nav-tab-btn");
    navButtons.forEach(btn => {
      if (btn.dataset.tab === tabName) {
        btn.classList.add("bg-emerald-100", "text-emerald-800", "font-bold");
        btn.classList.remove("text-gray-600");
      } else {
        btn.classList.remove("bg-emerald-100", "text-emerald-800", "font-bold");
        btn.classList.add("text-gray-600");
      }
    });

    // 탭별 데이터 로드
    if (tabName === "village") Village.refreshVillageStatus();
    if (tabName === "feed") Feed.init();
    if (tabName === "relay") Relay.init();
    if (tabName === "blind") Blind.init();
    if (tabName === "interview") Interview.init();
    if (tabName === "myroom") MyRoom.init();
    if (tabName === "admin") Admin.init();

    window.scrollTo({ top: 0, behavior: "smooth" });
  }
};

// ==========================================
// 공통 모달 관리자
// ==========================================
const Modal = {
  currentSelectedBook: null,
  currentCommentRecordId: null,

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add("hidden");
      modal.classList.remove("flex");
    }
  },

  openLogin() {
    const modal = document.getElementById("modal-login");
    if (modal) {
      modal.classList.remove("hidden");
      modal.classList.add("flex");
    }
  },

  async handleLoginSubmit(e) {
    if (e) e.preventDefault();
    const uid = document.getElementById("login-userid").value.trim();
    const pw = document.getElementById("login-password").value.trim();

    if (!uid || !pw) {
      alert("아이디와 비밀번호를 입력해주세요.");
      return;
    }

    const res = await Auth.login(uid, pw);
    if (res.success) {
      this.closeModal("modal-login");
      alert(`🎉 ${res.user.name}님, 책마을에 오신 것을 환영합니다!`);
      App.switchTab(App.currentTab);
    } else {
      alert(res.message);
    }
  },

  // 도서 검색 모달 열기
  openBookSearch(targetType = "feed") {
    if (!Auth.isLoggedIn()) {
      alert("독서 활동을 등록하려면 먼저 로그인해주세요.");
      this.openLogin();
      return;
    }

    document.getElementById("search-target-type").value = targetType;
    const modal = document.getElementById("modal-book-search");
    if (modal) {
      modal.classList.remove("hidden");
      modal.classList.add("flex");
      document.getElementById("book-search-input").focus();
    }
  },

  async handleBookSearch() {
    const query = document.getElementById("book-search-input").value.trim();
    if (!query) {
      alert("검색어를 입력해주세요.");
      return;
    }

    const resultsContainer = document.getElementById("book-search-results");
    resultsContainer.innerHTML = `<div class="p-6 text-center text-gray-500">알라딘 도서 정보를 검색 중... 🔍</div>`;

    const res = await API.request("searchAladin", { query: query });
    if (res.success) {
      const items = res.items || [];
      if (items.length === 0) {
        resultsContainer.innerHTML = `<div class="p-6 text-center text-gray-500">검색 결과가 없습니다. 다른 검색어로 시도해보세요.</div>`;
        return;
      }

      resultsContainer.innerHTML = items.map(item => `
        <div class="flex items-center justify-between p-3 rounded-xl border border-gray-100 hover:bg-emerald-50/50 hover:border-emerald-200 transition-all cursor-pointer" onclick='Modal.selectBook(${JSON.stringify(item).replace(/'/g, "&#39;")})'>
          <div class="flex items-center gap-3">
            <img src="${item.coverUrl}" class="w-12 h-16 object-cover rounded shadow-sm flex-shrink-0" onerror="this.src='https://via.placeholder.com/80x110'" />
            <div class="overflow-hidden">
              <h5 class="font-bold text-xs text-gray-900 line-clamp-1">${item.title}</h5>
              <p class="text-[11px] text-gray-500 truncate mt-0.5">${item.author} | ${item.publisher}</p>
              <span class="badge-pill bg-gray-100 text-gray-600 text-[10px] mt-1">${item.category ? item.category.split('>')[0] : '도서'}</span>
            </div>
          </div>
          <button class="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold village-btn flex-shrink-0">
            선택
          </button>
        </div>
      `).join("");
    } else {
      resultsContainer.innerHTML = `<div class="p-6 text-center text-red-500">${res.message}</div>`;
    }
  },

  selectBook(book) {
    this.currentSelectedBook = book;
    this.closeModal("modal-book-search");

    const targetType = document.getElementById("search-target-type").value || "feed";
    this.openWriteModal(targetType, { book: book });
  },

  // 글쓰기 모달 열기
  openWriteModal(type = "feed", extra = {}) {
    if (!Auth.isLoggedIn()) {
      alert("로그인이 필요합니다.");
      this.openLogin();
      return;
    }

    if (!this.currentSelectedBook && !extra.book) {
      this.openBookSearch(type);
      return;
    }

    const book = extra.book || this.currentSelectedBook;
    this.currentSelectedBook = book;

    const modal = document.getElementById("modal-write-record");
    if (!modal) return;

    // 모달 타입 세팅
    document.getElementById("write-type-select").value = type;
    document.getElementById("write-book-isbn").value = book.isbn;
    document.getElementById("write-book-title-display").textContent = book.title;
    document.getElementById("write-book-author-display").textContent = `${book.author} | ${book.publisher}`;
    document.getElementById("write-book-cover-display").src = book.coverUrl;

    // 릴레이 추가 정보
    if (extra.relayFromRecordId) {
      document.getElementById("write-relay-from-id").value = extra.relayFromRecordId;
      document.getElementById("write-relay-info-box").classList.remove("hidden");
      document.getElementById("write-relay-parent-title").textContent = `연결할 앞 책: [${extra.parentTitle}]`;
    } else {
      document.getElementById("write-relay-from-id").value = "";
      document.getElementById("write-relay-info-box").classList.add("hidden");
    }

    this.toggleWriteFieldsByType(type);

    modal.classList.remove("hidden");
    modal.classList.add("flex");
  },

  toggleWriteFieldsByType(type) {
    const blindFields = document.getElementById("write-blind-fields");
    const interviewFields = document.getElementById("write-interview-fields");
    const relayFields = document.getElementById("write-relay-fields");

    if (blindFields) blindFields.classList.toggle("hidden", type !== "blind");
    if (interviewFields) interviewFields.classList.toggle("hidden", type !== "interview");
    if (relayFields) relayFields.classList.toggle("hidden", type !== "relay");
  },

  async handleRecordSubmit(e) {
    if (e) e.preventDefault();
    if (!this.currentSelectedBook) return;

    const type = document.getElementById("write-type-select").value;
    const content = document.getElementById("write-content").value.trim();
    const title = document.getElementById("write-title").value.trim();
    const quote = document.getElementById("write-quote").value.trim();
    const rating = document.getElementById("write-rating").value;
    const emotionTag = document.getElementById("write-emotion").value;

    if (!content) {
      alert("독서 감상 내용을 작성해주세요.");
      return;
    }

    const payload = {
      type: type,
      isbn: this.currentSelectedBook.isbn,
      title: title,
      content: content,
      quote: quote,
      rating: Number(rating),
      emotionTag: emotionTag,
      bookObj: this.currentSelectedBook
    };

    if (type === "blind") {
      payload.question = document.getElementById("write-blind-question").value.trim();
      payload.blindThreshold = Number(document.getElementById("write-blind-threshold").value) || 3;
    }

    if (type === "interview") {
      payload.characterName = document.getElementById("write-interview-character").value.trim() || "주인공";
    }

    if (type === "relay") {
      payload.relayFromRecordId = document.getElementById("write-relay-from-id").value;
      payload.relayReasonKeyword = document.getElementById("write-relay-keyword").value.trim();
      payload.relayReasonText = document.getElementById("write-relay-reason").value.trim();
    }

    const res = await API.request("createRecord", payload);
    if (res.success) {
      alert("🎉 독서 기록이 성공적으로 등록되었습니다! (나무가 쑥쑥 자라났어요 🍃)");
      this.closeModal("modal-write-record");
      this.currentSelectedBook = null;
      document.getElementById("form-write-record").reset();
      App.switchTab(type === "relay" ? "relay" : type === "blind" ? "blind" : type === "interview" ? "interview" : "feed");
    } else {
      alert("등록 실패: " + res.message);
    }
  },

  // 댓글 모달 열기
  async openCommentsModal(recordId, targetTitle, mode = "feed", characterName = "") {
    this.currentCommentRecordId = recordId;
    const modal = document.getElementById("modal-comments");
    if (!modal) return;

    document.getElementById("comments-modal-title").textContent = `💬 ${targetTitle} 소통 창구`;
    
    // 모드별 힌트 및 역할 라디오 표시
    const roleSelector = document.getElementById("comments-role-selector");
    if (roleSelector) {
      if (mode === "interview") {
        roleSelector.classList.remove("hidden");
        document.getElementById("comments-role-persona-name").textContent = `[${characterName}] 입장으로 답변`;
      } else {
        roleSelector.classList.add("hidden");
      }
    }

    modal.classList.remove("hidden");
    modal.classList.add("flex");

    await this.loadComments(recordId);
  },

  async loadComments(recordId) {
    const container = document.getElementById("comments-list-container");
    container.innerHTML = `<div class="p-4 text-center text-gray-500">댓글을 불러오는 중...</div>`;

    const res = await API.request("getComments", { recordId: recordId });
    if (res.success) {
      const list = res.comments || [];
      if (list.length === 0) {
        container.innerHTML = `<p class="text-xs text-gray-400 text-center py-6">첫 번째 댓글을 남겨 대화를 시작해보세요!</p>`;
        return;
      }

      container.innerHTML = list.map(c => `
        <div class="p-3 rounded-xl ${c.roleType === 'persona' ? 'bg-blue-50 border border-blue-200' : c.roleType === 'journalist' ? 'bg-amber-50 border border-amber-200' : 'bg-gray-50'} text-xs">
          <div class="flex items-center justify-between mb-1">
            <span class="font-bold ${c.roleType === 'persona' ? 'text-blue-900 font-black' : 'text-gray-800'}">
              ${c.roleType === 'persona' ? '🎭 ' + c.userName : c.roleType === 'journalist' ? '📰 ' + c.userName + ' 기자' : c.userName}
            </span>
            <span class="text-[10px] text-gray-400">${new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
          <p class="text-gray-700 leading-relaxed">${c.content}</p>
        </div>
      `).join("");
    }
  },

  async handleCommentSubmit(e) {
    if (e) e.preventDefault();
    if (!Auth.isLoggedIn()) {
      alert("댓글을 작성하려면 로그인해주세요.");
      this.openLogin();
      return;
    }

    const content = document.getElementById("comment-input-text").value.trim();
    if (!content) return;

    let roleType = "student";
    const selectedRoleEl = document.querySelector("input[name='commentRole']:checked");
    if (selectedRoleEl) roleType = selectedRoleEl.value;

    const res = await API.request("addComment", {
      recordId: this.currentCommentRecordId,
      content: content,
      roleType: roleType
    });

    if (res.success) {
      document.getElementById("comment-input-text").value = "";
      if (res.justRevealed) {
        alert("🎉 축하합니다! 목표 댓글을 달성하여 비밀 도서의 표지와 정보가 해금되었습니다!");
      }
      await this.loadComments(this.currentCommentRecordId);
      // 백그라운드 갱신
      if (App.currentTab === "blind") Blind.loadRecords();
    } else {
      alert(res.message);
    }
  }
};

window.App = App;
window.Modal = Modal;

// DOM 로드 완료 후 앱 초기화
document.addEventListener("DOMContentLoaded", () => {
  App.init();
});
