/**
 * 책마을 : 우리 반 독서 빌리지 — Google Apps Script 백엔드 (Code.gs)
 * 
 * 주요 기능:
 * 1. 시트 자동 초기화 (initDatabase)
 * 2. SHA-256 인증 및 토큰 관리 (교사/학생)
 * 3. 알라딘 Open API 프록시 (ItemSearch, ItemLookUp) 및 Books 시트 캐싱
 * 4. 5대 소통 활동 CRUD (한 줄 피드, 책 꼬리잇기, 블라인드 북, 가상 인터뷰, 독서나무)
 * 5. 교사 관리자 기능 (학생 일괄등록, 초기화, 게시물 관리, 통계)
 */

// ==========================================
// 1. 전역 설정 및 시트 헬퍼
// ==========================================
const SPREADSHEET_ID = SpreadsheetApp.getActiveSpreadsheet() ? SpreadsheetApp.getActiveSpreadsheet().getId() : "";

const SHEET_NAMES = {
  USERS: "Users",
  BOOKS: "Books",
  RECORDS: "Records",
  CONNECTIONS: "Connections",
  BLIND_STATUS: "BlindStatus",
  COMMENTS: "Comments",
  REACTIONS: "Reactions",
  CLASS_TREE: "ClassTree"
};

function getDb() {
  return SpreadsheetApp.getActiveSpreadsheet();
}

function getSheet(name) {
  const ss = getDb();
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }
  return sheet;
}

// ==========================================
// 2. 데이터베이스(시트) 자동 초기화
// ==========================================
function initDatabase() {
  const ss = getDb();

  const schemas = {
    [SHEET_NAMES.USERS]: [
      "userId", "name", "classId", "number", "pwHash", "role", "token", "tokenExpires", "treeLevel", "totalLeaves", "totalFruits", "badges", "createdAt"
    ],
    [SHEET_NAMES.BOOKS]: [
      "isbn", "title", "author", "publisher", "pubDate", "coverUrl", "category", "description", "aladinRating", "cachedAt"
    ],
    [SHEET_NAMES.RECORDS]: [
      "recordId", "userId", "userName", "classId", "isbn", "type", "title", "content", "question", "quote", "characterName", "rating", "emotionTag", "isDeleted", "createdAt"
    ],
    [SHEET_NAMES.CONNECTIONS]: [
      "connectionId", "fromRecordId", "toRecordId", "reasonKeyword", "reasonText", "createdUserId", "createdAt"
    ],
    [SHEET_NAMES.BLIND_STATUS]: [
      "recordId", "revealed", "threshold", "currentCommentCount", "revealedAt"
    ],
    [SHEET_NAMES.COMMENTS]: [
      "commentId", "recordId", "userId", "userName", "content", "parentCommentId", "roleType", "isDeleted", "createdAt"
    ],
    [SHEET_NAMES.REACTIONS]: [
      "reactionId", "recordId", "userId", "type", "createdAt"
    ],
    [SHEET_NAMES.CLASS_TREE]: [
      "classId", "className", "totalLeaves", "totalFruits", "treeStage", "lastWateredAt"
    ]
  };

  for (const [sheetName, headers] of Object.entries(schemas)) {
    let sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      sheet.appendRow(headers);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#e9f5ed");
      sheet.setFrozenRows(1);
    } else if (sheet.getLastRow() === 0) {
      sheet.appendRow(headers);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#e9f5ed");
      sheet.setFrozenRows(1);
    }
  }

  // 기본 교사 관리자 계정 생성 (없을 경우)
  const usersSheet = getSheet(SHEET_NAMES.USERS);
  const usersData = usersSheet.getDataRange().getValues();
  let hasTeacher = false;
  for (let i = 1; i < usersData.length; i++) {
    if (usersData[i][0] === "teacher") {
      hasTeacher = true;
      break;
    }
  }

  if (!hasTeacher) {
    const adminPwHash = hashPassword("admin1234");
    usersSheet.appendRow([
      "teacher", "담임선생님", "1반", 0, adminPwHash, "teacher", "", "", 1, 0, 0, JSON.stringify(["마을촌장"]), new Date().toISOString()
    ]);
  }

  // 기본 학급 나무 생성 (없을 경우)
  const classTreeSheet = getSheet(SHEET_NAMES.CLASS_TREE);
  if (classTreeSheet.getLastRow() <= 1) {
    classTreeSheet.appendRow(["1반", "햇살 1반", 0, 0, 1, new Date().toISOString()]);
  }

  return { success: true, message: "데이터베이스 초기화가 성공적으로 완료되었습니다." };
}

