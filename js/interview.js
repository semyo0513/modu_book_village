/**
 * 책 속 인물 가상 인터뷰 & 핫비평 게시판 모듈
 */
const Interview = {
  records: [],

  async init() {
    await this.loadRecords();
  },

  async loadRecords() {
    const container = document.getElementById("interview-list-container");
    if (container) container.innerHTML = `<div class="p-8 text-center text-gray-500">책 속 인물들의 인터뷰를 준비하는 중... 🎙️</div>`;

    const res = await API.request("getRecords", { type: "interview" });
    if (res.success) {
      this.records = res.records || [];
      this.renderInterviews();
    }
  },

  renderInterviews() {
    const container = document.getElementById("interview-list-container");
    if (!container) return;

    if (this.records.length === 0) {
      container.innerHTML = `
        <div class="village-card p-12 text-center col-span-full">
          <span class="text-4xl">🎙️</span>
          <p class="mt-3 text-gray-600 font-bold">진행 중인 인터뷰 기사가 없습니다.</p>
          <p class="text-xs text-gray-400 mt-1">책 속 주인공이나 작가가 되어 가상 인터뷰를 열어보세요!</p>
          <button onclick="Modal.openWriteModal('interview')" class="mt-4 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold village-btn">
            🎙️ 가상 인터뷰 개최하기
          </button>
        </div>
      `;
      return;
    }

    container.innerHTML = this.records.map(r => this.createInterviewCardHTML(r)).join("");
  },

  createInterviewCardHTML(r) {
    return `
      <div class="village-card p-6 border-2 border-blue-100 flex flex-col justify-between">
        <div>
          <!-- 인터뷰 헤더 -->
          <div class="flex items-center justify-between mb-4">
            <span class="badge-pill bg-blue-100 text-blue-700 text-xs font-bold">
              🎙️ 책 속 인물 인터뷰
            </span>
            <span class="text-xs text-gray-400">초청자: ${r.userName}</span>
          </div>

          <!-- 인물 페르소나 배너 -->
          <div class="bg-gradient-to-r from-blue-900 to-indigo-800 text-white p-4 rounded-2xl mb-4 shadow-sm flex items-center gap-3">
            <div class="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-2xl flex-shrink-0">
              🎭
            </div>
            <div>
              <div class="text-[11px] text-blue-200 font-semibold">오늘의 특별 인터뷰 게스트</div>
              <h4 class="font-black text-base text-white">"${r.characterName || '주인공'}"</h4>
              <div class="text-xs text-blue-300 mt-0.5 truncate">도서: [${r.book?.title}]</div>
            </div>
          </div>

          <!-- 기사 타이틀 & 내용 -->
          <div class="space-y-2 mb-4">
            <h3 class="font-black text-base text-gray-900 leading-snug">${r.title}</h3>
            <p class="text-xs text-gray-700 leading-relaxed bg-gray-50 p-3 rounded-xl">
              ${r.content}
            </p>
            ${r.quote ? `
              <div class="text-xs italic text-blue-800 bg-blue-50/80 p-2.5 rounded-lg border-l-4 border-blue-500">
                💬 인물의 대표 한마디: "${r.quote}"
              </div>
            ` : ''}
          </div>
        </div>

        <!-- 하단 액션 버튼 -->
        <button 
          onclick="Modal.openCommentsModal('${r.recordId}', '${r.characterName} 인터뷰 기자회견', 'interview', '${r.characterName}')"
          class="w-full py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold village-btn flex items-center justify-center gap-1.5"
        >
          📰 학급 기자단 질문 & 답변 스레드 참여하기
        </button>
      </div>
    `;
  }
};
