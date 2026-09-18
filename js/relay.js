/**
 * 책 꼬리잇기 (릴레이 라이브러리) 모듈
 */
const Relay = {
  nodes: [],
  links: [],

  async init() {
    await this.loadRelayGraph();
  },

  async loadRelayGraph() {
    const container = document.getElementById("relay-view-container");
    if (container) container.innerHTML = `<div class="p-8 text-center text-gray-500">독서 꼬리잇기 지도를 연결하는 중... 🔗</div>`;

    const res = await API.request("getRelayGraph", { classId: "1반" });
    if (res.success) {
      this.nodes = res.nodes || [];
      this.links = res.links || [];
      this.renderRelayChain();
    }
  },

  renderRelayChain() {
    const container = document.getElementById("relay-view-container");
    if (!container) return;

    if (this.nodes.length === 0) {
      container.innerHTML = `
        <div class="village-card p-12 text-center col-span-full">
          <span class="text-4xl">📮</span>
          <p class="mt-3 text-gray-600 font-bold">아직 시작된 책 꼬리가 없습니다.</p>
          <p class="text-xs text-gray-400 mt-1">도서관에서 첫 책을 등록하고 친구들에게 꼬리를 잇게 해보세요!</p>
          <button onclick="Modal.openWriteModal('relay')" class="mt-4 px-4 py-2 bg-emerald-500 text-white rounded-xl text-sm font-bold village-btn">
            🔗 첫 번째 릴레이 책 등록하기
          </button>
        </div>
      `;
      return;
    }

    // 카드 체인 형태로 시각화
    let html = `
      <div class="space-y-6">
        <div class="flex justify-between items-center bg-white p-4 rounded-2xl border border-gray-200">
          <div>
            <h3 class="font-bold text-gray-900 text-base">우리 반 독서 꼬리 지도</h3>
            <p class="text-xs text-gray-500">책과 책 사이의 생각과 키워드가 선으로 이어집니다.</p>
          </div>
          <button onclick="Modal.openWriteModal('relay')" class="px-3.5 py-2 bg-emerald-500 text-white rounded-xl text-xs font-bold village-btn flex items-center gap-1">
            ➕ 새 릴레이 책 잇기
          </button>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    `;

    this.nodes.forEach(node => {
      // 이 노드로 연결된 링크들 찾기
      const incomingLinks = this.links.filter(l => l.toRecordId === node.recordId);
      
      html += `
        <div class="village-card p-5 relative border-2 border-emerald-100 flex flex-col justify-between">
          <div>
            ${incomingLinks.length > 0 ? `
              <div class="mb-3 bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 text-xs text-emerald-900">
                <span class="font-bold text-emerald-700">🔗 꼬리 키워드: [${incomingLinks[0].reasonKeyword}]</span>
                <p class="text-[11px] text-gray-600 mt-1 italic">"${incomingLinks[0].reasonText}"</p>
              </div>
            ` : `
              <div class="mb-3 bg-amber-50 border border-amber-200 rounded-xl p-2 text-xs font-bold text-amber-800 text-center">
                🌟 릴레이의 첫 시작 도서
              </div>
            `}

            <div class="flex gap-3 mb-3">
              <img src="${node.book?.coverUrl || 'https://via.placeholder.com/100x140'}" class="w-16 h-24 object-cover rounded-lg shadow-sm" />
              <div>
                <span class="text-[10px] font-bold text-gray-400">등록: ${node.userName}</span>
                <h4 class="font-bold text-sm text-gray-900 line-clamp-2">${node.book?.title}</h4>
                <p class="text-xs text-gray-500 truncate">${node.book?.author}</p>
              </div>
            </div>

            <p class="text-xs text-gray-700 bg-gray-50 p-2.5 rounded-lg mb-3 leading-relaxed">
              ${node.content}
            </p>
          </div>

          <button 
            onclick="Relay.startNextChain('${node.recordId}', '${node.book?.title.replace(/'/g, "\\'")}')"
            class="w-full py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-xs font-bold border border-emerald-200 transition-all flex items-center justify-center gap-1.5"
          >
            ➡️ 이 책에서 다음 꼬리 잇기
          </button>
        </div>
      `;
    });

    html += `</div></div>`;
    container.innerHTML = html;
  },

  startNextChain(parentRecordId, parentTitle) {
    if (!Auth.isLoggedIn()) {
      alert("로그인 후 이용할 수 있습니다.");
      Modal.openLogin();
      return;
    }
    Modal.openWriteModal("relay", { relayFromRecordId: parentRecordId, parentTitle: parentTitle });
  }
};
