/**
 * 책마을 통합 백엔드 스크립트 (Code.gs)
 * - 단일 배포용 (GAS 웹 앱 1개로 전 기능 지원)
 * - 기능 1: 알라딘 Open API 도서 검색/상세 프록시 (CacheService 고속 캐시)
 * - 기능 2: 교사용 관리 게이트웨이 (Firebase Auth 계정 일괄 생성, 커스텀 클레임, 비밀번호 재설정)
 * - 기능 3: Firebase 미사용 시 로컬 시트 호환 (하위 호환 지원)
 */

// ==========================================
// 1. 설정 및 프로퍼티
// ==========================================
const CONFIG = {
  // 의사 이메일 가상 도메인
  AUTH_DOMAIN: "village.local",

  // 스크립트 속성 접근자
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
// 2. HTTP 요청 라우팅 (GET / POST)
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

  // 1) 통합 도서 검색 라우트 (Google Books, Naver, Kakao, Aladin 및 로컬 폴백)
  if (action === "search" || action === "searchBooks" || action === "searchAladin") {
    return jsonResponse(searchBooksUnified(query, params.start || 1, params.maxResults || 10));
  }
  if (action === "lookup" || action === "detail") {
    return jsonResponse(lookupBookUnified(params.isbn || payload.isbn));
  }

  // 2) 교사용 관리자 계정 생성 및 관리 라우트 (LockService 적용)
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

  // 3) 관리자 부트스트랩 안내
  if (action === "bootstrap") {
    return jsonResponse({ success: false, message: "bootstrap은 GAS 편집기에서 직접 실행하세요." }, 403);
  }

  return jsonResponse({ success: false, message: `지원되지 않는 action입니다: ${action}` }, 400);
}

// ==========================================
// 3. 통합 도서 검색 로직 (Naver / Kakao / Google / Aladin / Local Fallback)
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

  // 1. 네이버 도서 검색 (NAVER_CLIENT_ID & NAVER_CLIENT_SECRET 설정 시)
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

  // 2. 카카오(다음) 책 검색 (KAKAO_REST_KEY 설정 시)
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

  // 3. Google Books API (FIREBASE_API_KEY 또는 공용 키)
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

// 구 버전 호환용 alias
function searchAladin(query, start, maxResults) {
  return searchBooksUnified(query, start, maxResults);
}

function lookupAladin(isbn) {
  return lookupBookUnified(isbn);
}

// ==========================================
// 4. 교사용 계정 일괄 생성 및 관리 로직
// ==========================================
function handleBulkCreate(data, teacher) {
  const { rows, dryRun } = data;
  if (!rows || !Array.isArray(rows) || rows.length === 0) {
    return { success: false, message: "생성할 대상 데이터가 없습니다." };
  }

  if (rows.length > 50) {
    return { success: false, message: "한 번에 최대 50명까지만 일괄 생성 가능합니다." };
  }

  const results = [];
  const accessToken = getServiceAccountAccessToken();

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const grade = parseInt(row.grade, 10);
    const classNo = parseInt(row.classNo, 10);
    const number = parseInt(row.number, 10);
    const name = (row.name || "").trim();
    const nickname = (row.nickname || name).trim();
    const role = row.role === "teacher" ? "teacher" : "student";

    const autoId = `s${grade}${String(classNo).padStart(2, "0")}${String(number).padStart(2, "0")}`;
    const loginId = (row.loginId || autoId).trim().toLowerCase();
    const email = `${loginId}@${CONFIG.AUTH_DOMAIN}`;
    const initialPw = row.initialPassword || generateRandomPassword(8);
    const classId = `${new Date().getFullYear()}-${grade}-${classNo}`;

    if (dryRun) {
      results.push({ line: i + 1, loginId, name, classId, status: "READY" });
      continue;
    }

    try {
      const authRes = createAuthUser(email, initialPw, name);
      if (!authRes.success) {
        results.push({ line: i + 1, loginId, name, status: "FAIL", error: authRes.error });
        continue;
      }

      const uid = authRes.uid;
      setCustomUserClaims(uid, { role, classId }, accessToken);

      const userProfile = {
        loginId,
        name,
        nickname,
        role,
        classId,
        grade,
        classNo,
        number,
        mustChangePw: true,
        active: true,
        avatar: { hair: 1, clothes: 1, skin: 1 },
        badges: ["first_step"],
        treeLevel: 1,
        createdAt: new Date().toISOString(),
        createdBy: teacher.uid
      };
      saveFirestoreDoc(`users/${uid}`, userProfile, accessToken);

      results.push({
        line: i + 1,
        loginId,
        name,
        nickname,
        initialPassword: initialPw,
        status: "SUCCESS"
      });
    } catch (createErr) {
      results.push({ line: i + 1, loginId, name, status: "FAIL", error: createErr.toString() });
    }
  }

  return { success: true, results, count: results.filter(r => r.status === "SUCCESS").length };
}

