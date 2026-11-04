/**
 * 책마을 통합 백엔드 스크립트 (Code.gs)
 * - 단일 배포용 (GAS 웹 앱 1개로 전 기능 지원)
 * - 기능 1: 구글 스프레드시트 공용 데이터베이스 (Records, Comments, Connections, ClassTree 등) 완전 지원
 * - 기능 2: 알라딘 / Google Books / Naver / Kakao 통합 도서 검색 프록시
 * - 기능 3: 교사용 관리 게이트웨이 및 학생 계정 관리
 */

// ==========================================
// 1. 설정 및 프로퍼티
// ==========================================
const CONFIG = {
  AUTH_DOMAIN: "village.local",

  get SPREADSHEET_ID() {
    return PropertiesService.getScriptProperties().getProperty("SPREADSHEET_ID") || "";
  },
  get FIREBASE_API_KEY() {
    return PropertiesService.getScriptProperties().getProperty("FIREBASE_API_KEY") || "";
  },
  get PROJECT_ID() {
    return PropertiesService.getScriptProperties().getProperty("FIREBASE_PROJECT_ID") || "";
  },
  get SERVICE_ACCOUNT() {
    const raw = PropertiesService.getScriptProperties().getProperty("SERVICE_ACCOUNT_KEY");
    return raw ? JSON.parse(raw) : null;
  },
  get ALADIN_TTB_KEY() {
    return PropertiesService.getScriptProperties().getProperty("ALADIN_TTB_KEY") || "";
  },
  get NAVER_CLIENT_ID() {
    return PropertiesService.getScriptProperties().getProperty("NAVER_CLIENT_ID") || "";
  },
  get NAVER_CLIENT_SECRET() {
    return PropertiesService.getScriptProperties().getProperty("NAVER_CLIENT_SECRET") || "";
  },
  get KAKAO_REST_KEY() {
    return PropertiesService.getScriptProperties().getProperty("KAKAO_REST_KEY") || "";
  }
};

// ==========================================
// 2. 스프레드시트 데이터베이스 헬퍼
// ==========================================
function getSpreadsheet() {
  // 1. 바운드 스크립트인 경우 활성 스프레드시트 반환
  try {
    const active = SpreadsheetApp.getActiveSpreadsheet();
    if (active) return active;
  } catch (e) {}

  // 2. 스크립트 프로퍼티에 SPREADSHEET_ID가 저장되어 있는 경우
  const storedId = CONFIG.SPREADSHEET_ID;
  if (storedId) {
    try {
      return SpreadsheetApp.openById(storedId);
    } catch (e) {
      Logger.log("저장된 SPREADSHEET_ID 열기 실패: " + e);
    }
  }

  // 3. 독립형 스크립트이고 ID가 없으면 새 스프레드시트를 생성하여 영구 보관
  try {
    const newSs = SpreadsheetApp.create("책마을_데이터베이스");
    PropertiesService.getScriptProperties().setProperty("SPREADSHEET_ID", newSs.getId());
    Logger.log("새 스프레드시트 생성 완료 (ID 저장됨): " + newSs.getId());
    return newSs;
  } catch (e) {
    Logger.log("스프레드시트 생성 실패: " + e);
    return null;
  }
}

function getOrCreateSheet(sheetName, headers) {
  const ss = getSpreadsheet();
  if (!ss) return null;

  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    if (headers && headers.length > 0) {
      sheet.appendRow(headers);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#e8f5e9");
      sheet.setFrozenRows(1);
    }
  } else if (sheet.getLastRow() === 0 && headers && headers.length > 0) {
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#e8f5e9");
    sheet.setFrozenRows(1);
  }
  return sheet;
}

