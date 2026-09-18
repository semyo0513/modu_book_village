/**
 * 우리 반 한 줄 피드 (Bookgram) 모듈
 */
const Feed = {
  currentRecords: [],
  selectedTag: "전체",

  async init() {
    this.renderTagFilters();
    await this.loadRecords();
  },

  renderTagFilters() {
    const filterContainer = document.getElementById("feed-tag-filters");
    if (!filterContainer) return;

    const tags = ["전체", ...CONFIG.EMOTION_TAGS];
    filterContainer.innerHTML = tags.map(tag => `
      <button 
        class="px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${this.selectedTag === tag ? 'bg-emerald-500 text-white shadow-md' : 'bg-white/80 text-gray-600 hover:bg-emerald-50 border border-gray-200'}"
        onclick="Feed.setFilter('${tag}')"
      >
        ${tag}
      </button>
    `).join("");
  },

  async setFilter(tag) {
    this.selectedTag = tag;
    this.renderTagFilters();
    this.renderRecords();
  },

  async loadRecords() {
    const listEl = document.getElementById("feed-list-container");
    if (listEl) listEl.innerHTML = `<div class="p-8 text-center text-gray-500">독서 피드를 불러오는 중... 📚</div>`;

    const res = await API.request("getRecords", { type: "feed" });
    if (res.success) {
      this.currentRecords = res.records || [];
      this.renderRecords();
    } else {
      if (listEl) listEl.innerHTML = `<div class="p-8 text-center text-red-500">${res.message}</div>`;
    }
  },

  renderRecords() {
    const listEl = document.getElementById("feed-list-container");
    if (!listEl) return;

    let filtered = this.currentRecords;
    if (this.selectedTag !== "전체") {
      filtered = filtered.filter(r => r.emotionTag === this.selectedTag);
    }

    if (filtered.length === 0) {
      listEl.innerHTML = `
        <div class="village-card p-12 text-center col-span-full">
          <span class="text-4xl">📖</span>
          <p class="mt-3 text-gray-600 font-bold">등록된 피드가 없습니다.</p>
          <p class="text-xs text-gray-400 mt-1">도서관에서 읽은 책의 감동을 첫 피드로 공유해보세요!</p>
          <button onclick="Modal.openWriteModal('feed')" class="mt-4 px-4 py-2 bg-emerald-500 text-white rounded-xl text-sm font-bold village-btn">
            ✍️ 한 줄 피드 작성하기
          </button>
        </div>
      `;
      return;
    }

    listEl.innerHTML = filtered.map(r => this.createFeedCardHTML(r)).join("");
  },

  createFeedCardHTML(r) {
    const stars = "⭐".repeat(r.rating || 5);
    const aladinRating = r.book && r.book.aladinRating ? (r.book.aladinRating / 2).toFixed(1) : "4.5";

    return `
      <div class="village-card p-5 flex flex-col justify-between hover:shadow-lg transition-all" id="feed-card-${r.recordId}">
        <div>
          <!-- 상단 작성자 정보 & 감정태그 -->
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center gap-2">
              <div class="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center font-bold text-emerald-700 text-xs">
                ${r.userName ? r.userName.substring(0, 1) : '학'}
              </div>
              <div>
                <div class="text-xs font-bold text-gray-800">${r.userName}</div>
                <div class="text-[10px] text-gray-400">${new Date(r.createdAt).toLocaleDateString()}</div>
              </div>
            </div>
            <span class="badge-pill bg-emerald-50 text-emerald-700 border border-emerald-100 text-[11px]">
              ${r.emotionTag || '🌟 깊은감동'}
            </span>
          </div>

          <!-- 도서 정보 요약 -->
          <div class="flex gap-3.5 bg-gray-50/80 p-3 rounded-xl border border-gray-100 mb-3">
            <img 
              src="${r.book?.coverUrl || 'https://via.placeholder.com/120x170?text=Book'}" 
              alt="표지" 
              class="w-16 h-24 object-cover rounded-lg shadow-sm flex-shrink-0"
              onerror="this.src='https://via.placeholder.com/120x170?text=No+Cover'"
            />
            <div class="flex flex-col justify-between overflow-hidden">
              <div>
                <h4 class="font-bold text-sm text-gray-900 truncate" title="${r.book?.title}">${r.book?.title || '도서 제목'}</h4>
                <p class="text-xs text-gray-500 truncate mt-0.5">${r.book?.author || '저자 정보 없음'}</p>
              </div>

              <!-- 별점 비교 위젯 -->
              <div class="flex items-center gap-2 text-[11px] font-semibold bg-white px-2 py-1 rounded-md border border-gray-200">
                <span class="text-amber-500">내 별점: ${stars}</span>
                <span class="text-gray-300">|</span>
                <span class="text-blue-500">알라딘 평점: ★ ${aladinRating}</span>
              </div>
            </div>
          </div>

          <!-- 감상 내용 및 인용구 -->
          <div class="space-y-2">
            <h5 class="font-bold text-sm text-gray-800">${r.title || ''}</h5>
            <p class="text-xs text-gray-700 leading-relaxed">${r.content}</p>
            ${r.quote ? `
              <div class="bg-amber-50/80 border-l-4 border-amber-400 p-2.5 rounded-r-lg text-xs italic text-amber-900">
                " ${r.quote} "
              </div>
            ` : ''}
          </div>
        </div>

        <!-- 하단 소통 인터랙션 버튼 -->
        <div class="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-600">
          <div class="flex items-center gap-3">
            <button 
              onclick="Feed.toggleReaction('${r.recordId}', 'like')"
              class="flex items-center gap-1 hover:text-rose-500 transition-colors font-semibold"
            >
              ❤️ <span id="like-count-${r.recordId}">공감</span>
            </button>
            <button 
              onclick="Feed.toggleReaction('${r.recordId}', 'wish')"
              class="flex items-center gap-1 hover:text-amber-500 transition-colors font-semibold"
            >
              ⭐ <span>위시리스트</span>
            </button>
            <button 
              onclick="Modal.openCommentsModal('${r.recordId}', '${r.book?.title || '독서록'}')"
              class="flex items-center gap-1 hover:text-emerald-600 transition-colors font-semibold"
            >
              💬 <span>댓글/대화</span>
            </button>
          </div>
        </div>
      </div>
    `;
  },

  async toggleReaction(recordId, type) {
    if (!Auth.isLoggedIn()) {
      alert("로그인 후 이용할 수 있습니다.");
      Modal.openLogin();
      return;
    }

    const res = await API.request("toggleReaction", { recordId, type });
    if (res.success) {
      const typeText = type === "like" ? "공감" : "위시리스트";
      alert(res.active ? `✨ ${typeText}에 등록되었습니다!` : `💔 ${typeText}이 취소되었습니다.`);
    }
  }
};
