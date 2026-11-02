/**
 * 책마을 통합 백엔드 스크립트 (Code.js)
 * - 단일 배포용 (GAS 웹 앱 1개로 전 기능 지원)
 * - 기능 1: 알라딘 Open API 도서 검색/상세 프록시 (CacheService 고속 캐시)
 * - 기능 2: 교사용 관리 게이트웨이 (Firebase Auth 계정 일괄 생성, 커스텀 클레임, 비밀번호 재설정)
 */

const CONFIG = {
  AUTH_DOMAIN: "village.local",
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
    return PropertiesService.getScriptProperties().getProperty("ALADIN_TTB_KEY") || "ttbsemyo05131234001";
  }
};

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

  // 1) 알라딘 프록시
  if (action === "search") {
    return jsonResponse(searchAladin(params.query, params.start || 1, params.maxResults || 10));
  }
  if (action === "lookup" || action === "detail") {
    return jsonResponse(lookupAladin(params.isbn));
  }

  // 2) 교사 관리자
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

  if (action === "bootstrap") {
    return jsonResponse({ success: false, message: "bootstrap은 GAS 편집기에서 직접 실행하세요." }, 403);
  }

  return jsonResponse({ success: false, message: `지원되지 않는 action입니다: ${action}` }, 400);
}

function searchAladin(query, start, maxResults) {
  if (!query || !query.trim()) {
    return { success: false, message: "검색어를 입력해주세요." };
  }

  const cacheKey = "SEARCH_" + encodeURIComponent(query.trim()) + "_" + start + "_" + maxResults;
  const cache = CacheService.getScriptCache();
  const cached = cache.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  const ttbKey = CONFIG.ALADIN_TTB_KEY;
  const url = "https://www.aladin.co.kr/ttb/api/ItemSearch.aspx?ttbkey=" + ttbKey +
    "&Query=" + encodeURIComponent(query.trim()) +
    "&QueryType=Keyword&MaxResults=" + (maxResults || 10) +
    "&start=" + (start || 1) +
    "&SearchTarget=Book&output=js&Version=20131101&Cover=Big";

  try {
    const res = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    let jsonStr = res.getContentText();
    if (jsonStr.indexOf(";") === jsonStr.length - 1) {
      jsonStr = jsonStr.substring(0, jsonStr.length - 1);
    }

    const data = JSON.parse(jsonStr);
    if (!data.item) {
      return { success: true, items: [], totalResults: 0 };
    }

    const items = data.item.map(item => ({
      isbn: item.isbn13 || item.isbn,
      title: item.title,
      author: item.author,
      publisher: item.publisher,
      pubDate: item.pubDate,
      coverUrl: item.cover,
      category: item.categoryName,
      description: item.description,
      aladinRating: item.customerReviewRank || 0
    }));

    const result = { success: true, items, totalResults: data.totalResults || items.length };
    cache.put(cacheKey, JSON.stringify(result), 21600);
    return result;
  } catch (err) {
    return { success: false, message: "알라딘 검색 오류: " + err.toString() };
  }
}

function lookupAladin(isbn) {
  if (!isbn) return { success: false, message: "ISBN이 필요합니다." };

  const cacheKey = "LOOKUP_" + isbn;
  const cache = CacheService.getScriptCache();
  const cached = cache.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  const ttbKey = CONFIG.ALADIN_TTB_KEY;
  const url = "https://www.aladin.co.kr/ttb/api/ItemLookUp.aspx?ttbkey=" + ttbKey +
    "&itemIdType=ISBN13&ItemId=" + isbn +
    "&output=js&Version=20131101&Cover=Big";

  try {
    const res = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    let jsonStr = res.getContentText();
    if (jsonStr.indexOf(";") === jsonStr.length - 1) {
      jsonStr = jsonStr.substring(0, jsonStr.length - 1);
    }

    const data = JSON.parse(jsonStr);
    if (data.item && data.item.length > 0) {
      const item = data.item[0];
      const book = {
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
      const result = { success: true, book };
      cache.put(cacheKey, JSON.stringify(result), 21600);
      return result;
    }
    return { success: false, message: "도서 정보를 찾을 수 없습니다." };
  } catch (err) {
    return { success: false, message: "도서 상세 조회 오류: " + err.toString() };
  }
}

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