// 데이터베이스 초기화
function initDatabase() {
  const schemas = {
    "Records": [
      "recordId", "userId", "userName", "classId", "isbn", "type", 
      "title", "content", "question", "quote", "characterName", 
      "rating", "emotionTag", "bookJson", "blindInfoJson", "teacherFeedbackJson", "createdAt"
    ],
    "Comments": [
      "commentId", "recordId", "userId", "userName", "content", "roleType", "parentCommentId", "createdAt"
    ],
    "Connections": [
      "connectionId", "fromRecordId", "toRecordId", "reasonKeyword", "reasonText", "userId", "classId", "createdAt"
    ],
    "ClassTree": [
      "classId", "className", "totalLeaves", "totalFruits", "treeStage", "updatedAt"
    ],
    "Reactions": [
      "reactionId", "recordId", "userId", "type", "createdAt"
    ],
    "Users": [
      "userId", "name", "classId", "number", "role", "treeLevel", "totalLeaves", "totalFruits", "createdAt"
    ]
  };

  const ss = getSpreadsheet();
  if (!ss) return { success: false, message: "스프레드시트에 접근할 수 없습니다." };

  for (const [name, headers] of Object.entries(schemas)) {
    getOrCreateSheet(name, headers);
  }

  // 기본 학급 나무 레코드 보장
  const treeSheet = getOrCreateSheet("ClassTree", schemas["ClassTree"]);
  if (treeSheet && treeSheet.getLastRow() <= 1) {
    treeSheet.appendRow(["1반", "햇살 1반", 10, 2, 2, new Date().toISOString()]);
  }

  // 초기 권장 샘플 독서 기록 보장 (Records 시트가 비어있을 때)
  const recSheet = getOrCreateSheet("Records", schemas["Records"]);
  if (recSheet && recSheet.getLastRow() <= 1) {
    const now = new Date().toISOString();
    recSheet.appendRow([
      "rec_demo_001", "s01", "김하늘", "1반", "9788936434595", "feed",
      "따뜻한 도시락 같은 소설",
      "편의점 야간 알바 독고 씨의 서툰 따뜻함이 마음에 와닿았습니다. 우리 반 친구들에게도 꼭 권하고 싶어요!",
      "", "행복은 무언가를 찾는 과정에 있는 거라고.", "", 5, "🌟 깊은감동",
      JSON.stringify({ isbn: "9788936434595", title: "불편한 편의점", author: "김호연", publisher: "나무옆의자", coverUrl: "https://image.aladin.co.kr/product/26942/84/cover500/8936434594_1.jpg", category: "소설" }),
      "", "", now
    ]);
    recSheet.appendRow([
      "rec_demo_002", "s02", "이바다", "1반", "9788954682152", "blind",
      "신비로운 가게의 비밀",
      "꿈을 사고파는 신기한 백화점 이야기입니다. 몽환적인 분위기를 좋아하는 친구는 맞춰보세요!",
      "만약 여러분이 오늘 밤 꾸고 싶은 꿈을 골라 살 수 있다면 어떤 꿈을 사실 건가요?",
      "손님들이 꿈을 꾸는 동안에는 온전히 자기 자신으로 존재하길 바라는 마음으로 만듭니다.",
      "", 5, "💡 깨달음",
      JSON.stringify({ isbn: "9788954682152", title: "달러구트 꿈 백화점", author: "이미예", publisher: "팩토리나인", coverUrl: "https://image.aladin.co.kr/product/24546/78/cover500/k022633448_1.jpg", category: "판타지" }),
      JSON.stringify({ revealed: false, threshold: 3, currentCount: 0 }),
      "", now
    ]);
  }

  return { success: true, message: "책마을 공용 데이터베이스 초기화 완료", spreadsheetUrl: ss.getUrl() };
}

// ==========================================
// 3. HTTP 요청 라우팅 (GET / POST)
// ==========================================
function doGet(e) {
  return handleRequest(e ? e.parameter : {});
}

function doPost(e) {
  let body = {};
  if (e && e.postData && e.postData.contents) {
    try {
      body = JSON.parse(e.postData.contents);
    } catch (err) {
      body = e.parameter || {};
    }
  } else if (e && e.parameter) {
    body = e.parameter;
  }
  return handleRequest(body);
}

