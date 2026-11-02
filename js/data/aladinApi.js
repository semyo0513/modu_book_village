/**
 * 알라딘 Open API 클라이언트 (aladinApi.js)
 * - GAS ① 알라딘 프록시와 직접 통신
 * - 엔드포인트 미설정 시 데모 도서 데이터 제공
 */

import { CONFIG } from "../config.js";

const DEMO_BOOKS = [
  {
    isbn: "9788936434267",
    title: "아몬드",
    author: "손원평 (지은이)",
    publisher: "창비",
    coverUrl: "https://image.aladin.co.kr/product/16839/4/cover500/8936434268_2.jpg",
    category: "국내도서>청소년>청소년 문학",
    description: "괴물이라 불린 소년의 특별한 성장 이야기.",
    aladinRating: 9.6
  },
  {
    isbn: "9788949114002",
    title: "마당을 나온 암탉",
    author: "황선미 (지은이)",
    publisher: "사계절",
    coverUrl: "https://image.aladin.co.kr/product/67/60/cover500/8949114008_1.jpg",
    category: "국내도서>어린이>동화",
    description: "양계장을 탈출해 꿈을 찾아 떠난 잎싹의 감동적인 모험.",
    aladinRating: 9.8
  },
  {
    isbn: "9788937460777",
    title: "어린 왕자",
    author: "앙투안 드 생텍쥐페리 (지은이)",
    publisher: "민음사",
    coverUrl: "https://image.aladin.co.kr/product/28/1/cover500/8937460778_1.jpg",
    category: "국내도서>소설/시/희곡>프랑스소설",
    description: "사막에 불시착한 조종사와 B612호 소행성에서 온 어린 왕자의 만남.",
    aladinRating: 9.5
  }
];

export const AladinApi = {
  async search(query, start = 1, maxResults = 10) {
    if (!query || !query.trim()) return { success: true, items: [] };

    const gasUrl = CONFIG.GAS_API_URL || CONFIG.GAS_ALADIN_URL;
    if (!gasUrl) {
      // 데모 모드: 검색어 매칭
      const matched = DEMO_BOOKS.filter(b => 
        b.title.includes(query) || b.author.includes(query) || b.publisher.includes(query)
      );
      return { success: true, items: matched.length > 0 ? matched : DEMO_BOOKS, totalResults: 3 };
    }

    try {
      const url = `${gasUrl}?action=search&query=${encodeURIComponent(query)}&start=${start}&maxResults=${maxResults}`;
      const res = await fetch(url);
      return await res.json();
    } catch (err) {
      console.error("알라딘 검색 실패:", err);
      return { success: false, message: "도서 검색 서버 통신 오류" };
    }
  },

  async lookup(isbn) {
    if (!isbn) return { success: false, message: "ISBN이 필요합니다." };

    const gasUrl = CONFIG.GAS_API_URL || CONFIG.GAS_ALADIN_URL;
    if (!gasUrl) {
      const found = DEMO_BOOKS.find(b => b.isbn === isbn);
      return found ? { success: true, book: found } : { success: false, message: "도서를 찾을 수 없습니다." };
    }

    try {
      const url = `${gasUrl}?action=lookup&isbn=${encodeURIComponent(isbn)}`;
      const res = await fetch(url);
      return await res.json();
    } catch (err) {
      console.error("알라딘 상세조회 실패:", err);
      return { success: false, message: "도서 상세 정보 통신 오류" };
    }
  }
};