// ==========================================
// 3. 보안 및 인증 (Hashing & Token)
// ==========================================
function hashPassword(password) {
  const rawHash = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(password), Utilities.Charset.UTF_8);
  let txtHash = "";
  for (let i = 0; i < rawHash.length; i++) {
    let hashVal = rawHash[i];
    if (hashVal < 0) hashVal += 256;
    let byteString = hashVal.toString(16);
    if (byteString.length === 1) byteString = "0" + byteString;
    txtHash += byteString;
  }
  return txtHash;
}

function generateToken() {
  return Utilities.getUuid().replace(/-/g, "") + Math.random().toString(36).substring(2, 10);
}

function sanitizeText(str) {
  if (!str || typeof str !== "string") return str;
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function findUserByToken(token) {
  if (!token) return null;
  const sheet = getSheet(SHEET_NAMES.USERS);
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (row[6] === token) { // token column
      const expires = new Date(row[7]);
      if (expires > new Date()) {
        return {
          rowIndex: i + 1,
          userId: row[0],
          name: row[1],
          classId: row[2],
          number: row[3],
          role: row[5],
          treeLevel: row[8],
          totalLeaves: row[9],
          totalFruits: row[10],
          badges: row[11] ? JSON.parse(row[11]) : []
        };
      }
    }
  }
  return null;
}

// ==========================================
// 4. 알라딘 Open API 프록시 & 캐시
// ==========================================
function getAladinKey() {
  const props = PropertiesService.getScriptProperties();
  let key = props.getProperty("ALADIN_TTB_KEY");
  if (!key) {
    key = "ttbtest"; // 테스트용 기본 키
  }
  return key;
}

function setAladinKey(key) {
  PropertiesService.getScriptProperties().setProperty("ALADIN_TTB_KEY", key);
  return { success: true, message: "알라딘 TTBKey가 저장되었습니다." };
}

function searchAladinBooks(query, searchTarget, startPage) {
  if (!query) return { success: false, message: "검색어를 입력해주세요." };
  const ttbKey = getAladinKey();
  const target = searchTarget || "Book";
  const start = startPage || 1;
  const url = "https://www.aladin.co.kr/ttb/api/ItemSearch.aspx?ttbkey=" + ttbKey + "&Query=" + encodeURIComponent(query) + "&QueryType=Title&MaxResults=15&start=" + start + "&SearchTarget=" + target + "&output=js&Version=20131101&Cover=Big";

  try {
    const res = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    const jsonStr = res.getContentText();
    let data;
    try {
      data = JSON.parse(jsonStr);
    } catch (e) {
      return { success: false, message: "알라딘 API 응답 파싱 실패", raw: jsonStr };
    }

    if (!data.item) {
      return { success: true, items: [], totalResults: 0 };
    }

    // Books 시트에 캐싱
    cacheBooks(data.item);

    const formattedItems = data.item.map(function(item) {
      return {
        isbn: item.isbn13 || item.isbn,
        title: item.title,
        author: item.author,
        publisher: item.publisher,
        pubDate: item.pubDate,
        coverUrl: item.cover,
        category: item.categoryName,
        description: item.description,
        aladinRating: item.customerReviewRank || 0
      };
    });

    return { success: true, items: formattedItems, totalResults: data.totalResults };
  } catch (err) {
    return { success: false, message: "알라딘 검색 오류: " + err.toString() };
  }
}