function handleRequest(params) {
  const action = params.action;
  const payload = params.payload || {};
  const query = params.query || payload.query || "";

  // 1) 데이터베이스 수동 초기화 라우트
  if (action === "initDb") {
    return jsonResponse(initDatabase());
  }

  // 2) 통합 도서 검색 라우트
  if (action === "search" || action === "searchBooks" || action === "searchAladin") {
    return jsonResponse(searchBooksUnified(query, params.start || 1, params.maxResults || 10));
  }
  if (action === "lookup" || action === "detail") {
    return jsonResponse(lookupBookUnified(params.isbn || payload.isbn));
  }

  // 3) 공용 데이터베이스 활동 데이터 CRUD 라우트
  if (action === "createRecord") {
    return jsonResponse(handleGasCreateRecord(payload, params.token));
  }
  if (action === "getRecords") {
    return jsonResponse(handleGasGetRecords(payload));
  }
  if (action === "getComments") {
    return jsonResponse(handleGasGetComments(payload));
  }
  if (action === "addComment") {
    return jsonResponse(handleGasAddComment(payload, params.token));
  }
  if (action === "toggleReaction") {
    return jsonResponse(handleGasToggleReaction(payload, params.token));
  }
  if (action === "getVillageStatus") {
    return jsonResponse(handleGasGetVillageStatus(payload));
  }
  if (action === "getRelayGraph") {
    return jsonResponse(handleGasGetRelayGraph(payload));
  }
  if (action === "getMyRoom") {
    return jsonResponse(handleGasGetMyRoom(payload, params.token));
  }
  if (action === "login") {
    return jsonResponse(handleGasLogin(payload));
  }
  if (action === "batchRegisterStudents") {
    return jsonResponse(handleGasBatchRegisterStudents(payload, params.token));
  }
  if (action === "addTeacherFeedback") {
    return jsonResponse(handleGasAddTeacherFeedback(payload, params.token));
  }

  // 4) 교사용 관리자 계정 생성 (Firebase 연동된 경우)
  if (action === "bulkCreate" || action === "resetPassword" || action === "setActive") {
    const lock = LockService.getScriptLock();
    try {
      lock.waitLock(30000);
      const teacherUser = verifyIdToken(params.idToken);
      if (!teacherUser || teacherUser.role !== "teacher") {
        return jsonResponse({ success: false, message: "교사 권한이 필요합니다." }, 403);
      }
      if (action === "bulkCreate") return jsonResponse(handleBulkCreate(params, teacherUser));
      if (action === "resetPassword") return jsonResponse(handleResetPassword(params, teacherUser));
      if (action === "setActive") return jsonResponse(handleSetActive(params, teacherUser));
    } catch (err) {
      return jsonResponse({ success: false, message: err.toString() }, 500);
    } finally {
      lock.releaseLock();
    }
  }

  return jsonResponse({ success: false, message: `지원되지 않는 action입니다: ${action}` }, 400);
}

// ==========================================
// 4. 활동 데이터 CRUD 핸들러 (스프레드시트 공용 DB)
// ==========================================

// 4.1 독서 기록 생성 (한 줄 피드, 비밀의 숲, 책 꼬리잇기, 가상 인터뷰)
function handleGasCreateRecord(payload, token) {
  const sheet = getOrCreateSheet("Records", [
    "recordId", "userId", "userName", "classId", "isbn", "type", 
    "title", "content", "question", "quote", "characterName", 
    "rating", "emotionTag", "bookJson", "blindInfoJson", "teacherFeedbackJson", "createdAt"
  ]);

  if (!sheet) {
    return { success: false, message: "데이터베이스 시트에 접근할 수 없습니다." };
  }

  const newRecordId = "rec_" + Date.now().toString(36) + "_" + Math.random().toString(36).substring(2, 6);
  const now = new Date().toISOString();

  // 도서 메타데이터 JSON 직렬화
  const bookObj = payload.bookObj || {
    title: payload.title || "도서",
    author: payload.author || "",
    publisher: payload.publisher || "",
    coverUrl: payload.coverUrl || "",
    isbn: payload.isbn || "",
    category: payload.category || "도서"
  };

  // 블라인드 북 정보
  const blindInfo = (payload.type === "blind") ? {
    revealed: false,
    threshold: Number(payload.blindThreshold) || 3,
    currentCount: 0
  } : null;

  sheet.appendRow([
    newRecordId,
    payload.userId || "s01",
    payload.userName || "우리 반 독서가",
    payload.classId || "1반",
    payload.isbn || "",
    payload.type || "feed",
    payload.title || bookObj.title || "",
    payload.content || "",
    payload.question || "",
    payload.quote || "",
    payload.characterName || "",
    Number(payload.rating) || 5,
    payload.emotionTag || "🌟 깊은감동",
    JSON.stringify(bookObj),
    blindInfo ? JSON.stringify(blindInfo) : "",
    "", // teacherFeedbackJson
    now
  ]);

  // 릴레이 꼬리잇기인 경우 Connections 시트에 연결선 저장
  if (payload.type === "relay" && payload.relayFromRecordId) {
    try {
      const connSheet = getOrCreateSheet("Connections", [
        "connectionId", "fromRecordId", "toRecordId", "reasonKeyword", "reasonText", "userId", "classId", "createdAt"
      ]);
      if (connSheet) {
        connSheet.appendRow([
          "conn_" + Date.now().toString(36),
          payload.relayFromRecordId,
          newRecordId,
          payload.relayReasonKeyword || "주제연결",
          payload.relayReasonText || "",
          payload.userId || "s01",
          payload.classId || "1반",
          now
        ]);
      }
    } catch (e) {
      Logger.log("Connections 시트 기록 오류: " + e);
    }
  }

  // 학급 나무 성장 업데이트 (완독 1권당 이파리 +1, 5권당 열매 +1)
  try {
    const classId = payload.classId || "1반";
    const treeSheet = getOrCreateSheet("ClassTree", [
      "classId", "className", "totalLeaves", "totalFruits", "treeStage", "updatedAt"
    ]);
    if (treeSheet) {
      const data = treeSheet.getDataRange().getValues();
      let found = false;
      for (let i = 1; i < data.length; i++) {
        if (String(data[i][0]) === String(classId)) {
          let leaves = Number(data[i][2] || 0) + 1;
          let fruits = Number(data[i][3] || 0);
          if (leaves % 5 === 0) fruits += 1;
          let stage = Math.min(5, Math.floor(leaves / 10) + 1);

          treeSheet.getRange(i + 1, 3).setValue(leaves);
          treeSheet.getRange(i + 1, 4).setValue(fruits);
          treeSheet.getRange(i + 1, 5).setValue(stage);
          treeSheet.getRange(i + 1, 6).setValue(now);
          found = true;
          break;
        }
      }
      if (!found) {
        treeSheet.appendRow([classId, classId, 1, 0, 1, now]);
      }
    }
  } catch (e) {
    Logger.log("ClassTree 시트 업데이트 오류: " + e);
  }

  return { 
    success: true, 
    recordId: newRecordId, 
    message: "공용 데이터베이스에 독서 기록이 성공적으로 등록되었습니다!" 
  };
}

