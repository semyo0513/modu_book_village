/**
 * 마을 메인 허브 (2.5D Isometric Village) 렌더링 및 인터랙션 모듈
 */
const Village = {
  // 나무 단계별 이모지 및 라벨
  TREE_STAGES: [
    { level: 1, name: "새싹 나무", icon: "🌱", desc: "책의 씨앗이 싹텄어요!" },
    { level: 2, name: "어린 묘목", icon: "🌿", desc: "이파리가 돋아나고 있어요." },
    { level: 3, name: "풍성한 나무", icon: "🌳", desc: "가지가 뻗어 그늘이 생겼어요." },
    { level: 4, name: "열매 나무", icon: "🍎", desc: "독서의 달콤한 열매가 맺혔어요!" },
    { level: 5, name: "전설의 지혜 나무", icon: "✨🌳✨", desc: "온 마을을 비추는 거대한 지혜의 나무!" }
  ],

  async init() {
    this.renderLandmarks();
    await this.refreshVillageStatus();
  },

  renderLandmarks() {
    const container = document.getElementById("village-map-container");
    if (!container) return;

    // 랜드마크 정의 (위치: % 기준)
    const landmarks = [
      {
        id: "landmark-library",
        name: "도서관",
        desc: "알라딘 도서 검색 & 독서록 작성",
        icon: "🏛️",
        top: "28%",
        left: "22%",
        badge: "책 등록",
        action: () => Modal.openBookSearch()
      },
      {
        id: "landmark-plaza",
        name: "한 줄 광장",
        desc: "우리 반 감성 피드 & 별점 비교",
        icon: "🎪",
        top: "35%",
        left: "76%",
        badge: "Bookgram",
        action: () => App.switchTab("feed")
      },
      {
        id: "landmark-tree",
        name: "우리 반 독서 나무",
        desc: "모두의 독서로 자라나는 중앙 나무",
        icon: "🌳",
        top: "50%",
        left: "48%",
        isTree: true,
        action: () => this.showTreeInfoModal()
      },
      {
        id: "landmark-post",
        name: "릴레이 우체국",
        desc: "키워드로 이어지는 책 꼬리잇기",
        icon: "📮",
        top: "70%",
        left: "24%",
        badge: "꼬리잇기",
        action: () => App.switchTab("relay")
      },
      {
        id: "landmark-station",
        name: "책 속 방송국",
        desc: "가상 인물 인터뷰 & 핫비평",
        icon: "🎙️",
        top: "74%",
        left: "72%",
        badge: "기자회견",
        action: () => App.switchTab("interview")
      },
      {
        id: "landmark-blind",
        name: "비밀의 숲 (블라인드)",
        desc: "표지를 가린 호기심 독서 교환",
        icon: "🔮",
        top: "16%",
        left: "50%",
        badge: "추리/해금",
        action: () => App.switchTab("blind")
      },
      {
        id: "landmark-myroom",
        name: "나의 서재",
        desc: "내 독서나무 & 탐험가 뱃지",
        icon: "🏡",
        top: "86%",
        left: "48%",
        badge: "내방",
        action: () => App.switchTab("myroom")
      }
    ];

    // 기존 요소 제거 후 생성
    const oldLandmarks = container.querySelectorAll(".village-landmark");
    oldLandmarks.forEach(el => el.remove());

    landmarks.forEach(lm => {
      const el = document.createElement("div");
      el.className = `village-landmark ${lm.isTree ? 'tree-landmark' : ''}`;
      el.style.top = lm.top;
      el.style.left = lm.left;

      if (lm.isTree) {
        el.innerHTML = `
          <div class="flex flex-col items-center">
            <div class="tree-visual-container">
              <span id="village-tree-icon" class="tree-stage-icon">🌳</span>
              <span class="tree-sparkle text-2xl top-0 right-2">✨</span>
            </div>
            <div class="landmark-card !py-1 !px-3 !rounded-full mt-1 bg-white/95 shadow-md">
              <span id="village-tree-title" class="font-black text-sm text-emerald-800">1반 독서 나무</span>
              <div class="flex items-center gap-1.5 text-xs font-bold text-emerald-600">
                <span id="village-tree-leaves">🍃 0잎</span>
                <span>•</span>
                <span id="village-tree-fruits">🍎 0열매</span>
              </div>
            </div>
          </div>
        `;
      } else {
        el.innerHTML = `
          <div class="landmark-card">
            ${lm.badge ? `<span class="landmark-badge">${lm.badge}</span>` : ''}
            <div class="landmark-icon">${lm.icon}</div>
            <div class="landmark-title">${lm.name}</div>
            <div class="landmark-desc">${lm.desc}</div>
          </div>
        `;
      }

      el.addEventListener("click", (e) => {
        e.stopPropagation();
        lm.action();
      });

      container.appendChild(el);
    });
  },

  async refreshVillageStatus() {
    const res = await API.request("getVillageStatus", { classId: "1반" });
    if (res.success && res.classTree) {
      const tree = res.classTree;
      const stageIdx = Math.min(Math.max((tree.treeStage || 1) - 1, 0), this.TREE_STAGES.length - 1);
      const stageInfo = this.TREE_STAGES[stageIdx];

      const iconEl = document.getElementById("village-tree-icon");
      const titleEl = document.getElementById("village-tree-title");
      const leavesEl = document.getElementById("village-tree-leaves");
      const fruitsEl = document.getElementById("village-tree-fruits");

      if (iconEl) iconEl.textContent = stageInfo.icon;
      if (titleEl) titleEl.textContent = `${tree.className || '1반'} ${stageInfo.name}`;
      if (leavesEl) leavesEl.textContent = `🍃 ${tree.totalLeaves || 0}잎`;
      if (fruitsEl) fruitsEl.textContent = `🍎 ${tree.totalFruits || 0}열매`;

      // 최신 소식 티커 렌더링
      this.renderNewsTicker(res.recentNews || []);
    }
  },

  renderNewsTicker(newsList) {
    const tickerContainer = document.getElementById("village-news-ticker");
    if (!tickerContainer) return;

    if (newsList.length === 0) {
      tickerContainer.innerHTML = `<span class="text-xs text-gray-500">✨ 평화로운 책마을에 첫 번째 독서 이야기를 들려주세요!</span>`;
      return;
    }

    const latest = newsList[0];
    const typeNames = { feed: "한줄피드", blind: "비밀도서", relay: "책꼬리잇기", interview: "가상인터뷰" };
    tickerContainer.innerHTML = `
      <div class="flex items-center gap-2 text-xs font-semibold text-gray-700 animate-pulse-soft">
        <span class="badge-pill bg-emerald-100 text-emerald-700 font-bold">마을 속보</span>
        <span><strong>${latest.userName}</strong> 친구가 [${typeNames[latest.type] || '독서록'}]을 남겼습니다: <em>"${latest.title || latest.content.substring(0, 20)}..."</em></span>
      </div>
    `;
  },

  showTreeInfoModal() {
    const modal = document.getElementById("modal-tree-detail");
    if (modal) {
      modal.classList.remove("hidden");
      modal.classList.add("flex");
    }
  }
};
