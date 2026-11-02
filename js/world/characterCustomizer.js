/**
 * 캐릭터 꾸미기 모달 컨트롤러 (characterCustomizer.js)
 * - 헤어 스타일 (베레모, 바가지, 숏컷, 양갈래, 마법사 모자)
 * - 헤어 색상 팔레트
 * - 의상 색상 팔레트
 * - 피부톤 및 액세서리 선택
 * - Player.applyCustomization 연동
 */

import { Player } from "./player.js";

export const CharacterCustomizer = {
  isOpen: false,

  HAIR_STYLES: [
    { id: "beret", name: "베레모 헤어", icon: "🧢" },
    { id: "bowl", name: "바가지 머리", icon: "👦" },
    { id: "short", name: "단정한 숏컷", icon: "🧑" },
    { id: "twintail", name: "양갈래 머리", icon: "👧" },
    { id: "wizard", name: "마법사 고깔모", icon: "🧙" }
  ],

  HAIR_COLORS: [
    { name: "에스프레소", hex: 0x5c3a21 },
    { name: "골든 허니", hex: 0xf59e0b },
    { name: "칠흑 블랙", hex: 0x1e293b },
    { name: "베이비 핑크", hex: 0xf472b6 },
    { name: "민트 그린", hex: 0x10b981 }
  ],

  CLOTHES_COLORS: [
    { name: "클래식 블루", hex: 0x2563eb },
    { name: "에메랄드 그린", hex: 0x059669 },
    { name: "체리 레드", hex: 0xdc2626 },
    { name: "해바라기 옐로우", hex: 0xeab308 },
    { name: "라벤더 퍼플", hex: 0x8b5cf6 },
    { name: "파스텔 핑크", hex: 0xec4899 }
  ],

  SKIN_TONES: [
    { name: "자연 살구", hex: 0xffdfba },
    { name: "뽀얀 우유", hex: 0xfff0db },
    { name: "건강한 탠", hex: 0xe0ac69 }
  ],

  ACCESSORIES: [
    { id: "blush", name: "복숭아 볼터치", icon: "🌸" },
    { id: "glasses", name: "동글이 안경", icon: "👓" },
    { id: "backpack", name: "여행자 책가방", icon: "🎒" },
    { id: "none", name: "장식 없음", icon: "✨" }
  ],

  init() {
    this.createModalDom();
  },

  createModalDom() {
    let el = document.getElementById("modal-character-customizer");
    if (!el) {
      el = document.createElement("div");
      el.id = "modal-character-customizer";
      el.className = "fixed inset-0 z-50 hidden items-center justify-center p-4 bg-black/40 backdrop-blur-sm";
      el.innerHTML = `
        <div class="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border-4 border-pink-400 p-6 space-y-5 animate-in fade-in zoom-in-95">
          <div class="flex items-center justify-between pb-3 border-b border-gray-100">
            <h3 class="font-black text-lg text-gray-900 flex items-center gap-2">
              <span class="text-2xl">🎨</span> 아바타 옷장 & 캐릭터 꾸미기
            </h3>
            <button id="btn-close-customizer" class="text-gray-400 hover:text-gray-600 text-lg">✕</button>
          </div>

          <div class="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
            <!-- 1. 헤어 스타일 -->
            <div>
              <label class="block text-xs font-bold text-gray-700 mb-2">1. 헤어 & 모자 스타일</label>
              <div id="cust-hair-styles" class="grid grid-cols-3 sm:grid-cols-5 gap-2"></div>
            </div>

            <!-- 2. 헤어 색상 -->
            <div>
              <label class="block text-xs font-bold text-gray-700 mb-2">2. 머리 / 모자 색상</label>
              <div id="cust-hair-colors" class="flex flex-wrap gap-2.5"></div>
            </div>

            <!-- 3. 옷 색상 -->
            <div>
              <label class="block text-xs font-bold text-gray-700 mb-2">3. 옷 의상 색상</label>
              <div id="cust-clothes-colors" class="flex flex-wrap gap-2.5"></div>
            </div>

            <!-- 4. 피부톤 & 액세서리 -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-bold text-gray-700 mb-2">4. 피부 톤</label>
                <div id="cust-skin-tones" class="flex gap-2"></div>
              </div>
              <div>
                <label class="block text-xs font-bold text-gray-700 mb-2">5. 얼굴 & 등 장식</label>
                <div id="cust-accessories" class="grid grid-cols-2 gap-2"></div>
              </div>
            </div>
          </div>

          <button id="btn-save-customizer" class="w-full py-3 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white rounded-2xl font-black text-sm shadow-lg transition active:scale-95">
            ✨ 변경 사항 저장하고 마을로 가기
          </button>
        </div>
      `;
      document.body.appendChild(el);

      el.querySelector("#btn-close-customizer").addEventListener("click", () => this.closeModal());
      el.querySelector("#btn-save-customizer").addEventListener("click", () => {
        this.closeModal();
        alert("🎉 아바타가 멋지게 꾸며졌습니다!");
      });
    }
  },

  openModal() {
    this.createModalDom();
    this.renderOptions();
    const el = document.getElementById("modal-character-customizer");
    if (el) {
      el.classList.remove("hidden");
      el.classList.add("flex");
    }
    this.isOpen = true;
  },

  closeModal() {
    const el = document.getElementById("modal-character-customizer");
    if (el) {
      el.classList.add("hidden");
      el.classList.remove("flex");
    }
    this.isOpen = false;
  },

  renderOptions() {
    const current = Player.custom;

    // 1. 헤어 스타일
    const hairContainer = document.getElementById("cust-hair-styles");
    if (hairContainer) {
      hairContainer.innerHTML = this.HAIR_STYLES.map(h => `
        <button onclick="CharacterCustomizer.select('hairStyle', '${h.id}')" class="p-2.5 rounded-2xl border-2 text-center transition ${current.hairStyle === h.id ? 'border-pink-500 bg-pink-50 shadow' : 'border-gray-200 hover:border-gray-300'}">
          <span class="text-2xl block mb-1">${h.icon}</span>
          <span class="text-[11px] font-bold text-gray-800 leading-none">${h.name}</span>
        </button>
      `).join("");
    }

    // 2. 헤어 색상
    const hairColorContainer = document.getElementById("cust-hair-colors");
    if (hairColorContainer) {
      hairColorContainer.innerHTML = this.HAIR_COLORS.map(c => `
        <button onclick="CharacterCustomizer.select('hairColor', ${c.hex})" class="w-8 h-8 rounded-full border-2 transition shadow-sm ${current.hairColor === c.hex ? 'ring-4 ring-pink-400 scale-110 border-white' : 'border-transparent'}" style="background-color: #${c.hex.toString(16).padStart(6, '0')}" title="${c.name}"></button>
      `).join("");
    }

    // 3. 옷 색상
    const clothesContainer = document.getElementById("cust-clothes-colors");
    if (clothesContainer) {
      clothesContainer.innerHTML = this.CLOTHES_COLORS.map(c => `
        <button onclick="CharacterCustomizer.select('clothesColor', ${c.hex})" class="w-8 h-8 rounded-full border-2 transition shadow-sm ${current.clothesColor === c.hex ? 'ring-4 ring-pink-400 scale-110 border-white' : 'border-transparent'}" style="background-color: #${c.hex.toString(16).padStart(6, '0')}" title="${c.name}"></button>
      `).join("");
    }

    // 4. 피부톤
    const skinContainer = document.getElementById("cust-skin-tones");
    if (skinContainer) {
      skinContainer.innerHTML = this.SKIN_TONES.map(s => `
        <button onclick="CharacterCustomizer.select('skinColor', ${s.hex})" class="flex-1 py-2 px-2.5 rounded-xl border-2 text-xs font-bold transition flex items-center justify-center gap-1.5 ${current.skinColor === s.hex ? 'border-pink-500 bg-pink-50' : 'border-gray-200'}" style="background-color: #${s.hex.toString(16).padStart(6, '0')}40">
          <span class="w-3.5 h-3.5 rounded-full" style="background-color: #${s.hex.toString(16).padStart(6, '0')}"></span>
          <span>${s.name}</span>
        </button>
      `).join("");
    }

    // 5. 액세서리
    const accContainer = document.getElementById("cust-accessories");
    if (accContainer) {
      accContainer.innerHTML = this.ACCESSORIES.map(a => `
        <button onclick="CharacterCustomizer.select('accessory', '${a.id}')" class="p-2 rounded-xl border-2 text-left flex items-center gap-2 transition ${current.accessory === a.id ? 'border-pink-500 bg-pink-50' : 'border-gray-200'}">
          <span class="text-lg">${a.icon}</span>
          <span class="text-[11px] font-bold text-gray-700">${a.name}</span>
        </button>
      `).join("");
    }
  },

  select(key, value) {
    Player.applyCustomization({ [key]: value });
    this.renderOptions();
  }
};

window.CharacterCustomizer = CharacterCustomizer;