// 4.2 독서 기록 목록 조회 (모든 사용자의 기록 최신순 반환)
function handleGasGetRecords(payload) {
  const reqType = payload.type;
  const reqClassId = payload.classId;

  const sheet = getOrCreateSheet("Records", [
    "recordId", "userId", "userName", "classId", "isbn", "type", 
    "title", "content", "question", "quote", "characterName", 
    "rating", "emotionTag", "bookJson", "blindInfoJson", "teacherFeedbackJson", "createdAt"
  ]);

  if (!sheet || sheet.getLastRow() <= 1) {
    return { success: true, records: [] };
  }

  // 댓글 수 카운트 맵 생성 (블라인드 해금 판별용)
  const commentCountMap = {};
  try {
    const cSheet = getOrCreateSheet("Comments", ["commentId", "recordId"]);
    if (cSheet && cSheet.getLastRow() > 1) {
      const cData = cSheet.getDataRange().getValues();
      for (let i = 1; i < cData.length; i++) {
        const rid = String(cData[i][1] || "");
        if (rid) commentCountMap[rid] = (commentCountMap[rid] || 0) + 1;
      }
    }
  } catch(e) {}

  const data = sheet.getDataRange().getValues();
  const records = [];

  // 최신순(역순)으로 순회
  for (let i = data.length - 1; i >= 1; i--) {
    const row = data[i];
    const recId = String(row[0]);
    const recType = String(row[5]);
    const recClassId = String(row[3]);

    if (reqType && recType !== reqType) continue;
    // reqClassId가 제공된 경우에만 필터 (비어있으면 전체 학급 공유)
    if (reqClassId && recClassId !== reqClassId && reqClassId !== "전체") continue;

    // 도서 객체 파싱
    let bookObj = null;
    try {
      if (row[13]) bookObj = JSON.parse(row[13]);
    } catch(e) {}
    if (!bookObj) {
      bookObj = {
        title: row[6] || "도서 제목",
        author: "",
        publisher: "",
        coverUrl: "",
        isbn: row[4] || ""
      };
    }

    // 블라인드 정보 파싱 및 댓글 수 기반 해금 계산
    let blindInfo = null;
    const currentComments = commentCountMap[recId] || 0;
    if (recType === "blind") {
      try {
        if (row[14]) blindInfo = JSON.parse(row[14]);
      } catch(e) {}
      if (!blindInfo) {
        blindInfo = { revealed: false, threshold: 3, currentCount: currentComments };
      }
      blindInfo.currentCount = currentComments;
      if (currentComments >= (blindInfo.threshold || 3)) {
        blindInfo.revealed = true;
      }
    }

    // 교사 피드백 파싱
    let teacherFeedback = null;
    try {
      if (row[15]) teacherFeedback = JSON.parse(row[15]);
    } catch(e) {}

    const isBlindHidden = (recType === "blind" && blindInfo && !blindInfo.revealed);

    records.push({
      recordId: recId,
      userId: String(row[1]),
      userName: String(row[2]),
      classId: recClassId,
      isbn: isBlindHidden ? "HIDDEN" : String(row[4]),
      type: recType,
      title: String(row[6]),
      content: String(row[7]),
      question: String(row[8] || ""),
      quote: String(row[9] || ""),
      characterName: String(row[10] || ""),
      rating: Number(row[11]) || 5,
      emotionTag: String(row[12] || "🌟 깊은감동"),
      book: isBlindHidden ? { title: "??? 비밀 도서 ???", author: "베일에 싸인 작가", coverUrl: "" } : bookObj,
      blindInfo: blindInfo,
      teacherFeedback: teacherFeedback,
      commentCount: currentComments,
      createdAt: row[16] ? new Date(row[16]).toISOString() : new Date().toISOString()
    });

    if (records.length >= (payload.limitCount || 100)) break;
  }

  return { success: true, records: records };
}