function getAladinBookDetail(isbn) {
  if (!isbn) return { success: false, message: "ISBN이 필요합니다." };

  // 1. 시트 캐시 먼저 조회
  const booksSheet = getSheet(SHEET_NAMES.BOOKS);
  const data = booksSheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(isbn)) {
      return {
        success: true,
        book: {
          isbn: data[i][0],
          title: data[i][1],
          author: data[i][2],
          publisher: data[i][3],
          pubDate: data[i][4],
          coverUrl: data[i][5],
          category: data[i][6],
          description: data[i][7],
          aladinRating: data[i][8]
        },
        fromCache: true
      };
    }
  }

  // 2. 캐시에 없으면 API 호출
  const ttbKey = getAladinKey();
  const url = "https://www.aladin.co.kr/ttb/api/ItemLookUp.aspx?ttbkey=" + ttbKey + "&itemIdType=ISBN13&ItemId=" + isbn + "&output=js&Version=20131101&Cover=Big";

  try {
    const res = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    const data = JSON.parse(res.getContentText());
    if (data.item && data.item.length > 0) {
      const item = data.item[0];
      const bookObj = {
        isbn: item.isbn13 || item.isbn,
        title: item.title,
        author: item.author,
        publisher: item.publisher,
        pubDate: item.pubDate,
        coverUrl: item.cover,
        category: item.categoryName,
        description: item.description,
        aladinRating: item.customerReviewRank || 0
      };
      cacheBooks([item]);
      return { success: true, book: bookObj, fromCache: false };
    }
    return { success: false, message: "도서 정보를 찾을 수 없습니다." };
  } catch (err) {
    return { success: false, message: "도서 상세 조회 오류: " + err.toString() };
  }
}

function cacheBooks(items) {
  if (!items || items.length === 0) return;
  const sheet = getSheet(SHEET_NAMES.BOOKS);
  const data = sheet.getDataRange().getValues();
  const existingIsbns = {};
  for (let i = 1; i < data.length; i++) {
    existingIsbns[String(data[i][0])] = true;
  }

  items.forEach(function(item) {
    const isbn = String(item.isbn13 || item.isbn);
    if (isbn && !existingIsbns[isbn]) {
      sheet.appendRow([
        isbn,
        item.title || "",
        item.author || "",
        item.publisher || "",
        item.pubDate || "",
        item.cover || "",
        item.categoryName || "",
        item.description || "",
        item.customerReviewRank || 0,
        new Date().toISOString()
      ]);
      existingIsbns[isbn] = true;
    }
  });
}

// ==========================================
// 5. 비즈니스 로직 및 핸들러
// ==========================================

// 5.1 로그인 & 인증
function handleLogin(payload) {
  const userId = payload.userId;
  const password = payload.password;
  if (!userId || !password) return { success: false, message: "아이디와 비밀번호를 입력해주세요." };

  const sheet = getSheet(SHEET_NAMES.USERS);
  const data = sheet.getDataRange().getValues();
  const inputHash = hashPassword(password);

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (String(row[0]) === String(userId)) {
      if (row[4] === inputHash) {
        const token = generateToken();
        const expires = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7); // 7일 유지
        sheet.getRange(i + 1, 7).setValue(token);
        sheet.getRange(i + 1, 8).setValue(expires.toISOString());

        return {
          success: true,
          user: {
            userId: row[0],
            name: row[1],
            classId: row[2],
            number: row[3],
            role: row[5],
            treeLevel: row[8],
            totalLeaves: row[9],
            totalFruits: row[10],
            badges: row[11] ? JSON.parse(row[11]) : []
          },
          token: token
        };
      } else {
        return { success: false, message: "비밀번호가 일치하지 않습니다." };
      }
    }
  }
  return { success: false, message: "존재하지 않는 사용자입니다." };
}

// 5.2 독서 기록 생성 (피드/블라인드/릴레이/인터뷰)
function handleCreateRecord(user, payload) {
  const type = payload.type;
  const isbn = payload.isbn;
  const title = payload.title;
  const content = payload.content;
  const question = payload.question;
  const quote = payload.quote;
  const characterName = payload.characterName;
  const rating = payload.rating;
  const emotionTag = payload.emotionTag;
  const relayFromRecordId = payload.relayFromRecordId;
  const relayReasonKeyword = payload.relayReasonKeyword;
  const relayReasonText = payload.relayReasonText;
  const blindThreshold = payload.blindThreshold;

  if (!isbn || !content) {
    return { success: false, message: "도서 및 내용을 입력해주세요." };
  }

  const recordId = "rec_" + Utilities.getUuid().substring(0, 8);
  const recordsSheet = getSheet(SHEET_NAMES.RECORDS);
  const now = new Date().toISOString();

  recordsSheet.appendRow([
    recordId,
    user.userId,
    user.name,
    user.classId,
    isbn,
    type || "feed",
    sanitizeText(title || ""),
    sanitizeText(content),
    sanitizeText(question || ""),
    sanitizeText(quote || ""),
    sanitizeText(characterName || ""),
    Number(rating) || 5,
    sanitizeText(emotionTag || "기쁨"),
    "N", // isDeleted
    now
  ]);

  // 블라인드 북일 경우 상태 등록
  if (type === "blind") {
    const blindSheet = getSheet(SHEET_NAMES.BLIND_STATUS);
    const threshold = Number(blindThreshold) || 3;
    blindSheet.appendRow([recordId, "N", threshold, 0, ""]);
  }

  // 릴레이 연결 관계 등록
  if (type === "relay" && relayFromRecordId) {
    const connSheet = getSheet(SHEET_NAMES.CONNECTIONS);
    const connId = "conn_" + Utilities.getUuid().substring(0, 8);
    connSheet.appendRow([
      connId,
      relayFromRecordId,
      recordId,
      sanitizeText(relayReasonKeyword || "주제연결"),
      sanitizeText(relayReasonText || ""),
      user.userId,
      now
    ]);
  }

  // 개인 나무 & 학급 나무 성장 반영
  growTree(user.userId, user.classId);

  return { success: true, recordId: recordId, message: "기록이 등록되었습니다!" };
}

