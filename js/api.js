/**
 * 책마을 API 클라이언트 (GAS 통신 및 Mock Fallback 지원)
 */

// 초기 Mock 데이터 (GAS 연동 전 테스트 및 체험용)
const MOCK_INITIAL_DATA = {
  users: [
    { userId: "teacher", name: "담임선생님", classId: "1반", number: 0, role: "teacher", treeLevel: 3, totalLeaves: 12, totalFruits: 2, badges: ["마을촌장", "독서길잡이"] },
    { userId: "s01", name: "김하늘", classId: "1반", number: 1, role: "student", treeLevel: 2, totalLeaves: 7, totalFruits: 1, badges: ["책마을입주민", "소설탐험가"] },
    { userId: "s02", name: "이바다", classId: "1반", number: 2, role: "student", treeLevel: 1, totalLeaves: 4, totalFruits: 0, badges: ["책마을입주민"] },
    { userId: "s03", name: "박우주", classId: "1반", number: 3, role: "student", treeLevel: 3, totalLeaves: 10, totalFruits: 2, badges: ["책마을입주민", "과학탐구자", "릴레이마스터"] }
  ],
  books: {
    "9788936434595": {
      isbn: "9788936434595",
      title: "불편한 편의점",
      author: "김호연 (지은이)",
      publisher: "나무옆의자",
      coverUrl: "https://image.aladin.co.kr/product/26942/84/cover500/8936434594_1.jpg",
      category: "국내도서 > 소설/시/희곡 > 한국소설",
      aladinRating: 9.3,
      description: "청파동 골목 모퉁이에 자리 잡은 작은 편의점을 무대로 힘겨운 시대를 살아가는 이웃들의 삶을 따뜻하게 감싸 안는 힐링 드라마."
    },
    "9788932917245": {
      isbn: "9788932917245",
      title: "어린 왕자",
      author: "앙투안 드 생텍쥐페리 (지은이)",
      publisher: "열린책들",
      coverUrl: "https://image.aladin.co.kr/product/6853/49/cover500/8932917248_1.jpg",
      category: "국내도서 > 소설/시/희곡 > 프랑스소설",
      aladinRating: 9.6,
      description: "사막에 불시착한 조종사가 다른 행성에서 온 어린 왕자를 만나며 인생의 본질적인 소중함을 발견해가는 명작."
    },
    "9788970840659": {
      isbn: "9788970840659",
      title: "코스모스",
      author: "칼 세이건 (지은이)",
      publisher: "사이언스북스",
      coverUrl: "https://image.aladin.co.kr/product/54/60/cover500/8983711892_1.jpg",
      category: "국내도서 > 과학 > 천문학/우주",
      aladinRating: 9.7,
      description: "우주의 신비와 인류 문명의 위대한 탐험을 유려한 문체로 담아낸 과학 교양서의 불멸의 고전."
    },
    "9788954682152": {
      isbn: "9788954682152",
      title: "달러구트 꿈 백화점",
      author: "이미예 (지은이)",
      publisher: "팩토리나인",
      coverUrl: "https://image.aladin.co.kr/product/24546/78/cover500/k022633448_1.jpg",
      category: "국내도서 > 소설/시/희곡 > 판타지소설",
      aladinRating: 9.2,
      description: "잠들어야만 입장할 수 있는 상점가에서 꿈을 파는 사람들과 손님들의 따스하고 몽환적인 이야기."
    }
  },
  records: [
    {
      recordId: "rec_001",
      userId: "s01",
      userName: "김하늘",
      classId: "1반",
      isbn: "9788936434595",
      type: "feed",
      title: "따뜻한 도시락 같은 소설",
      content: "편의점 야간 알바 독고 씨의 서툰 따뜻함이 마음에 와닿았습니다. 우리 반 친구들에게도 꼭 권하고 싶어요!",
      quote: "밥 딜런의 외할머니가 어린 밥 딜런에게 했다는 말이 기억나요. 행복은 무언가를 찾는 과정에 있는 거라고.",
      rating: 5,
      emotionTag: "🌟 깊은감동",
      createdAt: new Date(Date.now() - 3600000 * 24).toISOString()
    },
    {
      recordId: "rec_002",
      userId: "s02",
      userName: "이바다",
      classId: "1반",
      isbn: "9788954682152",
      type: "blind",
      title: "신비로운 가게의 비밀",
      question: "만약 여러분이 오늘 밤 꾸고 싶은 꿈을 골라 살 수 있다면 어떤 꿈을 사실 건가요?",
      quote: "손님들이 꿈을 꾸는 동안에는 온전히 자기 자신으로 존재하길 바라는 마음으로 만듭니다.",
      content: "꿈을 사고파는 신기한 백화점 이야기입니다. 몽환적인 분위기를 좋아하는 친구는 맞춰보세요!",
      rating: 5,
      emotionTag: "💡 깨달음",
      blindInfo: { revealed: false, threshold: 3, currentCount: 2 },
      createdAt: new Date(Date.now() - 3600000 * 12).toISOString()
    },
    {
      recordId: "rec_003",
      userId: "s03",
      userName: "박우주",
      classId: "1반",
      isbn: "9788932917245",
      type: "interview",
      characterName: "어린 왕자",
      title: "B612호 행성에서 온 어린 왕자와의 단독 인터뷰",
      content: "지구의 바쁜 어른들과 친구들에게 장미와 여우에 대해 들려주고 싶어 인터뷰에 응했습니다. 질문을 남겨주세요!",
      quote: "가장 중요한 것은 눈에 보이지 않아. 마음으로 보아야만 분명하게 볼 수 있어.",
      rating: 5,
      emotionTag: "🤔 깊은생각",
      createdAt: new Date(Date.now() - 3600000 * 5).toISOString()
    },
    {
      recordId: "rec_004",
      userId: "s03",
      userName: "박우주",
      classId: "1반",
      isbn: "9788970840659",
      type: "relay",
      title: "우주의 경이로움을 마주하다",
      content: "어린 왕자의 행성 여행을 읽고 나서 실제 우리 우주가 얼마나 광활한지 알고 싶어 이 책을 골랐습니다.",
      quote: "우리는 모두 별에서 만들어진 물질로 이루어져 있다.",
      rating: 5,
      emotionTag: "🔥 열정/용기",
      createdAt: new Date(Date.now() - 3600000 * 2).toISOString()
    }
  ],
  connections: [
    {
      connectionId: "conn_001",
      fromRecordId: "rec_003",
      toRecordId: "rec_004",
      reasonKeyword: "우주와 행성",
      reasonText: "어린 왕자의 작은 별 B612에서 영감을 받아 실제 광대한 코스모스를 탐험하는 책으로 꼬리를 이었습니다!",
      userId: "s03",
      createdAt: new Date(Date.now() - 3600000 * 2).toISOString()
    }
  ],
  comments: [
    {
      commentId: "cmt_001",
      recordId: "rec_002",
      userId: "s01",
      userName: "김하늘",
      content: "꿈을 파는 백화점이라니 너무 신기해요! 하늘을 날아다니는 꿈을 사고 싶어요.",
      roleType: "student",
      createdAt: new Date(Date.now() - 3600000 * 10).toISOString()
    },
    {
      commentId: "cmt_002",
      recordId: "rec_002",
      userId: "teacher",
      userName: "담임선생님",
      content: "책 표지가 혹시 파란 밤하늘 느낌인가요? 기대됩니다!",
      roleType: "teacher",
      createdAt: new Date(Date.now() - 3600000 * 6).toISOString()
    },
    {
      commentId: "cmt_003",
      recordId: "rec_003",
      userId: "s02",
      userName: "이바다",
      content: "어린 왕자님, 여우와 헤어질 때 어떤 기분이었나요?",
      roleType: "journalist",
      createdAt: new Date(Date.now() - 3600000 * 4).toISOString()
    },
    {
      commentId: "cmt_004",
      recordId: "rec_003",
      userId: "s03",
      userName: "박우주(어린 왕자)",
      content: "슬펐지만 밀밭을 볼 때마다 여우의 노란 털빛과 우리가 나눈 소중한 시간이 떠올라 마음이 따뜻해졌답니다.",
      roleType: "persona",
      parentCommentId: "cmt_003",
      createdAt: new Date(Date.now() - 3600000 * 3).toISOString()
    }
  ],
  reactions: [
    { recordId: "rec_001", userId: "s02", type: "like" },
    { recordId: "rec_001", userId: "s03", type: "wish" }
  ],
  classTree: {
    classId: "1반",
    className: "햇살 1반",
    totalLeaves: 33,
    totalFruits: 6,
    treeStage: 3,
    lastWateredAt: new Date().toISOString()
  }
};

