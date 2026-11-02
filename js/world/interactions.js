/**
 * 건물 상호작용 매니저 (interactions.js)
 */

(function(global) {
  const Interactions = {
    currentActive: null,
    promptEl: null,
    onOpenPanel: null,

    init(onOpenPanelCallback) {
      this.onOpenPanel = onOpenPanelCallback;
      if (global.BuildingModal) global.BuildingModal.init();
      this.createPromptElement();

      window.addEventListener("keydown", (e) => {
        if (global.BuildingModal && global.BuildingModal.isOpen) return;

        if (this.currentActive && (e.key.toLowerCase() === "e" || e.code === "Space" || e.key === "Enter")) {
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
        el.className = "fixed bottom-28 left-1/2 -translate-x-1/2 z-40 hidden transition-all duration-200 transform scale-100 hover:scale-105";
        el.innerHTML = `
          <button id="btn-world-interact" class="flex items-center gap-3 bg-gradient-to-r from-emerald-600 via-teal-600 to-green-600 text-white font-extrabold px-6 py-3.5 rounded-full shadow-2xl border-2 border-white/80 active:scale-95 cursor-pointer ring-4 ring-emerald-300/50">
            <span class="flex items-center justify-center w-8 h-8 rounded-full bg-amber-400 text-emerald-950 text-sm font-black shadow">E</span>
            <div class="text-left">
              <span id="prompt-building-name" class="block text-sm sm:text-base leading-tight font-black drop-shadow">도서관 입장하기</span>
              <span id="prompt-building-desc" class="block text-[11px] text-emerald-100 font-medium leading-none mt-0.5">클릭하거나 E키를 눌러 입장하세요</span>
            </div>
            <span class="text-xl">🚪</span>
          </button>
        `;
        document.body.appendChild(el);

        const btn = el.querySelector("#btn-world-interact");
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          this.triggerInteraction();
        });
      }
      this.promptEl = el;
    },

    update(playerPosition, interactables) {
      if (global.BuildingModal && global.BuildingModal.isOpen) {
        this.hidePrompt();
        return;
      }

      let nearest = null;
      let minDistance = Infinity;

      for (let i = 0; i < interactables.length; i++) {
        const item = interactables[i];
        const dx = playerPosition.x - item.x;
        const dz = playerPosition.z - item.z;
        const dist = Math.sqrt(dx * dx + dz * dz);

        if (dist < (item.radius || 3.5) && dist < minDistance) {
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
      const descSpan = this.promptEl.querySelector("#prompt-building-desc");
      if (nameSpan) {
        nameSpan.textContent = `[${item.name}] 입장하기`;
      }
      if (descSpan) {
        descSpan.textContent = item.desc || "클릭하거나 E 키를 누르세요";
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

      if (global.BuildingModal) {
        global.BuildingModal.open(buildingId);
      }

      if (typeof this.onOpenPanel === "function") {
        this.onOpenPanel(buildingId);
      }
    }
  };

  global.Interactions = Interactions;
})(typeof window !== "undefined" ? window : globalThis);