function growTree(userId, classId) {
  // 개인 나무 성장
  const usersSheet = getSheet(SHEET_NAMES.USERS);
  const usersData = usersSheet.getDataRange().getValues();
  for (let i = 1; i < usersData.length; i++) {
    if (String(usersData[i][0]) === String(userId)) {
      let leaves = Number(usersData[i][9]) + 1;
      let fruits = Number(usersData[i][10]);
      let level = Math.floor(leaves / 3) + 1;
      if (leaves % 5 === 0) fruits += 1;

      usersSheet.getRange(i + 1, 9).setValue(level);
      usersSheet.getRange(i + 1, 10).setValue(leaves);
      usersSheet.getRange(i + 1, 11).setValue(fruits);
      break;
    }
  }

  // 학급 나무 성장
  const treeSheet = getSheet(SHEET_NAMES.CLASS_TREE);
  const treeData = treeSheet.getDataRange().getValues();
  for (let i = 1; i < treeData.length; i++) {
    if (String(treeData[i][0]) === String(classId)) {
      let totalLeaves = Number(treeData[i][2]) + 1;
      let totalFruits = Number(treeData[i][3]);
      if (totalLeaves % 5 === 0) totalFruits += 1;
      let stage = Math.min(5, Math.floor(totalLeaves / 10) + 1);

      treeSheet.getRange(i + 1, 3).setValue(totalLeaves);
      treeSheet.getRange(i + 1, 4).setValue(totalFruits);
      treeSheet.getRange(i + 1, 5).setValue(stage);
      treeSheet.getRange(i + 1, 6).setValue(new Date().toISOString());
      break;
    }
  }
}

// 5.3 기록 목록 조회
function handleGetRecords(payload) {
  const type = payload.type;
  const classId = payload.classId;
  const isbn = payload.isbn;
  const userId = payload.userId;
  const limit = payload.limit || 50;

  const recordsSheet = getSheet(SHEET_NAMES.RECORDS);
  const recordsData = recordsSheet.getDataRange().getValues();
  if (recordsData.length <= 1) return { success: true, records: [] };

  const booksSheet = getSheet(SHEET_NAMES.BOOKS);
  const booksData = booksSheet.getDataRange().getValues();
  const bookMap = {};
  for (let i = 1; i < booksData.length; i++) {
    bookMap[String(booksData[i][0])] = {
      title: booksData[i][1],
      author: booksData[i][2],
      publisher: booksData[i][3],
      coverUrl: booksData[i][5],
      category: booksData[i][6],
      aladinRating: booksData[i][8]
    };
  }

  const blindSheet = getSheet(SHEET_NAMES.BLIND_STATUS);
  const blindData = blindSheet.getDataRange().getValues();
  const blindMap = {};
  for (let i = 1; i < blindData.length; i++) {
    blindMap[String(blindData[i][0])] = {
      revealed: blindData[i][1] === "Y",
      threshold: blindData[i][2],
      currentCount: blindData[i][3]
    };
  }

  const results = [];
  for (let i = recordsData.length - 1; i >= 1; i--) {
    const row = recordsData[i];
    if (row[13] === "Y") continue; // isDeleted

    if (type && row[5] !== type) continue;
    if (classId && row[3] !== classId) continue;
    if (isbn && String(row[4]) !== String(isbn)) continue;
    if (userId && String(row[1]) !== String(userId)) continue;

    const recId = row[0];
    const recType = row[5];
    const recIsbn = String(row[4]);
    const book = bookMap[recIsbn] || { title: "도서 정보 없음", coverUrl: "" };
    const blindInfo = blindMap[recId] || null;

    let isRevealed = true;
    if (recType === "blind" && blindInfo) {
      isRevealed = blindInfo.revealed;
    }

    results.push({
      recordId: recId,
      userId: row[1],
      userName: row[2],
      classId: row[3],
      isbn: isRevealed ? recIsbn : "HIDDEN",
      book: isRevealed ? book : { title: "??? 비밀 도서 ???", coverUrl: "", author: "베일에 싸인 작가" },
      type: recType,
      title: row[6],
      content: row[7],
      question: row[8],
      quote: row[9],
      characterName: row[10],
      rating: row[11],
      emotionTag: row[12],
      blindInfo: blindInfo,
      createdAt: row[14]
    });

    if (results.length >= limit) break;
  }

  return { success: true, records: results };
}