// 로컬 스토리지 초기화 (Mock용)
function getMockStorage() {
  const dataStr = localStorage.getItem("BOOK_VILLAGE_MOCK_STORAGE");
  if (!dataStr) {
    localStorage.setItem("BOOK_VILLAGE_MOCK_STORAGE", JSON.stringify(MOCK_INITIAL_DATA));
    return MOCK_INITIAL_DATA;
  }
  return JSON.parse(dataStr);
}

function saveMockStorage(data) {
  localStorage.setItem("BOOK_VILLAGE_MOCK_STORAGE", JSON.stringify(data));
}

// ==========================================
// API 클라이언트 인터페이스
// ==========================================
const API = {
  // 공통 POST 요청
  async request(action, payload = {}) {
    const token = Auth.getToken();

    // 1. Mock 모드일 때
    if (CONFIG.IS_MOCK_MODE()) {
      return this.handleMockRequest(action, payload, token);
    }

    // 2. 실제 GAS 백엔드 요청
    try {
      const response = await fetch(CONFIG.GAS_API_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ action, token, payload })
      });
      return await response.json();
    } catch (err) {
      console.error("API 요청 실패:", err);
      // 서버 장애 시 안내 및 fallback
      return { success: false, message: "서버 통신 오류: " + err.message };
    }
  },

  // Mock 요청 핸들러 (로컬 시뮬레이션)
  async handleMockRequest(action, payload, token) {
    // 0.2초 딜레이 (자연스러운 UX)
    await new Promise(r => setTimeout(r, 150));
    const db = getMockStorage();
    const currentUser = Auth.getCurrentUser();

    switch (action) {
      case "login": {
        const { userId, password } = payload;
        const user = db.users.find(u => u.userId === userId);
        if (user && (password === "1234" || password === "admin1234" || user.userId === userId)) {
          const mockToken = "mock_token_" + userId + "_" + Date.now();
          return { success: true, user: user, token: mockToken };
        }
        return { success: false, message: "아이디나 비밀번호(기본: 1234 / 관리자: admin1234)를 확인하세요." };
      }

      case "searchAladin": {
        const query = (payload.query || "").toLowerCase();
        const results = Object.values(db.books).filter(b => 
          b.title.toLowerCase().includes(query) || 
          b.author.toLowerCase().includes(query) ||
          b.category.toLowerCase().includes(query)
        );
        return { success: true, items: results, totalResults: results.length };
      }

      case "getBookDetail": {
        const book = db.books[payload.isbn];
        if (book) return { success: true, book: book };
        return { success: false, message: "도서를 찾을 수 없습니다." };
      }

      case "getVillageStatus": {
        const recent = [...db.records].reverse().slice(0, 5).map(r => ({
          ...r,
          book: db.books[r.isbn] || { title: "책 정보" }
        }));
        return { success: true, classTree: db.classTree, recentNews: recent };
      }

      case "getRecords": {
        const { type, classId, userId } = payload;
        let list = [...db.records].reverse();
        if (type) list = list.filter(r => r.type === type);
        if (classId) list = list.filter(r => r.classId === classId);
        if (userId) list = list.filter(r => r.userId === userId);

        const formatted = list.map(r => {
          const isRevealed = r.type !== "blind" || (r.blindInfo && r.blindInfo.revealed);
          const book = db.books[r.isbn] || { title: "도서 정보 없음", coverUrl: "" };
          return {
            ...r,
            isbn: isRevealed ? r.isbn : "HIDDEN",
            book: isRevealed ? book : { title: "??? 비밀 도서 ???", coverUrl: "", author: "베일에 싸인 작가" }
          };
        });
        return { success: true, records: formatted };
      }

      case "createRecord": {
        if (!currentUser) return { success: false, message: "로그인이 필요합니다." };
        const newId = "rec_" + Date.now().toString(36);
        const record = {
          recordId: newId,
          userId: currentUser.userId,
          userName: currentUser.name,
          classId: currentUser.classId || "1반",
          isbn: payload.isbn,
          type: payload.type || "feed",
          title: payload.title || "",
          content: payload.content,
          question: payload.question || "",
          quote: payload.quote || "",
          characterName: payload.characterName || "",
          rating: Number(payload.rating) || 5,
          emotionTag: payload.emotionTag || "🌟 깊은감동",
          createdAt: new Date().toISOString()
        };

        if (payload.type === "blind") {
          record.blindInfo = { revealed: false, threshold: Number(payload.blindThreshold) || 3, currentCount: 0 };
        }

        db.records.push(record);

        if (payload.type === "relay" && payload.relayFromRecordId) {
          db.connections.push({
            connectionId: "conn_" + Date.now().toString(36),
            fromRecordId: payload.relayFromRecordId,
            toRecordId: newId,
            reasonKeyword: payload.relayReasonKeyword || "주제연결",
            reasonText: payload.relayReasonText || "",
            userId: currentUser.userId,
            createdAt: new Date().toISOString()
          });
        }

        // 도서 캐시가 없으면 임의 추가
        if (!db.books[payload.isbn] && payload.bookObj) {
          db.books[payload.isbn] = payload.bookObj;
        }

        // 나무 성장
        db.classTree.totalLeaves += 1;
        if (db.classTree.totalLeaves % 5 === 0) db.classTree.totalFruits += 1;
        db.classTree.treeStage = Math.min(5, Math.floor(db.classTree.totalLeaves / 10) + 1);

        const u = db.users.find(x => x.userId === currentUser.userId);
        if (u) {
          u.totalLeaves += 1;
          u.treeLevel = Math.floor(u.totalLeaves / 3) + 1;
          if (u.totalLeaves % 5 === 0) u.totalFruits += 1;
          Auth.setCurrentUser(u);
        }

        saveMockStorage(db);
        return { success: true, recordId: newId, message: "기록이 등록되었습니다!" };
      }

      case "getComments": {
        const comments = db.comments.filter(c => c.recordId === payload.recordId);
        return { success: true, comments: comments };
      }

      case "addComment": {
        if (!currentUser) return { success: false, message: "로그인이 필요합니다." };
        const newCmt = {
          commentId: "cmt_" + Date.now().toString(36),
          recordId: payload.recordId,
          userId: currentUser.userId,
          userName: currentUser.name,
          content: payload.content,
          parentCommentId: payload.parentCommentId || "",
          roleType: payload.roleType || "student",
          createdAt: new Date().toISOString()
        };
        db.comments.push(newCmt);

        // 블라인드 북 해금 체크
        let justRevealed = false;
        const targetRec = db.records.find(r => r.recordId === payload.recordId);
        if (targetRec && targetRec.type === "blind" && targetRec.blindInfo) {
          targetRec.blindInfo.currentCount += 1;
          if (!targetRec.blindInfo.revealed && targetRec.blindInfo.currentCount >= targetRec.blindInfo.threshold) {
            targetRec.blindInfo.revealed = true;
            justRevealed = true;
          }
        }

        saveMockStorage(db);
        return { success: true, commentId: newCmt.commentId, justRevealed: justRevealed, message: "댓글이 등록되었습니다." };
      }

      case "toggleReaction": {
        if (!currentUser) return { success: false, message: "로그인이 필요합니다." };
        const idx = db.reactions.findIndex(rx => rx.recordId === payload.recordId && rx.userId === currentUser.userId && rx.type === payload.type);
        let active = false;
        if (idx >= 0) {
          db.reactions.splice(idx, 1);
          active = false;
        } else {
          db.reactions.push({ recordId: payload.recordId, userId: currentUser.userId, type: payload.type });
          active = true;
        }
        saveMockStorage(db);
        return { success: true, active: active };
      }

      case "getRelayGraph": {
        const relayRecords = db.records.filter(r => r.type === "relay").map(r => ({
          ...r,
          book: db.books[r.isbn] || { title: "도서 정보 없음", coverUrl: "" }
        }));
        return { success: true, nodes: relayRecords, links: db.connections };
      }

      case "getMyRoom": {
        if (!currentUser) return { success: false, message: "로그인이 필요합니다." };
        const myRecords = db.records.filter(r => r.userId === currentUser.userId).map(r => ({
          ...r,
          book: db.books[r.isbn] || { title: "도서 정보 없음", coverUrl: "" }
        }));
        const genreStats = {};
        myRecords.forEach(r => {
          if (r.book && r.book.category) {
            const cat = r.book.category.split(">")[0].trim() || "기타";
            genreStats[cat] = (genreStats[cat] || 0) + 1;
          }
        });
        const wishCount = db.reactions.filter(rx => rx.userId === currentUser.userId && rx.type === "wish").length;
        return { success: true, user: currentUser, records: myRecords, genreStats: genreStats, wishCount: wishCount };
      }

      case "batchRegisterStudents": {
        if (!currentUser || currentUser.role !== "teacher") return { success: false, message: "교사 권한이 필요합니다." };
        let count = 0;
        payload.students.forEach(st => {
          const num = Number(st.number) || 0;
          const uid = st.userId || ("s" + (num < 10 ? "0" + num : num));
          if (!db.users.find(u => u.userId === uid)) {
            db.users.push({
              userId: uid,
              name: st.name,
              classId: payload.classId || "1반",
              number: num,
              role: "student",
              treeLevel: 1,
              totalLeaves: 0,
              totalFruits: 0,
              badges: ["책마을입주민"]
            });
            count++;
          }
        });
        saveMockStorage(db);
        return { success: true, addedCount: count, message: `${count}명의 학생이 등록되었습니다.` };
      }

      case "getClassStatistics": {
        const students = db.users.filter(u => u.role === "student" && u.classId === (payload.classId || "1반"));
        students.sort((a, b) => b.totalLeaves - a.totalLeaves);
        return { success: true, classId: payload.classId || "1반", totalStudents: students.length, ranking: students };
      }

      case "deleteContent": {
        if (payload.contentType === "record") {
          db.records = db.records.filter(r => r.recordId !== payload.id);
        } else if (payload.contentType === "comment") {
          db.comments = db.comments.filter(c => c.commentId !== payload.id);
        }
        saveMockStorage(db);
        return { success: true, message: "항목이 삭제되었습니다." };
      }

      default:
        return { success: false, message: "알 수 없는 액션: " + action };
    }
  }
};
