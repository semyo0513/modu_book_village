/**
 * 3D 건물 내부 진입 오버레이 모달 매니저 (buildingModal.js)
 * - 3D 게임 화면 위에서 각 건물에 해당하는 컨텐츠를 풍성한 오버레이 창으로 렌더링
 * - ESC 키 또는 닫기 버튼으로 즉시 3D 마을로 복귀
 * - 모달 활성화 시 플레이어 조작 일시 정지
 */

import { AuthService } from "../auth/authService.js";
import { Repository } from "../data/repository.js";
import { Controls } from "./controls.js";

export const BuildingModal = {
  isOpen: false,
  currentBuildingId: null,

  init() {
    this.createModalDom();

    // ESC 키로 건물 나가기
    window.addEventListener("keydown", (e) => {
      if (this.isOpen && e.key === "Escape") {
        this.close();
      }
    });
  },

  createModalDom() {
    let el = document.getElementById("world-building-modal");
    if (!el) {
      el = document.createElement("div");
      el.id = "world-building-modal";
      el.className = "fixed inset-0 z-50 hidden items-center justify-center p-3 sm:p-6 bg-emerald-950/40 backdrop-blur-md";
      el.innerHTML = `
        <div class="relative w-full max-w-4xl bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border-4 border-emerald-400/50 flex flex-col max-h-[88vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          <!-- 모달 상단 헤더 -->
          <div class="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white shadow-md">
            <div class="flex items-center gap-3">
              <span id="bm-icon" class="text-3xl p-2 bg-white/20 rounded-2xl shadow-inner">📚</span>
              <div>
                <h3 id="bm-title" class="text-lg sm:text-xl font-black tracking-tight">도서관</h3>
                <p id="bm-desc" class="text-xs text-emerald-100 font-medium">새로운 책을 검색하고 나만의 완독 기록을 남겨보세요.</p>
              </div>
            </div>
            <button id="btn-close-building" class="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-white/20 hover:bg-white/30 text-white text-xs font-bold transition active:scale-95 shadow">
              <span>✕</span> <span class="hidden sm:inline">마을로 나가기 (ESC)</span>
            </button>
          </div>

          <!-- 모달 내부 동적 컨텐츠 컨테이너 -->
          <div id="bm-content" class="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            <!-- 탭별 컨텐츠 주입 -->
          </div>
        </div>
      `;
      document.body.appendChild(el);

      el.querySelector("#btn-close-building").addEventListener("click", () => this.close());
    }
  },

  open(buildingId) {
    this.currentBuildingId = buildingId;
    this.isOpen = true;
    Controls.targetPoint = null; // 이동 중단

    const modal = document.getElementById("world-building-modal");
    const iconEl = document.getElementById("bm-icon");
    const titleEl = document.getElementById("bm-title");
    const descEl = document.getElementById("bm-desc");
    const contentEl = document.getElementById("bm-content");

    if (!modal || !contentEl) return;

    modal.classList.remove("hidden");
    modal.classList.add("flex");

    // 건물별 헤더 및 컨텐츠 렌더링
    switch (buildingId) {
      case "library":
        iconEl.textContent = "📚";
        titleEl.textContent = "책마을 도서관";
        descEl.textContent = "새로운 도서를 검색하고, 감상평과 함께 완독 도서를 등록합니다.";
        this.renderLibrary(contentEl);
        break;

      case "postOffice":
        iconEl.textContent = "📮";
        titleEl.textContent = "책마을 우체국";
        descEl.textContent = "감동을 다음 친구에게! 키워드로 이어지는 책 꼬리잇기 릴레이.";
        this.renderRelay(contentEl);
        break;

      case "feed":
        iconEl.textContent = "🎪";
        titleEl.textContent = "마을 광장 피드";
        descEl.textContent = "친구들의 솔직담백한 독서 후기와 공감 이모지 반응을 확인해보세요.";
        this.renderFeed(contentEl);
        break;

      case "broadcast":
        iconEl.textContent = "🎙️";
        titleEl.textContent = "책마을 방송국";
        descEl.textContent = "책 속 인물과 기자가 되어 진행하는 페르소나 가상 인터뷰!";
        this.renderInterview(contentEl);
        break;

      case "blindForest":
        iconEl.textContent = "🔮";
        titleEl.textContent = "비밀의 숲 (블라인드 북)";
        descEl.textContent = "표지와 제목을 숨긴 미스터리 도서! 질문 댓글을 남겨 책을 밝혀보세요.";
        this.renderBlind(contentEl);
        break;

      case "myLibrary":
        iconEl.textContent = "🏡";
        titleEl.textContent = "나의 서재 & 옷장";
        descEl.textContent = "나만의 독서 서재와 통계, 그리고 캐릭터 꾸미기 옷장입니다.";
        this.renderMyLibrary(contentEl);
        break;

      case "admin":
        iconEl.textContent = "🏫";
        titleEl.textContent = "교무실 (관리자 설정)";
        descEl.textContent = "선생님 전용 관리 공간: CSV 학생 일괄 계정 발급 및 독서 통계 관리.";
        this.renderAdmin(contentEl);
        break;

      default:
        contentEl.innerHTML = `<p class="text-center text-gray-500 py-10">건물 정보를 불러올 수 없습니다.</p>`;
    }
  },

  close() {
    this.isOpen = false;
    this.currentBuildingId = null;
    const modal = document.getElementById("world-building-modal");
    if (modal) {
      modal.classList.add("hidden");
      modal.classList.remove("flex");
    }
  },

  // 1. 도서관 뷰 (알라딘 도서 검색 & 즉시 등록)
  renderLibrary(container) {
    container.innerHTML = `
      <div class="space-y-4">
        <!-- 검색 입력바 -->
        <div class="flex gap-2">
          <input type="text" id="bm-lib-search-input" placeholder="도서명, 저자, 출판사 또는 키워드를 입력하세요..." class="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:ring-2 focus:ring-emerald-400 outline-none font-medium" />
          <button id="btn-bm-lib-search" class="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold text-sm shadow-md transition active:scale-95">
            🔍 검색
          </button>
        </div>

        <!-- 퀵 액션 배너 -->
        <div class="flex items-center justify-between p-3 bg-emerald-50 rounded-2xl border border-emerald-100 text-xs text-emerald-800">
          <span>💡 원하는 책을 검색하여 클릭하면 바로 독서 감상평이나 완독 기록을 남길 수 있습니다!</span>
          <button onclick="Modal.openBookSearch('feed')" class="px-3 py-1.5 bg-emerald-600 text-white rounded-xl font-bold shadow-sm hover:bg-emerald-700">
            ✍️ 직접 등록창 열기
          </button>
        </div>

        <!-- 도서 검색 결과 컨테이너 -->
        <div id="bm-lib-results" class="space-y-3 min-h-[260px] max-h-[420px] overflow-y-auto pr-1">
          <div class="p-10 text-center text-gray-400">
            <span class="text-3xl block mb-2">📖</span>
            검색어를 입력하시면 알라딘 Open API에서 실시간으로 도서 정보를 찾아옵니다.
          </div>
        </div>
      </div>
    `;

    const searchInput = container.querySelector("#bm-lib-search-input");
    const searchBtn = container.querySelector("#btn-bm-lib-search");
    const resultsBox = container.querySelector("#bm-lib-results");

    const doSearch = async () => {
      const q = searchInput.value.trim();
      if (!q) {
        alert("검색어를 입력해주세요.");
        return;
      }
      resultsBox.innerHTML = `<div class="p-10 text-center text-emerald-600 font-bold animate-pulse">알라딘 도서 정보를 검색 중입니다... 🔍</div>`;

      try {
        const { AladinApi } = await import("../data/aladinApi.js");
        const res = await AladinApi.search(q);
        if (res.success && res.items && res.items.length > 0) {
          resultsBox.innerHTML = res.items.map(item => `
            <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 bg-white border border-gray-100 hover:border-emerald-300 rounded-2xl shadow-sm transition hover:shadow-md">
              <div class="flex items-center gap-3">
                <img src="${item.coverUrl}" class="w-14 h-20 object-cover rounded-xl shadow flex-shrink-0" onerror="this.src='https://via.placeholder.com/80x110'" />
                <div>
                  <h4 class="font-bold text-sm text-gray-900 line-clamp-1">${item.title}</h4>
                  <p class="text-xs text-gray-500 mt-0.5">${item.author} | ${item.publisher}</p>
                  <span class="inline-block mt-1 text-[11px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-semibold">⭐ ${item.aladinRating || '9.5'}</span>
                </div>
              </div>
              <button onclick='Modal.selectBook(${JSON.stringify(item).replace(/'/g, "&#39;")}); BuildingModal.close();' class="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition shadow whitespace-nowrap self-end sm:self-auto">
                ✍️ 이 책으로 기록 작성
              </button>
            </div>
          `).join("");
        } else {
          resultsBox.innerHTML = `<div class="p-10 text-center text-gray-400">검색 결과가 없습니다. 다른 검색어를 입력해보세요.</div>`;
        }
      } catch (err) {
        resultsBox.innerHTML = `<div class="p-10 text-center text-rose-500">도서 검색 중 오류가 발생했습니다.</div>`;
      }
    };

    searchBtn.addEventListener("click", doSearch);
    searchInput.addEventListener("keydown", (e) => { if (e.key === "Enter") doSearch(); });
  },

  // 2. 우체국 (책 꼬리잇기 릴레이)
  renderRelay(container) {
    const existing = document.getElementById("panel-relay");
    if (existing) {
      container.innerHTML = existing.innerHTML;
      if (window.Relay) window.Relay.init();
    } else {
      container.innerHTML = `<p class="p-10 text-center text-gray-400">우체국 데이터를 불러오는 중...</p>`;
    }
  },

  // 3. 광장 피드
  renderFeed(container) {
    const existing = document.getElementById("panel-feed");
    if (existing) {
      container.innerHTML = existing.innerHTML;
      if (window.Feed) window.Feed.init();
    } else {
      container.innerHTML = `<p class="p-10 text-center text-gray-400">피드 데이터를 불러오는 중...</p>`;
    }
  },

  // 4. 방송국 (가상 인터뷰)
  renderInterview(container) {
    const existing = document.getElementById("panel-interview");
    if (existing) {
      container.innerHTML = existing.innerHTML;
      if (window.Interview) window.Interview.init();
    } else {
      container.innerHTML = `<p class="p-10 text-center text-gray-400">인터뷰 데이터를 불러오는 중...</p>`;
    }
  },

  // 5. 비밀의 숲 (블라인드 북)
  renderBlind(container) {
    const existing = document.getElementById("panel-blind");
    if (existing) {
      container.innerHTML = existing.innerHTML;
      if (window.Blind) window.Blind.init();
    } else {
      container.innerHTML = `<p class="p-10 text-center text-gray-400">비밀의 숲 데이터를 불러오는 중...</p>`;
    }
  },

  // 6. 내 서재 & 캐릭터 꾸미기 옷장
  renderMyLibrary(container) {
    container.innerHTML = `
      <div class="space-y-6">
        <!-- 상단 꾸미기 배너 -->
        <div class="p-5 bg-gradient-to-r from-pink-500 via-rose-500 to-amber-500 rounded-3xl text-white shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4">
          <div class="flex items-center gap-3">
            <span class="text-4xl">🎨</span>
            <div>
              <h4 class="font-black text-lg">나만의 동물의 숲 아바타 꾸미기</h4>
              <p class="text-xs text-pink-100">모자, 헤어 스타일, 옷 색상, 피부톤을 자유롭게 변경해보세요!</p>
            </div>
          </div>
          <button onclick="window.CharacterCustomizer && window.CharacterCustomizer.openModal()" class="px-5 py-2.5 bg-white text-pink-600 hover:bg-pink-50 rounded-2xl font-black text-xs shadow-md transition active:scale-95 whitespace-nowrap">
            ✨ 아바타 옷장 열기
          </button>
        </div>

        <!-- 기존 나의 서재 컨텐츠 로드 -->
        <div id="bm-myroom-embed" class="space-y-4"></div>
      </div>
    `;

    const myroomEmbed = container.querySelector("#bm-myroom-embed");
    const existing = document.getElementById("panel-myroom");
    if (existing && myroomEmbed) {
      myroomEmbed.innerHTML = existing.innerHTML;
      if (window.MyRoom) window.MyRoom.init();
    }
  },

  // 7. 교무실 (교사 전용)
  renderAdmin(container) {
    if (!AuthService.isTeacher()) {
      container.innerHTML = `
        <div class="p-12 text-center space-y-3">
          <span class="text-5xl block">🔒</span>
          <h4 class="font-black text-base text-gray-800">선생님 전용 관리 구역입니다</h4>
          <p class="text-xs text-gray-500">교사 계정(선생님)으로 로그인하시면 학생 CSV 일괄 계정 생성 및 통계 관리를 이용하실 수 있습니다.</p>
          <button onclick="Modal.openLogin()" class="px-5 py-2 bg-purple-600 text-white rounded-xl text-xs font-bold shadow-md">
            교사 계정으로 로그인하기
          </button>
        </div>
      `;
      return;
    }

    const existing = document.getElementById("panel-admin");
    if (existing) {
      container.innerHTML = existing.innerHTML;
      if (window.Admin) window.Admin.init();
    }
  }
};

window.BuildingModal = BuildingModal;