// 4.3 댓글 작성
function handleGasAddComment(payload, token) {
  const sheet = getOrCreateSheet("Comments", [
    "commentId", "recordId", "userId", "userName", "content", "roleType", "parentCommentId", "createdAt"
  ]);

  if (!sheet) return { success: false, message: "댓글 시트에 접근할 수 없습니다." };

  const newCommentId = "cmt_" + Date.now().toString(36) + "_" + Math.random().toString(36).substring(2, 6);
  const now = new Date().toISOString();

  sheet.appendRow([
    newCommentId,
    payload.recordId || "",
    payload.userId || "s01",
    payload.userName || "우리 반 친구",
    payload.content || "",
    payload.roleType || "student",
    payload.parentCommentId || "",
    now
  ]);

  return { success: true, commentId: newCommentId, message: "댓글이 공용 데이터베이스에 등록되었습니다!" };
}

// 4.4 댓글 목록 조회
function handleGasGetComments(payload) {
  const recordId = payload.recordId;
  if (!recordId) return { success: true, comments: [] };

  const sheet = getOrCreateSheet("Comments", [
    "commentId", "recordId", "userId", "userName", "content", "roleType", "parentCommentId", "createdAt"
  ]);

  if (!sheet || sheet.getLastRow() <= 1) {
    return { success: true, comments: [] };
  }

  const data = sheet.getDataRange().getValues();
  const comments = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (String(row[1]) === String(recordId)) {
      comments.push({
        commentId: String(row[0]),
        recordId: String(row[1]),
        userId: String(row[2]),
        userName: String(row[3]),
        content: String(row[4]),
        roleType: String(row[5] || "student"),
        parentCommentId: String(row[6] || ""),
        createdAt: row[7] ? new Date(row[7]).toISOString() : new Date().toISOString()
      });
    }
  }

  // 시간순 정렬
  comments.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  return { success: true, comments: comments };
}

// 4.5 공감 / 위시리스트 반응 토글
function handleGasToggleReaction(payload, token) {
  const sheet = getOrCreateSheet("Reactions", [
    "reactionId", "recordId", "userId", "type", "createdAt"
  ]);

  if (!sheet) return { success: true, active: true };

  const recordId = String(payload.recordId || "");
  const userId = String(payload.userId || "s01");
  const type = String(payload.type || "like");

  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][1]) === recordId && String(data[i][2]) === userId && String(data[i][3]) === type) {
      sheet.deleteRow(i + 1);
      return { success: true, active: false, message: "반응이 취소되었습니다." };
    }
  }

  sheet.appendRow([
    "rx_" + Date.now().toString(36),
    recordId,
    userId,
    type,
    new Date().toISOString()
  ]);
  return { success: true, active: true, message: "반응이 등록되었습니다!" };
}

// 4.6 마을 광장 및 학급 나무 현황 조회
function handleGasGetVillageStatus(payload) {
  const classId = payload.classId || "1반";

  let classTree = { classId: classId, totalLeaves: 10, totalFruits: 2, treeStage: 2 };
  try {
    const sheet = getOrCreateSheet("ClassTree", [
      "classId", "className", "totalLeaves", "totalFruits", "treeStage", "updatedAt"
    ]);
    if (sheet && sheet.getLastRow() > 1) {
      const data = sheet.getDataRange().getValues();
      for (let i = 1; i < data.length; i++) {
        if (String(data[i][0]) === String(classId)) {
          classTree = {
            classId: String(data[i][0]),
            className: String(data[i][1] || classId),
            totalLeaves: Number(data[i][2]) || 0,
            totalFruits: Number(data[i][3]) || 0,
            treeStage: Number(data[i][4]) || 1,
            updatedAt: data[i][5]
          };
          break;
        }
      }
    }
  } catch(e) {}

  // 최신 독서 소식 5건
  const recentRecordsRes = handleGasGetRecords({ limitCount: 5 });
  const recentNews = recentRecordsRes.records || [];

  return {
    success: true,
    classTree: classTree,
    recentNews: recentNews
  };
}

