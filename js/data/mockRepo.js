/**
 * Mock 데이터 저장소 (오프라인 / 데모 / 테스트용)
 * - Firestore 스키마와 1:1 호환되는 localStorage 기반 구현체
 */

export const MockRepo = {
  getStorageKey(col) {
    return `BV_MOCK_${col.toUpperCase()}`;
  },

  getData(col) {
    const raw = localStorage.getItem(this.getStorageKey(col));
    return raw ? JSON.parse(raw) : [];
  },

  setData(col, data) {
    localStorage.setItem(this.getStorageKey(col), JSON.stringify(data));
  },

  initDefaultData() {
    if (!localStorage.getItem(this.getStorageKey("classes"))) {
      this.setData("classes", [
        {
          id: "2026-3-1",
          year: 2026,
          grade: 3,
          classNo: 1,
          treeFruits: 14,
          treeLeaves: 45,
          blindThreshold: 3,
          active: true
        }
      ]);
    }

    if (!localStorage.getItem(this.getStorageKey("records"))) {
      this.setData("records", [
        {
          id: "rec_demo_1",
          classId: "2026-3-1",
          userId: "mock_student_1",
          userName: "김하늘",
          type: "feed",
          book: {
            isbn: "9788936434267",
            title: "아몬드",
            author: "손원평",
            publisher: "창비",
            coverUrl: "https://image.aladin.co.kr/product/16839/4/cover500/8936434268_2.jpg"
          },
          content: "윤재의 감정 없는 눈으로 바라본 세상이 가슴을 울렸어요. 공감이란 무엇일까 깊이 고민하게 됩니다.",
          emotionTag: "🌟 깊은감동",
          completed: true,
          commentCount: 2,
          reactionCounts: { heart: 5, clap: 3 },
          createdAt: new Date().toISOString()
        },
        {
          id: "rec_demo_2",
          classId: "2026-3-1",
          userId: "mock_student_2",
          userName: "이바다",
          type: "blind",
          content: "어느 날 갑자기 찾아온 비밀 친구와의 잊지 못할 여름방학 이야기!",
          emotionTag: "💡 깨달음",
          completed: true,
          commentCount: 1,
          reactionCounts: { sparkle: 4 },
          blind: {
            enabled: true,
            revealed: false,
            threshold: 3,
            question: "이 책의 주인공이 마주한 가장 큰 용기는 무엇일까요?",
            quote: "두려움은 그림자와 같아서, 빛을 향해 걸어가면 언제나 우리 뒤에 남겨진다."
          },
          createdAt: new Date(Date.now() - 3600000).toISOString()
        }
      ]);
    }

    // 블라인드 북 비밀 정보
    if (!localStorage.getItem("BV_MOCK_BLIND_SECRETS")) {
      const secrets = {
        "rec_demo_2": {
          isbn: "9788949114002",
          title: "마당을 나온 암탉",
          author: "황선미",
          publisher: "사계절",
          coverUrl: "https://image.aladin.co.kr/product/67/60/cover500/8949114008_1.jpg"
        }
      };
      localStorage.setItem("BV_MOCK_BLIND_SECRETS", JSON.stringify(secrets));
    }
  },

  async getRecords({ classId, type, limit = 20 }) {
    this.initDefaultData();
    let records = this.getData("records");
    if (classId) records = records.filter(r => r.classId === classId);
    if (type) records = records.filter(r => r.type === type);
    records.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return records.slice(0, limit);
  },

  async addRecord(recordData) {
    this.initDefaultData();
    const records = this.getData("records");
    const id = "rec_" + Math.random().toString(36).substring(2, 9);
    const newRecord = {
      ...recordData,
      id,
      commentCount: 0,
      reactionCounts: {},
      createdAt: new Date().toISOString()
    };

    // 블라인드 북 분리 저장
    if (recordData.type === "blind" && recordData.book) {
      const secrets = JSON.parse(localStorage.getItem("BV_MOCK_BLIND_SECRETS") || "{}");
      secrets[id] = recordData.book;
      localStorage.setItem("BV_MOCK_BLIND_SECRETS", JSON.stringify(secrets));
      delete newRecord.book;
    }

    records.unshift(newRecord);
    this.setData("records", records);

    // 학급 나무 열매 +1
    if (recordData.completed) {
      await this.incrementTreeFruit(recordData.classId);
    }

    return { success: true, id, record: newRecord };
  },

  async getSecretBook(recordId) {
    const secrets = JSON.parse(localStorage.getItem("BV_MOCK_BLIND_SECRETS") || "{}");
    return secrets[recordId] || null;
  },

  async getClassTree(classId) {
    this.initDefaultData();
    const classes = this.getData("classes");
    return classes.find(c => c.id === classId) || {
      id: classId,
      treeFruits: 0,
      treeLeaves: 0,
      blindThreshold: 3
    };
  },

  async incrementTreeFruit(classId) {
    this.initDefaultData();
    const classes = this.getData("classes");
    const target = classes.find(c => c.id === classId);
    if (target) {
      target.treeFruits = (target.treeFruits || 0) + 1;
      target.treeLeaves = (target.treeLeaves || 0) + 1;
      this.setData("classes", classes);
    }
    return target;
  }
};