function handleResetPassword(data, teacher) {
  const { uid } = data;
  if (!uid) return { success: false, message: "UID가 필요합니다." };

  const accessToken = getServiceAccountAccessToken();
  const tempPw = generateRandomPassword(8);

  const url = `https://identitytoolkit.googleapis.com/v1/accounts:update?key=${CONFIG.FIREBASE_API_KEY}`;
  const res = UrlFetchApp.fetch(url, {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify({ localId: uid, password: tempPw, returnSecureToken: false }),
    headers: { Authorization: "Bearer " + accessToken },
    muteHttpExceptions: true
  });

  if (res.getResponseCode() !== 200) {
    return { success: false, message: "비밀번호 변경 실패: " + res.getContentText() };
  }

  patchFirestoreDoc(`users/${uid}`, { mustChangePw: true }, ["mustChangePw"], accessToken);
  return { success: true, tempPassword: tempPw };
}

function handleSetActive(data, teacher) {
  const { uid, active } = data;
  const accessToken = getServiceAccountAccessToken();
  patchFirestoreDoc(`users/${uid}`, { active: !!active }, ["active"], accessToken);
  return { success: true, active: !!active };
}

// ==========================================
// 5. Firebase REST API 헬퍼 함수
// ==========================================
function createAuthUser(email, password, displayName) {
  const url = `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${CONFIG.FIREBASE_API_KEY}`;
  const res = UrlFetchApp.fetch(url, {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify({ email, password, displayName, returnSecureToken: true }),
    muteHttpExceptions: true
  });

  const data = JSON.parse(res.getContentText());
  if (res.getResponseCode() === 200) {
    return { success: true, uid: data.localId };
  } else {
    return { success: false, error: (data.error && data.error.message) || "Auth 계정 생성 실패" };
  }
}

function setCustomUserClaims(uid, claims, accessToken) {
  const url = `https://identitytoolkit.googleapis.com/v1/projects/${CONFIG.PROJECT_ID}/accounts/${uid}:setCustomUserClaims`;
  UrlFetchApp.fetch(url, {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify({ customAttributes: JSON.stringify(claims) }),
    headers: { Authorization: "Bearer " + accessToken },
    muteHttpExceptions: true
  });
}

function verifyIdToken(idToken) {
  if (!idToken) return null;
  const url = `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${CONFIG.FIREBASE_API_KEY}`;
  const res = UrlFetchApp.fetch(url, {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify({ idToken }),
    muteHttpExceptions: true
  });

  if (res.getResponseCode() !== 200) return null;
  const data = JSON.parse(res.getContentText());
  if (!data.users || data.users.length === 0) return null;

  const user = data.users[0];
  const customAttributes = user.customAttributes ? JSON.parse(user.customAttributes) : {};
  return {
    uid: user.localId,
    email: user.email,
    role: customAttributes.role || "student",
    classId: customAttributes.classId || ""
  };
}

