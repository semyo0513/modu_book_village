/**
 * 건물 상호작용 매니저 (interactions.js)
 * - 캐릭터와 건물 진입 지점 거리 감지 (반경 2.5m)
 * - HUD 말풍선 프롬프트 표출 및 키보드 'E' / 터치 인터랙션 연동
 * - 해당 기능의 HTML 오버레이 패널 호출
 */

export const Interactions = {
  currentActive: null,
  promptEl: null,
  onOpenPanel: null,

  init(onOpenPanelCallback) {
    this.onOpenPanel = onOpenPanelCallback;
    this.createPromptElement();

    // 키보드 E 키 또는 스페이스바로 입장
    window.addEventListener("keydown", (e) => {
      if (this.currentActive && (e.key.toLowerCase() === "e" || e.code === "Space")) {
        // 입력창에 타이핑 중일 때는 상호작용 무시
        if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
        e.preventDefault();
        this.triggerInteraction();
      }
    });
  },

  createPromptElement() {
    let el = document.getElementById("world-interaction-prompt");
    if (!el) {
      el = document.createElement("div");
      el.id = "world-interaction-prompt";
      el.className = "fixed bottom-24 left-1/2 -translate-x-1/2 z-40 hidden animate-bounce";
      el.innerHTML = `
        <button id="btn-world-interact" class="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-3 rounded-full shadow-2xl border-2 border-white transition transform active:scale-95">
          <span class="bg-amber-400 text-emerald-950 px-2 py-0.5 rounded text-sm font-extrabold shadow-inner">E</span>
          <span id="prompt-building-name">도서관 입장하기</span>
        </button>
      `;
      document.body.appendChild(el);

      const btn = el.querySelector("#btn-world-interact");
      btn.addEventListener("click", () => this.triggerInteraction());
    }
    this.promptEl = el;
  },

  update(playerPosition, interactables) {
    let nearest = null;
    let minDistance = Infinity;

    for (const item of interactables) {
      const dx = playerPosition.x - item.x;
      const dz = playerPosition.z - item.z;
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist < item.radius && dist < minDistance) {
        minDistance = dist;
        nearest = item;
      }
    }

    if (nearest) {
      if (this.currentActive !== nearest) {
        this.currentActive = nearest;
        this.showPrompt(nearest);
      }
    } else {
      if (this.currentActive) {
        this.currentActive = null;
        this.hidePrompt();
      }
    }
  },

  showPrompt(item) {
    if (!this.promptEl) return;
    const nameSpan = this.promptEl.querySelector("#prompt-building-name");
    if (nameSpan) {
      nameSpan.textContent = `[${item.name}] ${item.desc}`;
    }
    this.promptEl.classList.remove("hidden");
  },

  hidePrompt() {
    if (this.promptEl) {
      this.promptEl.classList.add("hidden");
    }
  },

  triggerInteraction() {
    if (!this.currentActive) return;
    const buildingId = this.currentActive.id;
    this.hidePrompt();

    if (typeof this.onOpenPanel === "function") {
      this.onOpenPanel(buildingId);
    }
  }
};
