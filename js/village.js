/**
 * 동물의 숲 (Animal Crossing) 스타일 2.5D 빌리지 그래픽 & 인터랙션 모듈
 */

const Village = {
  // 나무 성장 단계별 메타데이터
  TREE_STAGES: [
    { level: 1, name: "새싹 나무", desc: "작은 책의 씨앗이 싹텄어요!" },
    { level: 2, name: "어린 묘목", desc: "싱그러운 이파리가 돋아났어요." },
    { level: 3, name: "풍성한 사과나무", desc: "가지가 뻗어 시원한 그늘이 생겼어요." },
    { level: 4, name: "달콤한 열매나무", desc: "독서의 달콤한 사과가 주렁주렁 열렸어요!" },
    { level: 5, name: "전설의 황금 지혜나무", desc: "온 마을을 비추는 거대한 지혜의 나무!" }
  ],

  async init() {
    this.renderFieldDecorations();
    this.renderLandmarks();
    await this.refreshVillageStatus();
  },

  // 1. 잔디 위 꽃밭, 오솔길, 울타리, 벚꽃잎, 나비 등 필드 데코레이션 렌더링
  renderFieldDecorations() {
    const container = document.getElementById("village-map-container");
    if (!container) return;

    // 꽃밭 생성 (스크린샷 속 빨강/노랑/하양 국화 및 아네모네)
    const flowers = [
      // 상단 오두막 앞 화단
      { x: "18%", y: "22%", type: "red" }, { x: "21%", y: "23%", type: "yellow" }, { x: "24%", y: "21%", type: "white" },
      { x: "19%", y: "26%", type: "orange" }, { x: "23%", y: "27%", type: "red" },
      
      // 우측 상단 화단 & 울타리
      { x: "72%", y: "20%", type: "yellow" }, { x: "75%", y: "21%", type: "red" }, { x: "78%", y: "19%", type: "white" },
      { x: "82%", y: "22%", type: "yellow" }, { x: "85%", y: "20%", type: "red" },

      // 중앙 나무 주변 화단
      { x: "42%", y: "60%", type: "white" }, { x: "56%", y: "61%", type: "yellow" },
      { x: "39%", y: "63%", type: "red" }, { x: "59%", y: "62%", type: "orange" },

      // 하단 화단
      { x: "32%", y: "78%", type: "yellow" }, { x: "35%", y: "80%", type: "red" }, { x: "38%", y: "77%", type: "white" },
      { x: "62%", y: "82%", type: "white" }, { x: "65%", y: "80%", type: "yellow" }, { x: "68%", y: "83%", type: "red" }
    ];

    let decoHTML = `
      <!-- 하늘과 언덕 배경 -->
      <div class="ac-sky-backdrop">
        <div class="ac-hill-bg"></div>
      </div>

      <!-- 구름 -->
      <div class="ac-cloud cloud-puffy-1"></div>
      <div class="ac-cloud cloud-puffy-2"></div>

      <!-- 벚꽃잎 낙하 파티클 -->
      <div class="ac-petal petal-1"></div>
      <div class="ac-petal petal-2"></div>
      <div class="ac-petal petal-3"></div>

      <!-- 날아다니는 나비 -->
      <div class="ac-butterfly">
        <svg viewBox="0 0 32 32" class="w-full h-full drop-shadow-md">
          <ellipse cx="12" cy="12" rx="10" ry="7" fill="#ffeaa7" transform="rotate(-20 12 12)" />
          <ellipse cx="20" cy="12" rx="10" ry="7" fill="#ffeaa7" transform="rotate(20 20 12)" />
          <ellipse cx="12" cy="20" rx="7" ry="5" fill="#fdcb6e" />
          <ellipse cx="20" cy="20" rx="7" ry="5" fill="#fdcb6e" />
          <ellipse cx="16" cy="16" rx="2" ry="9" fill="#2d3436" />
        </svg>
      </div>

      <!-- 흙길 및 디딤돌 (Dirt Paths) -->
      <svg class="ac-path-layer" viewBox="0 0 1000 760" preserveAspectRatio="none">
        <!-- 메인 오솔길 -->
        <path d="M 500,160 Q 520,320 500,430 Q 480,560 500,720" stroke="#e8c792" stroke-width="64" fill="none" stroke-linecap="round" opacity="0.85" />
        <path d="M 500,160 Q 520,320 500,430 Q 480,560 500,720" stroke="#d4ab6e" stroke-width="68" fill="none" stroke-linecap="round" opacity="0.3" />
        <!-- 좌우 연결길 -->
        <path d="M 230,240 Q 360,260 500,280" stroke="#e8c792" stroke-width="48" fill="none" stroke-linecap="round" opacity="0.85" />
        <path d="M 770,260 Q 630,270 500,280" stroke="#e8c792" stroke-width="48" fill="none" stroke-linecap="round" opacity="0.85" />
        <path d="M 240,560 Q 360,540 500,520" stroke="#e8c792" stroke-width="48" fill="none" stroke-linecap="round" opacity="0.85" />
        <path d="M 760,570 Q 630,550 500,520" stroke="#e8c792" stroke-width="48" fill="none" stroke-linecap="round" opacity="0.85" />
      </svg>
    `;

    // 꽃 SVG 인라인 생성
    flowers.forEach(f => {
      const colorHex = f.type === "red" ? "#ff4757" : f.type === "yellow" ? "#ffa502" : f.type === "orange" ? "#ff7f50" : "#ffffff";
      const centerHex = f.type === "white" ? "#ffa502" : "#ffeaa7";
      decoHTML += `
        <div class="ac-flower" style="top: ${f.y}; left: ${f.x};">
          <svg viewBox="0 0 36 36" class="w-full h-full drop-shadow">
            <!-- 줄기 -->
            <path d="M 18,18 L 18,34" stroke="#2ed573" stroke-width="4" stroke-linecap="round" />
            <ellipse cx="14" cy="26" rx="5" ry="2.5" fill="#2ed573" transform="rotate(-30 14 26)" />
            <ellipse cx="22" cy="24" rx="5" ry="2.5" fill="#2ed573" transform="rotate(30 22 24)" />
            <!-- 꽃잎 8개 -->
            <circle cx="18" cy="8" r="5" fill="${colorHex}" />
            <circle cx="18" cy="24" r="5" fill="${colorHex}" />
            <circle cx="10" cy="16" r="5" fill="${colorHex}" />
            <circle cx="26" cy="16" r="5" fill="${colorHex}" />
            <circle cx="12" cy="10" r="5" fill="${colorHex}" />
            <circle cx="24" cy="10" r="5" fill="${colorHex}" />
            <circle cx="12" cy="22" r="5" fill="${colorHex}" />
            <circle cx="24" cy="22" r="5" fill="${colorHex}" />
            <!-- 꽃술 -->
            <circle cx="18" cy="16" r="6" fill="${centerHex}" stroke="#e17055" stroke-width="1" />
          </svg>
        </div>
      `;
    });

    // 귀여운 동물의 숲 주민 아바타 (책 들고 있는 모습)
    decoHTML += `
      <div class="ac-character-avatar">
        <svg viewBox="0 0 64 80" class="w-14 h-18">
          <!-- 그림자 -->
          <ellipse cx="32" cy="74" rx="18" ry="6" fill="rgba(10,50,10,0.35)" />
          <!-- 몸체 / 옷 (초록 스트라이프 티셔츠) -->
          <ellipse cx="32" cy="54" rx="14" ry="16" fill="#2ed573" />
          <path d="M 22,46 Q 32,50 42,46 L 40,62 Q 32,66 24,62 Z" fill="#26af5f" />
          <!-- 다리 & 신발 -->
          <rect x="24" y="66" width="6" height="6" rx="2" fill="#ffa502" />
          <rect x="34" y="66" width="6" height="6" rx="2" fill="#ffa502" />
          <!-- 팔 & 든 책 -->
          <ellipse cx="20" cy="54" rx="4" ry="7" fill="#ffeaa7" transform="rotate(25 20 54)" />
          <rect x="15" y="52" width="10" height="13" rx="2" fill="#ff4757" transform="rotate(-15 15 52)" />
          <!-- 머리 (둥글고 귀여운 은발) -->
          <circle cx="32" cy="30" r="18" fill="#dcdde1" />
          <circle cx="18" cy="18" r="7" fill="#dcdde1" />
          <circle cx="46" cy="18" r="7" fill="#dcdde1" />
          <!-- 얼굴 표정 (방긋 웃는 눈과 볼터치) -->
          <path d="M 24,30 Q 28,34 32,30" stroke="#2f3542" stroke-width="2.5" fill="none" stroke-linecap="round" />
          <path d="M 32,30 Q 36,34 40,30" stroke="#2f3542" stroke-width="2.5" fill="none" stroke-linecap="round" />
          <circle cx="22" cy="34" r="3.5" fill="#ff7675" opacity="0.7" />
          <circle cx="42" cy="34" r="3.5" fill="#ff7675" opacity="0.7" />
          <ellipse cx="32" cy="33" rx="2" ry="1.5" fill="#ff6b81" />
        </svg>
      </div>
    `;

    container.innerHTML = decoHTML;
  },

  // 2. 랜드마크 건물 & 인터랙티브 오브젝트 렌더링
  renderLandmarks() {
    const container = document.getElementById("village-map-container");
    if (!container) return;

    const landmarks = [
      // 1. 도서관 오두막 (Library) - 상단 좌측
      {
        id: "lm-library",
        name: "도서관",
        desc: "알라딘 도서 검색 & 독서록 작성",
        badge: "책 등록",
        top: "22%",
        left: "22%",
        action: () => Modal.openBookSearch('feed'),
        svg: this.getLibraryCottageSVG()
      },
      // 2. 한 줄 광장 (Bookgram Plaza) - 상단 우측 (야외 티 테이블 & 횃불)
      {
        id: "lm-plaza",
        name: "한 줄 광장",
        desc: "우리 반 감성 피드 & 별점 비교",
        badge: "Bookgram",
        top: "24%",
        left: "76%",
        action: () => App.switchTab("feed"),
        svg: this.getPlazaTeaTableSVG()
      },
      // 3. 중앙 독서나무 (Giant Reading Tree) - 정중앙
      {
        id: "lm-tree",
        name: "우리 반 독서 나무",
        desc: "완독으로 열매 맺는 거대 나무",
        top: "48%",
        left: "50%",
        isTree: true,
        action: () => this.showTreeInfoModal(),
        svg: this.getGiantTreeSVG(3, 6)
      },
      // 4. 릴레이 우체국 (Relay Post) - 하단 좌측
      {
        id: "lm-post",
        name: "릴레이 우체국",
        desc: "키워드로 이어지는 책 꼬리잇기",
        badge: "꼬리잇기",
        top: "70%",
        left: "22%",
        action: () => App.switchTab("relay"),
        svg: this.getPostOfficeSVG()
      },
      // 5. 책 속 방송국 (Broadcasting Hut) - 하단 우측
      {
        id: "lm-station",
        name: "책 속 방송국",
        desc: "가상 인물 인터뷰 & 핫비평",
        badge: "기자회견",
        top: "72%",
        left: "78%",
        action: () => App.switchTab("interview"),
        svg: this.getBroadcastingHutSVG()
      },
      // 6. 비밀의 숲 (Blind Mystery Forest) - 최상단 중앙
      {
        id: "lm-blind",
        name: "비밀의 숲",
        desc: "표지 숨긴 퀴즈 & 댓글 해금",
        badge: "비밀도서",
        top: "14%",
        left: "50%",
        action: () => App.switchTab("blind"),
        svg: this.getBlindForestSVG()
      },
      // 7. 나의 서재 (My Home) - 최하단 중앙
      {
        id: "lm-myroom",
        name: "나의 서재",
        desc: "내 오두막 & 독서 탐험 뱃지",
        badge: "내방",
        top: "85%",
        left: "50%",
        action: () => App.switchTab("myroom"),
        svg: this.getMyHouseSVG()
      }
    ];

    landmarks.forEach(lm => {
      const el = document.createElement("div");
      el.id = lm.id;
      el.className = `ac-landmark ${lm.isTree ? 'ac-tree-centerpiece' : ''}`;
      el.style.top = lm.top;
      el.style.left = lm.left;

      el.innerHTML = `
        <div class="ac-object-shadow"></div>
        <div class="ac-swaying relative flex flex-col items-center">
          ${lm.svg}
        </div>
        <div class="ac-signboard">
          ${lm.badge ? `<span class="ac-signboard-badge">${lm.badge}</span>` : ''}
          <div class="ac-signboard-title">
            <span>${lm.isTree ? '🌳' : ''}</span>
            <span>${lm.name}</span>
          </div>
          <div class="ac-signboard-sub">${lm.desc}</div>
        </div>
      `;

      el.addEventListener("click", (e) => {
        e.stopPropagation();
        lm.action();
      });

      container.appendChild(el);
    });
  },

  // -------------------------------------------------------------
  // 동물의 숲 스타일 정교한 입체 SVG 빌더 함수들
  // -------------------------------------------------------------

  // 1. 도서관 오두막 (붉은 벽돌 지붕, 나무 벽, 굴뚝 연기, 따뜻한 창문)
  getLibraryCottageSVG() {
    return `
      <svg viewBox="0 0 140 130" class="w-32 h-28 drop-shadow-xl">
        <!-- 굴뚝 및 몽실몽실 연기 -->
        <rect x="92" y="16" width="16" height="28" rx="3" fill="#b33939" stroke="#7e1d1d" stroke-width="2" />
        <circle cx="100" cy="8" r="6" fill="white" opacity="0.8" />
        <circle cx="106" cy="1" r="8" fill="white" opacity="0.6" />
        <!-- 오두막 몸체 (원목 벽) -->
        <rect x="25" y="48" width="90" height="65" rx="10" fill="#f8eed9" stroke="#d4a359" stroke-width="3" />
        <line x1="25" y1="68" x2="115" y2="68" stroke="#eed8b2" stroke-width="2" />
        <line x1="25" y1="88" x2="115" y2="88" stroke="#eed8b2" stroke-width="2" />
        <!-- 지붕 (동물의 숲 둥근 붉은 삼각 지붕) -->
        <path d="M 10,54 Q 70,16 130,54 Q 70,36 10,54 Z" fill="#eb4d4b" stroke="#b33939" stroke-width="3" />
        <path d="M 18,52 Q 70,22 122,52" fill="none" stroke="#ff7979" stroke-width="4" stroke-linecap="round" />
        <!-- 빨간 나무문 & 계단 -->
        <rect x="52" y="72" width="26" height="41" rx="5" fill="#c0392b" stroke="#7e1d1d" stroke-width="2" />
        <circle cx="72" cy="94" r="2.5" fill="#f1c40f" />
        <!-- 따뜻한 노란 불빛 창문 -->
        <rect x="88" y="65" width="20" height="20" rx="4" fill="#f9ca24" stroke="#d4a359" stroke-width="2" />
        <line x1="98" y1="65" x2="98" y2="85" stroke="#d4a359" stroke-width="2" />
        <line x1="88" y1="75" x2="108" y2="75" stroke="#d4a359" stroke-width="2" />
        <!-- 작은 책 표지 간판 -->
        <rect x="30" y="70" width="16" height="18" rx="2" fill="#3498db" stroke="#2980b9" stroke-width="1.5" />
        <path d="M 33,74 L 43,74 M 33,78 L 43,78" stroke="white" stroke-width="1.5" />
      </svg>
    `;
  },

  // 2. 한 줄 광장 (스크린샷 속 하얀 철제 티 테이블 & 의자 & 화분 & 횃불)
  getPlazaTeaTableSVG() {
    return `
      <svg viewBox="0 0 140 120" class="w-32 h-28 drop-shadow-xl">
        <!-- 횃불 (우측 횃불 봉 & 불꽃 파티클) -->
        <rect x="110" y="45" width="7" height="55" rx="3" fill="#795548" stroke="#4e342e" stroke-width="1.5" />
        <ellipse cx="113.5" cy="42" rx="7" ry="5" fill="#d7ccc8" />
        <!-- 타오르는 불꽃 -->
        <path d="M 113.5,22 Q 122,34 113.5,42 Q 105,34 113.5,22 Z" fill="#ff4757" />
        <path d="M 113.5,28 Q 118,36 113.5,42 Q 109,36 113.5,28 Z" fill="#ffa502" />
        <!-- 하얀 앤틱 의자 (좌) -->
        <ellipse cx="28" cy="78" rx="14" ry="7" fill="#ffffff" stroke="#ced6e0" stroke-width="2" />
        <path d="M 28,52 Q 16,56 16,74 Q 28,70 40,74 Q 40,56 28,52 Z" fill="none" stroke="#ced6e0" stroke-width="2.5" />
        <line x1="20" y1="82" x2="18" y2="104" stroke="#ced6e0" stroke-width="2.5" stroke-linecap="round" />
        <line x1="36" y1="82" x2="38" y2="104" stroke="#ced6e0" stroke-width="2.5" stroke-linecap="round" />
        <!-- 하얀 앤틱 원형 티 테이블 (중앙) -->
        <ellipse cx="68" cy="74" rx="26" ry="14" fill="#ffffff" stroke="#ced6e0" stroke-width="3" />
        <ellipse cx="68" cy="74" rx="20" ry="9" fill="none" stroke="#dfe4ea" stroke-width="1.5" stroke-dasharray="3 3" />
        <!-- 테이블 다리 -->
        <path d="M 68,88 L 68,106 M 52,106 L 84,106" stroke="#ced6e0" stroke-width="3" stroke-linecap="round" />
        <!-- 테이블 위 노란 꽃병 -->
        <rect x="65" y="58" width="6" height="10" rx="3" fill="#ffffff" stroke="#ced6e0" stroke-width="1.5" />
        <circle cx="68" cy="54" r="5" fill="#ffa502" />
        <circle cx="68" cy="54" r="2" fill="#ffffff" />
        <!-- 하얀 앤틱 의자 (우) -->
        <ellipse cx="98" cy="80" rx="12" ry="6" fill="#ffffff" stroke="#ced6e0" stroke-width="2" />
        <line x1="94" y1="84" x2="92" y2="104" stroke="#ced6e0" stroke-width="2.5" stroke-linecap="round" />
        <line x1="102" y1="84" x2="104" y2="104" stroke="#ced6e0" stroke-width="2.5" stroke-linecap="round" />
      </svg>
    `;
  },

  // 3. 동물의 숲 중앙 거대 사과나무 (단계별 잎 볼륨 + 탐스러운 사과 열매 + 그루터기)
  getGiantTreeSVG(stage = 3, fruitsCount = 6) {
    return `
      <div class="ac-tree-wrapper">
        <svg viewBox="0 0 180 200" class="w-44 h-48 ac-tree-crown">
          <!-- 나무 기둥 (따뜻하고 볼륨감 있는 나무 밑동 & 나이테 옹이) -->
          <path d="M 72,110 Q 64,150 56,188 Q 90,195 124,188 Q 116,150 108,110 Z" fill="#96603a" stroke="#683d1c" stroke-width="3.5" />
          <path d="M 76,140 Q 90,150 90,165 Q 90,180 76,186" fill="none" stroke="#754823" stroke-width="3" stroke-linecap="round" />
          <ellipse cx="98" cy="148" rx="5" ry="8" fill="#683d1c" />
          <!-- 풍성한 3단 둥근 캐노피 (동물의 숲 시그니처 젤리 형태) -->
          <!-- 하단 잎 볼륨 -->
          <circle cx="52" cy="98" r="40" fill="#48a825" stroke="#327c16" stroke-width="3.5" />
          <circle cx="128" cy="98" r="40" fill="#48a825" stroke="#327c16" stroke-width="3.5" />
          <circle cx="90" cy="110" r="44" fill="#52b82c" stroke="#327c16" stroke-width="3.5" />
          <!-- 상단 잎 볼륨 (밝은 하이라이트) -->
          <circle cx="64" cy="62" r="38" fill="#5ec834" stroke="#327c16" stroke-width="3.5" />
          <circle cx="116" cy="62" r="38" fill="#5ec834" stroke="#327c16" stroke-width="3.5" />
          <circle cx="90" cy="46" r="42" fill="#72da46" stroke="#327c16" stroke-width="3.5" />
          <circle cx="86" cy="38" r="32" fill="#88ea5c" opacity="0.6" />
          <!-- 반짝이는 탐스러운 사과 열매들 -->
          <g id="tree-apples-group">
            <!-- 사과 1 -->
            <circle cx="56" cy="68" r="9" fill="#ff4757" stroke="#b33939" stroke-width="1.5" />
            <circle cx="54" cy="65" r="2.5" fill="#ff9ff3" />
            <path d="M 56,59 Q 58,55 62,56" stroke="#2ed573" stroke-width="2" fill="none" />
            <!-- 사과 2 -->
            <circle cx="124" cy="66" r="9" fill="#ff4757" stroke="#b33939" stroke-width="1.5" />
            <circle cx="122" cy="63" r="2.5" fill="#ff9ff3" />
            <path d="M 124,57 Q 126,53 130,54" stroke="#2ed573" stroke-width="2" fill="none" />
            <!-- 사과 3 -->
            <circle cx="90" cy="88" r="9.5" fill="#ff4757" stroke="#b33939" stroke-width="1.5" />
            <circle cx="87" cy="85" r="2.5" fill="#ff9ff3" />
            <path d="M 90,78 Q 92,74 96,75" stroke="#2ed573" stroke-width="2" fill="none" />
            <!-- 사과 4 -->
            <circle cx="120" cy="115" r="8.5" fill="#ff4757" stroke="#b33939" stroke-width="1.5" />
            <!-- 사과 5 -->
            <circle cx="58" cy="116" r="8.5" fill="#ff4757" stroke="#b33939" stroke-width="1.5" />
          </g>
          <!-- 옆의 귀여운 통나무 그루터기 (Stump) -->
          <path d="M 136,165 L 132,188 Q 148,193 164,188 L 160,165 Z" fill="#96603a" stroke="#683d1c" stroke-width="2" />
          <ellipse cx="148" cy="165" rx="14" ry="6" fill="#e8c792" stroke="#683d1c" stroke-width="2" />
          <ellipse cx="148" cy="165" rx="8" ry="3" fill="none" stroke="#96603a" stroke-width="1.5" />
        </svg>
      </div>
    `;
  },

  // 4. 릴레이 우체국 (노란 우편함, 비둘기 깃발, 편지 봉투)
  getPostOfficeSVG() {
    return `
      <svg viewBox="0 0 130 120" class="w-30 h-26 drop-shadow-xl">
        <!-- 우체국 오두막 (민트/하늘색 지붕) -->
        <rect x="25" y="45" width="80" height="60" rx="8" fill="#f8eed9" stroke="#d4a359" stroke-width="3" />
        <path d="M 12,50 Q 65,16 118,50 Q 65,34 12,50 Z" fill="#00cec9" stroke="#00a8a8" stroke-width="3" />
        <!-- 문 & 편지 투입구 -->
        <rect x="52" y="66" width="26" height="39" rx="4" fill="#0984e3" stroke="#06528d" stroke-width="2" />
        <circle cx="70" cy="85" r="2.5" fill="#ffeaa7" />
        <!-- 우측 빨간 우체통 (Animal Crossing Mailbox) -->
        <rect x="96" y="65" width="18" height="32" rx="7" fill="#ff4757" stroke="#b33939" stroke-width="2" />
        <rect x="99" y="72" width="12" height="4" rx="1" fill="#2f3542" />
        <!-- 날아가는 편지 봉투 아이콘 -->
        <rect x="34" y="62" width="14" height="10" rx="2" fill="#ffffff" stroke="#d4a359" stroke-width="1.5" />
        <path d="M 34,62 L 41,68 L 48,62" fill="none" stroke="#d4a359" stroke-width="1.5" />
      </svg>
    `;
  },

  // 5. 책 속 방송국 (빈티지 라디오 부스, 마이크, 방송 안테나)
  getBroadcastingHutSVG() {
    return `
      <svg viewBox="0 0 130 120" class="w-30 h-26 drop-shadow-xl">
        <!-- 안테나 & 전파 -->
        <line x1="65" y1="20" x2="65" y2="40" stroke="#2f3542" stroke-width="3" stroke-linecap="round" />
        <circle cx="65" cy="18" r="4" fill="#ff4757" />
        <path d="M 55,14 Q 65,6 75,14" fill="none" stroke="#ffa502" stroke-width="2" stroke-linecap="round" />
        <!-- 오두막 몸체 (오렌지 지붕) -->
        <rect x="25" y="45" width="80" height="60" rx="8" fill="#f8eed9" stroke="#d4a359" stroke-width="3" />
        <path d="M 12,50 Q 65,18 118,50 Q 65,34 12,50 Z" fill="#e17055" stroke="#c0392b" stroke-width="3" />
        <!-- 스튜디오 창문 & 온에어(ON AIR) 간판 -->
        <rect x="42" y="32" width="46" height="14" rx="3" fill="#d63031" stroke="#ffffff" stroke-width="1.5" />
        <text x="65" y="43" fill="#ffffff" font-size="8" font-weight="900" text-anchor="middle" font-family="sans-serif">ON AIR</text>
        <!-- 빈티지 마이크 -->
        <rect x="45" y="65" width="40" height="30" rx="6" fill="#636e72" stroke="#2d3436" stroke-width="2" />
        <circle cx="56" cy="80" r="6" fill="#ffeaa7" />
        <line x1="70" y1="72" x2="80" y2="72" stroke="#b2bec3" stroke-width="2" />
        <line x1="70" y1="78" x2="80" y2="78" stroke="#b2bec3" stroke-width="2" />
        <line x1="70" y1="84" x2="80" y2="84" stroke="#b2bec3" stroke-width="2" />
      </svg>
    `;
  },

  // 6. 비밀의 숲 (신비로운 보랏빛 요정 나무 & 별빛 반딧불이)
  getBlindForestSVG() {
    return `
      <svg viewBox="0 0 140 130" class="w-32 h-28 drop-shadow-xl">
        <!-- 반딧불이 / 별빛 스파클 -->
        <circle cx="30" cy="30" r="3" fill="#f9ca24" opacity="0.9" />
        <circle cx="110" cy="25" r="3.5" fill="#f9ca24" opacity="0.9" />
        <circle cx="95" cy="50" r="2.5" fill="#ffffff" />
        <!-- 신비로운 보랏빛 둥근 나무 -->
        <path d="M 60,75 Q 55,100 50,118 Q 70,123 90,118 Q 85,100 80,75 Z" fill="#6c5ce7" stroke="#4834d4" stroke-width="3" />
        <circle cx="45" cy="58" r="28" fill="#8c7ae6" stroke="#4834d4" stroke-width="3" />
        <circle cx="95" cy="58" r="28" fill="#8c7ae6" stroke="#4834d4" stroke-width="3" />
        <circle cx="70" cy="40" r="32" fill="#9c88ff" stroke="#4834d4" stroke-width="3" />
        <!-- 신비로운 물음표 북 마크 -->
        <rect x="60" y="55" width="20" height="26" rx="4" fill="#2d3436" stroke="#f1c40f" stroke-width="2" />
        <text x="70" y="74" fill="#f1c40f" font-size="16" font-weight="900" text-anchor="middle" font-family="sans-serif">?</text>
      </svg>
    `;
  },

  // 7. 나의 서재 (플레이어의 아늑한 오두막과 울타리)
  getMyHouseSVG() {
    return `
      <svg viewBox="0 0 130 110" class="w-30 h-24 drop-shadow-xl">
        <!-- 오두막 본체 (그린 지붕) -->
        <rect x="25" y="42" width="80" height="55" rx="8" fill="#f8eed9" stroke="#d4a359" stroke-width="3" />
        <path d="M 12,46 Q 65,14 118,46 Q 65,30 12,46 Z" fill="#6ab04c" stroke="#417c27" stroke-width="3" />
        <!-- 아늑한 노란 문과 화분 -->
        <rect x="52" y="60" width="26" height="37" rx="4" fill="#f0932b" stroke="#ba6004" stroke-width="2" />
        <circle cx="71" cy="78" r="2.5" fill="#f9ca24" />
        <!-- 창문 -->
        <rect x="86" y="56" width="14" height="14" rx="3" fill="#f9ca24" stroke="#d4a359" stroke-width="1.5" />
        <!-- 화단 꽃 -->
        <circle cx="34" cy="88" r="4" fill="#ff4757" />
        <circle cx="42" cy="88" r="4" fill="#ffa502" />
      </svg>
    `;
  },

  async refreshVillageStatus() {
    const res = await API.request("getVillageStatus", { classId: "1반" });
    if (res.success && res.classTree) {
      const tree = res.classTree;
      const stageIdx = Math.min(Math.max((tree.treeStage || 1) - 1, 0), this.TREE_STAGES.length - 1);
      const stageInfo = this.TREE_STAGES[stageIdx];

      // 뉴스 티커 업데이트
      this.renderNewsTicker(res.recentNews || []);
    }
  },

  renderNewsTicker(newsList) {
    const tickerContainer = document.getElementById("village-news-ticker");
    if (!tickerContainer) return;

    if (newsList.length === 0) {
      tickerContainer.innerHTML = `<span class="text-xs font-bold text-emerald-800">✨ 평화로운 책마을에 따스한 햇살이 비치고 있습니다. 첫 번째 독서 이야기를 들려주세요!</span>`;
      return;
    }

    const latest = newsList[0];
    const typeNames = { feed: "한줄피드", blind: "비밀도서", relay: "책꼬리잇기", interview: "가상인터뷰" };
    tickerContainer.innerHTML = `
      <div class="flex items-center gap-2.5 text-xs font-bold text-emerald-950">
        <span class="badge-pill bg-amber-300 text-amber-950 font-black shadow-sm">📢 마을 속보</span>
        <span><strong>${latest.userName}</strong> 친구가 [${typeNames[latest.type] || '독서록'}]을 등록했습니다: <em>"${latest.title || latest.content.substring(0, 22)}..."</em></span>
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