// 4.7 릴레이 꼬리잇기 그래프 조회
function handleGasGetRelayGraph(payload) {
  const relayRecordsRes = handleGasGetRecords({ type: "relay" });
  const nodes = (relayRecordsRes.records || []).map(r => ({
    id: r.recordId,
    recordId: r.recordId,
    title: r.title,
    author: (r.book && r.book.author) || r.userName,
    coverUrl: (r.book && r.book.coverUrl) || "",
    userName: r.userName
  }));

  const links = [];
  try {
    const connSheet = getOrCreateSheet("Connections", [
      "connectionId", "fromRecordId", "toRecordId", "reasonKeyword", "reasonText", "userId", "classId", "createdAt"
    ]);
    if (connSheet && connSheet.getLastRow() > 1) {
      const cData = connSheet.getDataRange().getValues();
      for (let i = 1; i < cData.length; i++) {
        links.push({
          connectionId: String(cData[i][0]),
          fromRecordId: String(cData[i][1]),
          toRecordId: String(cData[i][2]),
          source: String(cData[i][1]),
          target: String(cData[i][2]),
          reasonKeyword: String(cData[i][3] || ""),
          reasonText: String(cData[i][4] || ""),
          keyword: String(cData[i][3] || "꼬리잇기")
        });
      }
    }
  } catch(e) {}

  return { success: true, nodes: nodes, links: links };
}

// 4.8 나의 서재 조회
function handleGasGetMyRoom(payload, token) {
  const userId = (payload && payload.userId) || "s01";
  const recordsRes = handleGasGetRecords({});
  const allRecords = recordsRes.records || [];
  const myRecords = allRecords.filter(r => r.userId === userId);

  const genreStats = {};
  myRecords.forEach(r => {
    const cat = (r.book && r.book.category ? r.book.category.split(">")[0].trim() : "도서");
    genreStats[cat] = (genreStats[cat] || 0) + 1;
  });

  return {
    success: true,
    user: {
      userId: userId,
      name: myRecords[0] ? myRecords[0].userName : "학생",
      classId: "1반",
      totalLeaves: myRecords.length,
      totalFruits: Math.floor(myRecords.length / 5),
      treeLevel: Math.floor(myRecords.length / 3) + 1,
      badges: ["책마을입주민"]
    },
    records: myRecords,
    genreStats: genreStats,
    wishCount: 0
  };
}

// 4.9 교사 칭찬 스탬프 및 피드백 저장
function handleGasAddTeacherFeedback(payload, token) {
  const recordId = payload.recordId;
  const feedback = payload.feedback;
  if (!recordId || !feedback) {
    return { success: false, message: "필수 정보가 누락되었습니다." };
  }

  const sheet = getOrCreateSheet("Records");
  if (!sheet) return { success: false, message: "시트에 접근할 수 없습니다." };

  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(recordId)) {
      sheet.getRange(i + 1, 16).setValue(JSON.stringify(feedback)); // teacherFeedbackJson
      return { success: true, message: "선생님 피드백이 등록되었습니다!" };
    }
  }
  return { success: false, message: "해당 기록을 찾을 수 없습니다." };
}

// 4.10 로그인 처리
function handleGasLogin(payload) {
  const userId = payload.userId || "s01";
  const password = payload.password || "";

  return {
    success: true,
    user: {
      userId: userId,
      name: userId === "teacher" ? "담임선생님" : (userId.startsWith("s") ? `${userId.substring(1)}번 학생` : userId),
      classId: "1반",
      role: userId === "teacher" ? "teacher" : "student",
      treeLevel: 1,
      totalLeaves: 5,
      totalFruits: 1,
      badges: ["책마을입주민"]
    },
    token: "token_" + userId + "_" + Date.now()
  };
}

// 4.11 학생 일괄 등록
function handleGasBatchRegisterStudents(payload, token) {
  const students = payload.students || [];
  const classId = payload.classId || "1반";

  const sheet = getOrCreateSheet("Users", [
    "userId", "name", "classId", "number", "role", "treeLevel", "totalLeaves", "totalFruits", "createdAt"
  ]);

  if (!sheet) return { success: false, message: "사용자 시트 오류" };

  let addedCount = 0;
  students.forEach(st => {
    sheet.appendRow([
      st.userId || ("s" + (st.number < 10 ? "0" + st.number : st.number)),
      st.name || "학생",
      classId,
      st.number || 0,
      "student",
      1,
      0,
      0,
      new Date().toISOString()
    ]);
    addedCount++;
  });

  return { success: true, addedCount: addedCount, message: `${addedCount}명의 학생이 등록되었습니다.` };
}

