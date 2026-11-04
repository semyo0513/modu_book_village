/**
 * 개인 서재 & 독서 나무 가꾸기 (My Room) 모듈
 */
const MyRoom = {
  // 뱃지 메타데이터
  BADGE_DEFINITIONS: {
    "책마을입주민": { icon: "🏡", name: "책마을 입주민", desc: "책마을에 첫 발을 내딛은 주민" },
    "소설탐험가": { icon: "📖", name: "소설 탐험가", desc: "이야기의 바다를 3권 이상 항해함" },
    "과학탐구자": { icon: "🔬", name: "과학 탐구자", desc: "호기심을 품고 과학도서를 3권 이상 탐독" },
    "릴레이마스터": { icon: "🔗", name: "릴레이 마스터", desc: "친구들과 책 꼬리를 3회 이상 잇기 성공" },
    "마을촌장": { icon: "👑", name: "마을 촌장", desc: "책마을을 따뜻하게 이끄는 선생님" },
    "열정다독왕": { icon: "🏆", name: "열정 다독왕", desc: "누적 10권 이상 완독 달성" }
  },

  async init() {
    if (!Auth.isLoggedIn()) {
      const container = document.getElementById("myroom-container");
      if (container) {
        container.innerHTML = `
          <div class="village-card p-12 text-center col-span-full">
            <span class="text-4xl">🔐</span>
            <p class="mt-3 text-gray-700 font-bold">로그인이 필요한 공간입니다.</p>
            <p class="text-xs text-gray-400 mt-1">로그인하고 나만의 독서 나무와 서재를 확인하세요!</p>
            <button onclick="Modal.openLogin()" class="mt-4 px-5 py-2.5 bg-emerald-500 text-white rounded-xl text-xs font-bold village-btn">
              로그인하기
            </button>
          </div>
        `;
      }
      return;
    }

    await this.loadMyRoomData();
  },

  async loadMyRoomData() {
    const container = document.getElementById("myroom-container");
    if (container) container.innerHTML = `<div class="p-8 text-center text-gray-500">내 서재를 정리하는 중... 📚</div>`;

    const currentUser = Auth.getCurrentUser();
    const res = await API.request("getMyRoom", { userId: currentUser ? currentUser.userId : "s01" });
    if (res.success) {
      this.renderMyRoom(res);
    }
  },

  renderMyRoom(data) {
    const container = document.getElementById("myroom-container");
    if (!container) return;

    const user = data.user;
    const records = data.records || [];
    const genreStats = data.genreStats || {};
    const userBadges = user.badges || ["책마을입주민"];

    // 나무 레벨에 따른 이모지
    const treeEmoji = user.treeLevel >= 4 ? "🌳🍎" : user.treeLevel >= 2 ? "🌿" : "🌱";

    container.innerHTML = `
      <div class="space-y-6">
        <!-- 상단 내 프로필 & 개인 나무 카드 -->
        <div class="village-card p-6 bg-gradient-to-br from-emerald-50 to-teal-50 border-2 border-emerald-200">
          <div class="flex flex-col md:flex-row items-center justify-between gap-6">
            <div class="flex items-center gap-4">
              <div class="w-20 h-20 rounded-2xl bg-white shadow-md flex items-center justify-center text-4xl border-2 border-emerald-100">
                ${treeEmoji}
              </div>
              <div>
                <div class="flex items-center gap-2">
                  <h3 class="font-black text-xl text-gray-900">${user.name}의 서재</h3>
                  <span class="badge-pill bg-emerald-500 text-white text-xs">${user.role === 'teacher' ? '선생님' : `${user.number}번`}</span>
                </div>
                <p class="text-xs text-gray-500 mt-1">소속: ${user.classId || '1반'} • 내 독서나무 Lv.${user.treeLevel || 1}</p>
                
                <div class="flex items-center gap-4 mt-3 text-xs font-bold text-emerald-800">
                  <span>🍃 총 이파리: ${user.totalLeaves || 0}개</span>
                  <span>🍎 수확한 열매: ${user.totalFruits || 0}개</span>
                  <span>⭐ 찜한 책: ${data.wishCount || 0}권</span>
                </div>
              </div>
            </div>

            <button onclick="Modal.openBookSearch()" class="px-5 py-3 bg-emerald-600 text-white rounded-xl text-xs font-bold village-btn flex items-center gap-1.5 shadow-md">
              📖 새 책 읽고 기록 남기기
            </button>
          </div>
        </div>

        <!-- 뱃지 진열장 & 장르 분석 -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- 뱃지 진열장 -->
          <div class="village-card p-5">
            <h4 class="font-bold text-sm text-gray-900 mb-3 flex items-center gap-2">
              <span>🏅</span> 나의 독서 탐험 뱃지
            </h4>
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
              ${Object.entries(this.BADGE_DEFINITIONS).map(([badgeKey, meta]) => {
                const hasBadge = userBadges.includes(badgeKey);
                return `
                  <div class="p-3 rounded-xl text-center border transition-all ${hasBadge ? 'bg-amber-50/80 border-amber-200' : 'bg-gray-50 border-gray-100 opacity-40 grayscale'}">
                    <span class="text-2xl">${meta.icon}</span>
                    <div class="font-bold text-xs text-gray-800 mt-1">${meta.name}</div>
                    <div class="text-[10px] text-gray-400 mt-0.5">${hasBadge ? '획득완료' : '미획득'}</div>
                  </div>
                `;
              }).join("")}
            </div>
          </div>

          <!-- 장르별 완독 분포 -->
          <div class="village-card p-5">
            <h4 class="font-bold text-sm text-gray-900 mb-3 flex items-center gap-2">
              <span>📊</span> 읽은 책 분야 분포
            </h4>
            <div class="space-y-3">
              ${Object.keys(genreStats).length === 0 ? `
                <p class="text-xs text-gray-400 text-center py-6">아직 기록된 도서가 없습니다.</p>
              ` : Object.entries(genreStats).map(([genre, count]) => `
                <div>
                  <div class="flex justify-between text-xs font-bold text-gray-700 mb-1">
                    <span>${genre}</span>
                    <span>${count}권</span>
                  </div>
                  <div class="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                    <div class="bg-emerald-500 h-full rounded-full" style="width: ${Math.min(100, count * 25)}%"></div>
                  </div>
                </div>
              `).join("")}
            </div>
          </div>
        </div>

        <!-- 내가 쓴 독서 기록 타임라인 -->
        <div class="village-card p-6">
          <h4 class="font-bold text-sm text-gray-900 mb-4 flex items-center gap-2">
            <span>📚</span> 나의 독서 기록 보관함 (${records.length}권)
          </h4>

          ${records.length === 0 ? `
            <p class="text-xs text-gray-400 text-center py-8">아직 작성한 기록이 없습니다.</p>
          ` : `
            <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              ${records.map(r => `
                <div class="border border-gray-200 rounded-xl p-3 bg-gray-50/50 flex gap-3">
                  <img src="${r.book?.coverUrl}" class="w-14 h-20 object-cover rounded shadow-sm flex-shrink-0" />
                  <div class="overflow-hidden">
                    <span class="badge-pill bg-emerald-100 text-emerald-800 text-[10px] mb-1">${r.type}</span>
                    <h5 class="font-bold text-xs text-gray-900 truncate">${r.book?.title}</h5>
                    <p class="text-[11px] text-gray-500 line-clamp-2 mt-1">${r.content}</p>
                    <div class="text-[10px] text-gray-400 mt-1">${new Date(r.createdAt).toLocaleDateString()}</div>
                  </div>
                </div>
              `).join("")}
            </div>
          `}
        </div>
      </div>
    `;
  }
};