// 5.4 댓글 등록 및 블라인드 해금 처리
function handleAddComment(user, payload) {
  const recordId = payload.recordId;
  const content = payload.content;
  const roleType = payload.roleType;
  const parentCommentId = payload.parentCommentId;

  if (!recordId || !content) return { success: false, message: "댓글 내용을 입력해주세요." };

  const commentsSheet = getSheet(SHEET_NAMES.COMMENTS);
  const commentId = "cmt_" + Utilities.getUuid().substring(0, 8);
  const now = new Date().toISOString();

  commentsSheet.appendRow([
    commentId,
    recordId,
    user.userId,
    user.name,
    sanitizeText(content),
    parentCommentId || "",
    roleType || "student",
    "N",
    now
  ]);

  // 블라인드 북 댓글 카운트 및 해금 체크
  let justRevealed = false;
  const blindSheet = getSheet(SHEET_NAMES.BLIND_STATUS);
  const blindData = blindSheet.getDataRange().getValues();
  for (let i = 1; i < blindData.length; i++) {
    if (blindData[i][0] === recordId) {
      let count = Number(blindData[i][3]) + 1;
      let threshold = Number(blindData[i][2]);
      let revealed = blindData[i][1];

      blindSheet.getRange(i + 1, 4).setValue(count);
      if (revealed !== "Y" && count >= threshold) {
        blindSheet.getRange(i + 1, 2).setValue("Y");
        blindSheet.getRange(i + 1, 5).setValue(now);
        justRevealed = true;
      }
      break;
    }
  }

  return { success: true, commentId: commentId, justRevealed: justRevealed, message: "댓글이 등록되었습니다." };
}

// 5.5 댓글 목록 조회
function handleGetComments(payload) {
  const recordId = payload.recordId;
  if (!recordId) return { success: false, message: "recordId가 필요합니다." };

  const commentsSheet = getSheet(SHEET_NAMES.COMMENTS);
  const data = commentsSheet.getDataRange().getValues();
  const results = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (row[1] === recordId && row[7] !== "Y") { // isDeleted 체크
      results.push({
        commentId: row[0],
        recordId: row[1],
        userId: row[2],
        userName: row[3],
        content: row[4],
        parentCommentId: row[5],
        roleType: row[6],
        createdAt: row[8]
      });
    }
  }

  return { success: true, comments: results };
}

// 5.6 반응 (공감, 위시리스트, 구절좋아요) 토글
function handleToggleReaction(user, payload) {
  const recordId = payload.recordId;
  const type = payload.type;
  if (!recordId || !type) return { success: false, message: "필수 정보가 누락되었습니다." };

  const sheet = getSheet(SHEET_NAMES.REACTIONS);
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][1] === recordId && String(data[i][2]) === String(user.userId) && data[i][3] === type) {
      sheet.deleteRow(i + 1);
      return { success: true, active: false, message: "반응이 취소되었습니다." };
    }
  }

  const reactionId = "rx_" + Utilities.getUuid().substring(0, 8);
  sheet.appendRow([reactionId, recordId, user.userId, type, new Date().toISOString()]);
  return { success: true, active: true, message: "반응이 등록되었습니다!" };
}

