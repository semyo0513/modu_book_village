/**
 * 책마을 GAS ① 알라딘 Open API 프록시 (aladin-proxy)
 * - TTBKey 보안 보관 (Script Properties: ALADIN_TTB_KEY)
 * - CacheService 기반 도서 검색/상세 캐싱 (시트 의존 없음, 초고속 응답)
 * - 학생/교사 브라우저에서 직접 호출
 */

function getAladinKey() {
  const key = PropertiesService.getScriptProperties().getProperty("ALADIN_TTB_KEY");
  return key || "ttbsemyo05131234001"; // 기본 테스트 키
}

function doGet(e) {
  return handleRequest(e ? e.parameter : {});
}

function doPost(e) {
  let params = {};
  if (e && e.postData && e.postData.contents) {
    try {
      params = JSON.parse(e.postData.contents);
    } catch (err) {
      params = e.parameter || {};
    }
  } else if (e && e.parameter) {
    params = e.parameter;
  }
  return handleRequest(params);
}

function handleRequest(params) {
  const action = params.action;

  if (action === "search") {
    return jsonResponse(searchAladin(params.query, params.start || 1, params.maxResults || 10));
  } else if (action === "lookup" || action === "detail") {
    return jsonResponse(lookupAladin(params.isbn));
  }

  return jsonResponse({ success: false, message: "올바른 action(search, lookup)을 지정하세요." });
}

function searchAladin(query, start, maxResults) {
  if (!query || query.trim().length === 0) {
    return { success: false, message: "검색어를 입력해주세요." };
  }

  const cacheKey = "SEARCH_" + encodeURIComponent(query.trim()) + "_" + start + "_" + maxResults;
  const cache = CacheService.getScriptCache();
  const cached = cache.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  const ttbKey = getAladinKey();
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
    // 6시간 캐싱 (21600초)
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

  const ttbKey = getAladinKey();
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

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