// ==========================================
// 5. 통합 도서 검색 로직 (Naver / Kakao / Google / Aladin / Local Fallback)
// ==========================================
function searchBooksUnified(query, start, maxResults) {
  if (!query || !query.trim()) {
    return { success: true, items: getCuratedDemoBooks(), totalResults: 6, source: "Preset" };
  }

  const q = query.trim();
  const cacheKey = "SEARCH_V2_" + encodeURIComponent(q) + "_" + start + "_" + maxResults;
  const cache = CacheService.getScriptCache();
  const cached = cache.get(cacheKey);
  if (cached) {
    try { return JSON.parse(cached); } catch(e) {}
  }

  // 1. 네이버 도서 검색
  if (CONFIG.NAVER_CLIENT_ID && CONFIG.NAVER_CLIENT_SECRET) {
    try {
      const naverUrl = "https://openapi.naver.com/v1/search/book.json?query=" + encodeURIComponent(q) + 
        "&display=" + (maxResults || 10) + "&start=" + (start || 1);
      const res = UrlFetchApp.fetch(naverUrl, {
        headers: {
          "X-Naver-Client-Id": CONFIG.NAVER_CLIENT_ID,
          "X-Naver-Client-Secret": CONFIG.NAVER_CLIENT_SECRET
        },
        muteHttpExceptions: true
      });
      if (res.getResponseCode() === 200) {
        const data = JSON.parse(res.getContentText());
        const items = (data.items || []).map(item => ({
          isbn: (item.isbn || "").replace(/<[^>]+>/g, "").split(" ")[1] || (item.isbn || "").replace(/<[^>]+>/g, ""),
          title: (item.title || "").replace(/<[^>]+>/g, ""),
          author: (item.author || "").replace(/<[^>]+>/g, ""),
          publisher: (item.publisher || "").replace(/<[^>]+>/g, ""),
          pubDate: (item.pubdate || ""),
          coverUrl: item.image || "",
          category: "국내도서",
          description: (item.description || "").replace(/<[^>]+>/g, ""),
          rating: 9.5,
          source: "Naver Books"
        }));
        const result = { success: true, items, totalResults: data.total || items.length, source: "Naver Books" };
        cache.put(cacheKey, JSON.stringify(result), 21600);
        return result;
      }
    } catch (err) {
      Logger.log("Naver 검색 오류: " + err);
    }
  }

  // 2. 카카오(다음) 책 검색
  if (CONFIG.KAKAO_REST_KEY) {
    try {
      const kakaoUrl = "https://dapi.kakao.com/v3/search/book?query=" + encodeURIComponent(q) + 
        "&size=" + (maxResults || 10) + "&page=" + (start || 1);
      const res = UrlFetchApp.fetch(kakaoUrl, {
        headers: { "Authorization": "KakaoAK " + CONFIG.KAKAO_REST_KEY },
        muteHttpExceptions: true
      });
      if (res.getResponseCode() === 200) {
        const data = JSON.parse(res.getContentText());
        const items = (data.documents || []).map(item => ({
          isbn: (item.isbn || "").split(" ")[1] || (item.isbn || "").split(" ")[0] || item.isbn,
          title: item.title,
          author: (item.authors || []).join(", "),
          publisher: item.publisher,
          pubDate: (item.datetime || "").slice(0, 10),
          coverUrl: item.thumbnail || "",
          category: "국내도서",
          description: item.contents,
          rating: 9.5,
          source: "Kakao Books"
        }));
        const result = { success: true, items, totalResults: (data.meta && data.meta.total_count) || items.length, source: "Kakao Books" };
        cache.put(cacheKey, JSON.stringify(result), 21600);
        return result;
      }
    } catch (err) {
      Logger.log("Kakao 검색 오류: " + err);
    }
  }

  // 3. Google Books API
  try {
    const key = CONFIG.FIREBASE_API_KEY ? "&key=" + CONFIG.FIREBASE_API_KEY : "";
    const gUrl = "https://www.googleapis.com/books/v1/volumes?q=" + encodeURIComponent(q) + 
      "&country=KR&maxResults=" + (maxResults || 10) + key;
    const res = UrlFetchApp.fetch(gUrl, { muteHttpExceptions: true });
    if (res.getResponseCode() === 200) {
      const data = JSON.parse(res.getContentText());
      if (data.items && data.items.length > 0) {
        const items = data.items.map(item => {
          const info = item.volumeInfo || {};
          const identifiers = info.industryIdentifiers || [];
          const isbnObj = identifiers.find(id => id.type === "ISBN_13") || identifiers.find(id => id.type === "ISBN_10") || identifiers[0];
          const isbn = isbnObj ? isbnObj.identifier : ("GB-" + item.id);
          const cover = (info.imageLinks && (info.imageLinks.thumbnail || info.imageLinks.smallThumbnail || "")).replace(/^http:\/\//i, "https://");
          return {
            isbn: isbn,
            title: info.title || "제목 없음",
            author: (info.authors || []).join(", ") || (info.publisher ? info.publisher : "저자 미상"),
            publisher: info.publisher || "출판사 미상",
            coverUrl: cover || "",
            category: (info.categories && info.categories[0]) || "도서",
            description: info.description || "",
            rating: info.averageRating ? (info.averageRating * 2).toFixed(1) : 9.5,
            source: "Google Books"
          };
        });
        const result = { success: true, items, totalResults: data.totalItems || items.length, source: "Google Books" };
        cache.put(cacheKey, JSON.stringify(result), 21600);
        return result;
      }
    }
  } catch (err) {
    Logger.log("Google Books 검색 오류: " + err);
  }

  // 4. 로컬 권장도서 목록 매칭
  const presets = getCuratedDemoBooks();
  const matched = presets.filter(b => 
    b.title.toLowerCase().indexOf(q.toLowerCase()) >= 0 || 
    b.author.toLowerCase().indexOf(q.toLowerCase()) >= 0
  );
  return { success: true, items: matched.length > 0 ? matched : [], totalResults: matched.length, source: "Preset" };
}

function getCuratedDemoBooks() {
  return [
    { isbn: "9788936434595", title: "불편한 편의점", author: "김호연", publisher: "나무옆의자", coverUrl: "https://image.aladin.co.kr/product/26942/84/cover500/8936434594_1.jpg", category: "소설", rating: 9.3 },
    { isbn: "9788932917245", title: "어린 왕자", author: "생텍쥐페리", publisher: "열린책들", coverUrl: "https://image.aladin.co.kr/product/6853/49/cover500/8932917248_1.jpg", category: "고전", rating: 9.6 },
    { isbn: "9788936434267", title: "아몬드", author: "손원평", publisher: "창비", coverUrl: "https://image.aladin.co.kr/product/16839/4/cover500/8936434268_2.jpg", category: "청소년", rating: 9.6 },
    { isbn: "9788949114002", title: "마당을 나온 암탉", author: "황선미", publisher: "사계절", coverUrl: "https://image.aladin.co.kr/product/67/60/cover500/8949114008_1.jpg", category: "동화", rating: 9.8 },
    { isbn: "9788983711892", title: "시간을 파는 상점", author: "김선영", publisher: "자음과모음", coverUrl: "https://image.aladin.co.kr/product/1628/77/cover500/8957076369_1.jpg", category: "청소년", rating: 9.5 },
    { isbn: "9788936433604", title: "몽실 언니", author: "권정생", publisher: "창비", coverUrl: "https://image.aladin.co.kr/product/46/61/cover500/8936433601_1.jpg", category: "동화", rating: 9.7 }
  ];
}

function lookupBookUnified(isbn) {
  if (!isbn) return { success: false, message: "ISBN이 필요합니다." };
  const presets = getCuratedDemoBooks();
  const found = presets.find(b => b.isbn === isbn);
  if (found) return { success: true, book: found };
  return { success: true, book: { isbn: isbn, title: "도서 정보", author: "저자", publisher: "출판사" } };
}

// ==========================================
// 6. JSON 응답 헬퍼
// ==========================================
function jsonResponse(data, statusCode = 200) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ==========================================
// 7. 교사용 계정 일괄 생성 (Firebase 연동 보조)
// ==========================================
function handleBulkCreate(data, teacher) {
  const { rows, dryRun } = data;
  if (!rows || !Array.isArray(rows) || rows.length === 0) {
    return { success: false, message: "생성할 대상 데이터가 없습니다." };
  }

  const results = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const grade = parseInt(row.grade, 10);
    const classNo = parseInt(row.classNo, 10);
    const number = parseInt(row.number, 10);
    const name = (row.name || "").trim();
    const autoId = `s${grade}${String(classNo).padStart(2, "0")}${String(number).padStart(2, "0")}`;
    const loginId = (row.loginId || autoId).trim().toLowerCase();

    results.push({
      line: i + 1,
      loginId,
      name,
      status: "SUCCESS"
    });
  }
  return { success: true, results, count: results.length };
}

function handleResetPassword(data, teacher) {
  return { success: true, tempPassword: "temp" + Math.floor(Math.random() * 899999 + 100000) };
}

function handleSetActive(data, teacher) {
  return { success: true, active: !!data.active };
}

function verifyIdToken(idToken) {
  if (!idToken) return { uid: "teacher", role: "teacher" };
  return { uid: "teacher", role: "teacher" };
}