// 5.7 책 꼬리잇기 연결망 조회
function handleGetRelayGraph(payload) {
  const classId = payload.classId;
  const recordsRes = handleGetRecords({ type: "relay", classId: classId });
  const connSheet = getSheet(SHEET_NAMES.CONNECTIONS);
  const connData = connSheet.getDataRange().getValues();

  const links = [];
  for (let i = 1; i < connData.length; i++) {
    links.push({
      connectionId: connData[i][0],
      from: connData[i][1],
      to: connData[i][2],
      reasonKeyword: connData[i][3],
      reasonText: connData[i][4],
      userId: connData[i][5],
      createdAt: connData[i][6]
    });
  }

  return { success: true, nodes: recordsRes.records || [], links: links };
}

// 5.8 마을 및 학급 나무 현황 조회
function handleGetVillageStatus(payload) {
  const classId = payload.classId || "1반";
  const treeSheet = getSheet(SHEET_NAMES.CLASS_TREE);
  const treeData = treeSheet.getDataRange().getValues();
  let classTree = { classId: classId, className: classId, totalLeaves: 0, totalFruits: 0, treeStage: 1 };

  for (let i = 1; i < treeData.length; i++) {
    if (String(treeData[i][0]) === String(classId)) {
      classTree = {
        classId: treeData[i][0],
        className: treeData[i][1],
        totalLeaves: treeData[i][2],
        totalFruits: treeData[i][3],
        treeStage: treeData[i][4],
        lastWateredAt: treeData[i][5]
      };
      break;
    }
  }

  const recentRecords = handleGetRecords({ classId: classId, limit: 5 });

  return {
    success: true,
    classTree: classTree,
    recentNews: recentRecords.records || []
  };
}

// 5.9 내 서재(마이룸) 조회
function handleGetMyRoom(user) {
  const userRecordRes = handleGetRecords({ userId: user.userId, limit: 100 });
  const records = userRecordRes.records || [];

  const rxSheet = getSheet(SHEET_NAMES.REACTIONS);
  const rxData = rxSheet.getDataRange().getValues();
  const wishRecordIds = {};
  for (let i = 1; i < rxData.length; i++) {
    if (String(rxData[i][2]) === String(user.userId) && rxData[i][3] === "wish") {
      wishRecordIds[String(rxData[i][1])] = true;
    }
  }

  const genreCount = {};
  records.forEach(function(r) {
    if (r.book && r.book.category) {
      const mainCat = r.book.category.split(">")[0].trim() || "기타";
      genreCount[mainCat] = (genreCount[mainCat] || 0) + 1;
    }
  });

  return {
    success: true,
    user: user,
    records: records,
    genreStats: genreCount,
    wishCount: Object.keys(wishRecordIds).length
  };
}

// 5.10 교사 관리자: 학생 일괄 등록
function handleBatchRegisterStudents(user, payload) {
  if (user.role !== "teacher") return { success: false, message: "교사 권한이 필요합니다." };
  const students = payload.students;
  const classId = payload.classId;
  if (!students || !Array.isArray(students)) return { success: false, message: "학생 목록이 올바르지 않습니다." };

  const sheet = getSheet(SHEET_NAMES.USERS);
  const data = sheet.getDataRange().getValues();
  const existingUsers = {};
  for (let i = 1; i < data.length; i++) {
    existingUsers[String(data[i][0])] = true;
  }
  let addedCount = 0;

  students.forEach(function(st) {
    const num = Number(st.number) || 0;
    const uid = String(st.userId || ("s" + (num < 10 ? "0" + num : num)));
    if (!existingUsers[uid]) {
      const pw = st.password || "1234";
      const pwHash = hashPassword(pw);
      sheet.appendRow([
        uid,
        st.name || "학생",
        classId || user.classId || "1반",
        num,
        pwHash,
        "student",
        "",
        "",
        1,
        0,
        0,
        JSON.stringify(["책마을입주민"]),
        new Date().toISOString()
      ]);
      existingUsers[uid] = true;
      addedCount++;
    }
  });

  return { success: true, addedCount: addedCount, message: addedCount + "명의 학생이 등록되었습니다." };
}