function saveFirestoreDoc(path, dataObj, accessToken) {
  const url = `https://firestore.googleapis.com/v1/projects/${CONFIG.PROJECT_ID}/databases/(default)/documents/${path}`;
  const fields = toFirestoreFields(dataObj);
  UrlFetchApp.fetch(url, {
    method: "patch",
    contentType: "application/json",
    payload: JSON.stringify({ fields }),
    headers: { Authorization: "Bearer " + accessToken },
    muteHttpExceptions: true
  });
}

function patchFirestoreDoc(path, dataObj, updateMaskFields, accessToken) {
  const maskQuery = updateMaskFields.map(f => "updateMask.fieldPaths=" + encodeURIComponent(f)).join("&");
  const url = `https://firestore.googleapis.com/v1/projects/${CONFIG.PROJECT_ID}/databases/(default)/documents/${path}?${maskQuery}`;
  const fields = toFirestoreFields(dataObj);
  UrlFetchApp.fetch(url, {
    method: "patch",
    contentType: "application/json",
    payload: JSON.stringify({ fields }),
    headers: { Authorization: "Bearer " + accessToken },
    muteHttpExceptions: true
  });
}

function toFirestoreFields(obj) {
  const fields = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === "string") {
      fields[key] = { stringValue: value };
    } else if (typeof value === "number") {
      fields[key] = Number.isInteger(value) ? { integerValue: value.toString() } : { doubleValue: value };
    } else if (typeof value === "boolean") {
      fields[key] = { booleanValue: value };
    } else if (Array.isArray(value)) {
      fields[key] = {
        arrayValue: {
          values: value.map(v => typeof v === "string" ? { stringValue: v } : { integerValue: v.toString() })
        }
      };
    } else if (value && typeof value === "object") {
      fields[key] = { mapValue: { fields: toFirestoreFields(value) } };
    }
  }
  return fields;
}

function getServiceAccountAccessToken() {
  const cache = CacheService.getScriptCache();
  const cachedToken = cache.get("SA_ACCESS_TOKEN");
  if (cachedToken) return cachedToken;

  const sa = CONFIG.SERVICE_ACCOUNT;
  if (!sa || !sa.private_key) {
    throw new Error("서비스 계정 키가 설정되지 않았습니다. Script Properties에 SERVICE_ACCOUNT_KEY를 등록하세요.");
  }

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claimSet = {
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/firebase https://www.googleapis.com/auth/datastore",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now
  };

  const toSign = Utilities.base64EncodeWebSafe(JSON.stringify(header)) + "." +
                 Utilities.base64EncodeWebSafe(JSON.stringify(claimSet));
  const signature = Utilities.computeRsaSha256Signature(toSign, sa.private_key);
  const jwt = toSign + "." + Utilities.base64EncodeWebSafe(signature);

  const res = UrlFetchApp.fetch("https://oauth2.googleapis.com/token", {
    method: "post",
    contentType: "application/x-www-form-urlencoded",
    payload: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
    muteHttpExceptions: true
  });

  const json = JSON.parse(res.getContentText());
  if (json.access_token) {
    cache.put("SA_ACCESS_TOKEN", json.access_token, 3500);
    return json.access_token;
  }
  throw new Error("서비스 계정 액세스 토큰 획득 실패: " + res.getContentText());
}

function generateRandomPassword(length) {
  const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function jsonResponse(data, statusCode = 200) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function bootstrapFirstAdmin() {
  const teacherUid = "ENTER_TEACHER_UID_FROM_FIREBASE_CONSOLE";
  const accessToken = getServiceAccountAccessToken();

  setCustomUserClaims(teacherUid, { role: "teacher", classId: "2026-3-1" }, accessToken);
  saveFirestoreDoc(`users/${teacherUid}`, {
    loginId: "teacher",
    name: "선생님",
    nickname: "선생님",
    role: "teacher",
    classId: "2026-3-1",
    mustChangePw: false,
    active: true,
    badges: ["master_teacher"],
    createdAt: new Date().toISOString()
  }, accessToken);

  Logger.log("최초 교사 권한 부여 완료!");
}
