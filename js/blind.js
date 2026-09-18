/**
 * 블라인드 북 익스체인지 (비밀의 숲) 모듈
 */
const Blind = {
  records: [],

  async init() {
    await this.loadRecords();
  },

  async loadRecords() {
    const container = document.getElementById("blind-list-container");
    if (container) container.innerHTML = `<div class="p-8 text-center text-gray-500">비밀의 숲 책들을 불러오는 중... 🔮</div>`;

    const res = await API.request("getRecords", { type: "blind" });
    if (res.success) {
      this.records = res.records || [];
      this.renderBlindCards();
    }
  },

  renderBlindCards() {
    const container = document.getElementById("blind-list-container");
    if (!container) return;

    if (this.records.length === 0) {
      container.innerHTML = `
        <div class="village-card p-12 text-center col-span-full">
          <span class="text-4xl">🔮</span>
          <p class="mt-3 text-gray-600 font-bold">비밀의 숲에 등록된 도서가 없습니다.</p>
          <p class="text-xs text-gray-400 mt-1">표지를 숨긴 흥미진진한 퀴즈형 독서록을 남겨보세요!</p>
          <button onclick="Modal.openWriteModal('blind')" class="mt-4 px-4 py-2 bg-purple-600 text-white rounded-xl text-sm font-bold village-btn">
            🔮 비밀 도서 등록하기
          </button>
        </div>
      `;
      return;
    }

    container.innerHTML = this.records.map(r => this.createBlindCardHTML(r)).join("");
  },

  createBlindCardHTML(r) {
    const isRevealed = r.blindInfo ? r.blindInfo.revealed : false;
    const current = r.blindInfo ? r.blindInfo.currentCount : 0;
    const threshold = r.blindInfo ? r.blindInfo.threshold : 3;
    const progressPercent = Math.min(100, Math.round((current / threshold) * 100));

    if (isRevealed) {
      // 해금된 상태 (표지 공개)
      return `
        <div class="village-card p-5 border-2 border-purple-200 bg-gradient-to-br from-white to-purple-50 flex flex-col justify-between">
          <div>
            <div class="flex justify-between items-center mb-3">
              <span class="badge-pill bg-purple-100 text-purple-700 text-xs font-black">✨ 비밀 해금 완료!</span>
              <span class="text-[11px] text-gray-400">등록: ${r.userName}</span>
            </div>

            <div class="flex gap-3 mb-3">
              <img src="${r.book?.coverUrl}" class="w-20 h-28 object-cover rounded-xl shadow-md" />
              <div>
                <h4 class="font-bold text-sm text-gray-900">${r.book?.title}</h4>
                <p class="text-xs text-gray-500 mt-0.5">${r.book?.author}</p>
                <p class="text-[11px] text-purple-600 font-semibold mt-1">카테고리: ${r.book?.category || '도서'}</p>
              </div>
            </div>

            <div class="bg-white/80 p-3 rounded-xl border border-purple-100 text-xs text-gray-700 mb-3">
              <p class="font-bold text-purple-900 mb-1">❓ 질문:</p>
              <p class="italic">"${r.question}"</p>
            </div>
          </div>

          <button 
            onclick="Modal.openCommentsModal('${r.recordId}', '${r.book?.title || '비밀도서'}', 'blind')"
            class="w-full py-2 bg-purple-600 text-white rounded-xl text-xs font-bold village-btn"
          >
            💬 추리 댓글 및 토론 보기 (${current})
          </button>
        </div>
      `;
    } else {
      // 미해금 상태 (물음표 카드)
      return `
        <div class="village-card p-5 border-2 border-dashed border-purple-300 bg-white flex flex-col justify-between">
          <div>
            <div class="flex justify-between items-center mb-3">
              <span class="badge-pill bg-amber-100 text-amber-800 text-xs font-bold">🔒 베일에 싸인 도서</span>
              <span class="text-[11px] text-gray-400">등록: ${r.userName}</span>
            </div>

            <!-- 미스터리 뷰 -->
            <div class="bg-purple-900 text-white p-4 rounded-xl text-center mb-3 shadow-inner">
              <span class="text-3xl animate-bounce inline-block">❓</span>
              <h4 class="font-black text-sm text-purple-200 mt-1">이 책은 과연 어떤 책일까요?</h4>
              <p class="text-[11px] text-purple-300 mt-1">댓글 ${threshold - current}개가 더 달리면 표지와 제목이 공개됩니다!</p>
            </div>

            <!-- 질문 & 인상 깊은 문장 -->
            <div class="space-y-2 text-xs mb-4">
              <div class="bg-amber-50 p-3 rounded-xl border border-amber-200">
                <span class="font-bold text-amber-900 block mb-0.5">🧐 생각 질문</span>
                <p class="text-gray-800">"${r.question || '질문이 등록되지 않았습니다.'}"</p>
              </div>

              ${r.quote ? `
                <div class="bg-gray-50 p-2.5 rounded-xl border border-gray-200 italic text-gray-600">
                  " ${r.quote} "
                </div>
              ` : ''}
            </div>

            <!-- 해금 게이지 -->
            <div class="mb-4">
              <div class="flex justify-between text-[11px] font-bold text-gray-500 mb-1">
                <span>해금 진행도</span>
                <span>${current} / ${threshold} 댓글</span>
              </div>
              <div class="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                <div class="bg-purple-500 h-full rounded-full transition-all duration-500" style="width: ${progressPercent}%"></div>
              </div>
            </div>
          </div>

          <button 
            onclick="Modal.openCommentsModal('${r.recordId}', '비밀 도서 추리', 'blind')"
            class="w-full py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl text-xs font-bold village-btn flex items-center justify-center gap-1"
          >
            🕵️ 추리 댓글 남기고 해금하기!
          </button>
        </div>
      `;
    }
  }
};