// 5.11 교사 관리자: 유해 게시글/댓글 삭제
function handleDeleteContent(user, payload) {
  if (user.role !== "teacher") return { success: false, message: "교사 권한이 필요합니다." };
  const contentType = payload.contentType;
  const id = payload.id;

  if (contentType === "record") {
    const sheet = getSheet(SHEET_NAMES.RECORDS);
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === id) {
        sheet.getRange(i + 1, 14).setValue("Y");
        return { success: true, message: "게시글이 삭제 처리되었습니다." };
      }
    }
  } else if (contentType === "comment") {
    const sheet = getSheet(SHEET_NAMES.COMMENTS);
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === id) {
        sheet.getRange(i + 1, 8).setValue("Y");
        return { success: true, message: "댓글이 삭제 처리되었습니다." };
      }
    }
  }

  return { success: false, message: "항목을 찾을 수 없습니다." };
}

// 5.12 교사 관리자: 학급 통계 조회
function handleGetClassStatistics(user, payload) {
  if (user.role !== "teacher") return { success: false, message: "교사 권한이 필요합니다." };
  const classId = payload.classId || user.classId || "1반";

  const usersSheet = getSheet(SHEET_NAMES.USERS);
  const usersData = usersSheet.getDataRange().getValues();
  const studentList = [];

  for (let i = 1; i < usersData.length; i++) {
    if (usersData[i][2] === classId && usersData[i][5] === "student") {
      studentList.push({
        userId: usersData[i][0],
        name: usersData[i][1],
        number: usersData[i][3],
        treeLevel: usersData[i][8],
        leaves: usersData[i][9],
        fruits: usersData[i][10]
      });
    }
  }

  studentList.sort(function(a, b) { return b.leaves - a.leaves; });

  return {
    success: true,
    classId: classId,
    totalStudents: studentList.length,
    ranking: studentList
  };
}

// ==========================================
// 6. 메인 진입점 (doPost / doGet Router)
// ==========================================
function doPost(e) {
  try {
    const contents = e.postData ? e.postData.contents : "{}";
    const request = JSON.parse(contents);
    const action = request.action;
    const token = request.token;
    const payload = request.payload || {};

    // 인증 불필요 액션
    if (action === "login") {
      return jsonResponse(handleLogin(payload));
    }
    if (action === "initDb") {
      return jsonResponse(initDatabase());
    }
    if (action === "searchAladin") {
      return jsonResponse(searchAladinBooks(payload.query, payload.searchTarget, payload.startPage));
    }
    if (action === "getBookDetail") {
      return jsonResponse(getAladinBookDetail(payload.isbn));
    }
    if (action === "getVillageStatus") {
      return jsonResponse(handleGetVillageStatus(payload));
    }
    if (action === "getRecords") {
      return jsonResponse(handleGetRecords(payload));
    }
    if (action === "getComments") {
      return jsonResponse(handleGetComments(payload));
    }
    if (action === "getRelayGraph") {
      return jsonResponse(handleGetRelayGraph(payload));
    }

    // 인증 필요 액션
    const user = findUserByToken(token);
    if (!user) {
      return jsonResponse({ success: false, code: "UNAUTHORIZED", message: "로그인이 필요하거나 세션이 만료되었습니다." });
    }

    switch (action) {
      case "createRecord":
        return jsonResponse(handleCreateRecord(user, payload));
      case "addComment":
        return jsonResponse(handleAddComment(user, payload));
      case "toggleReaction":
        return jsonResponse(handleToggleReaction(user, payload));
      case "getMyRoom":
        return jsonResponse(handleGetMyRoom(user));
      case "batchRegisterStudents":
        return jsonResponse(handleBatchRegisterStudents(user, payload));
      case "deleteContent":
        return jsonResponse(handleDeleteContent(user, payload));
      case "getClassStatistics":
        return jsonResponse(handleGetClassStatistics(user, payload));
      case "setAladinKey":
        if (user.role !== "teacher") return jsonResponse({ success: false, message: "교사 권한이 필요합니다." });
        return jsonResponse(setAladinKey(payload.key));
      default:
        return jsonResponse({ success: false, message: "알 수 없는 요청 액션: " + action });
    }
  } catch (err) {
    return jsonResponse({ success: false, message: "서버 내부 오류: " + err.toString() });
  }
}

function doGet(e) {
  const action = e.parameter ? e.parameter.action : "";
  if (action === "init") {
    return jsonResponse(initDatabase());
  }
  return jsonResponse({
    success: true,
    status: "online",
    service: "책마을 독서 빌리지 API Gateway",
    version: "1.0.0",
    time: new Date().toISOString()
  });
}

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
