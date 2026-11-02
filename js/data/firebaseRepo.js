/**
 * Firebase Firestore & Auth 저장소 구현체 (firebaseRepo.js)
 * - Firebase v10 Modular SDK 사용
 * - 읽기 절감 최적화: 필요한 컬렉션만 쿼리, 인덱스 활용, 페이지네이션 지원
 */

import { CONFIG } from "../config.js";

let db = null;
let auth = null;

export const FirebaseRepo = {
  isInitialized: false,

  async init() {
    if (this.isInitialized) return true;
    if (CONFIG.IS_MOCK_MODE()) return false;

    try {
      // Firebase Modular SDK 동적 임포트 (학교망/무빌드 환경 지원)
      const { initializeApp } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js");
      const { 
        getFirestore, collection, doc, getDoc, getDocs, addDoc, updateDoc, 
        query, where, orderBy, limit, increment, serverTimestamp 
      } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");
      const { getAuth } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js");

      const app = initializeApp(CONFIG.FIREBASE);
      db = getFirestore(app);
      auth = getAuth(app);
      this.isInitialized = true;
      return true;
    } catch (err) {
      console.warn("Firebase 초기화 실패 (Mock 모드로 전환):", err);
      return false;
    }
  },

  async getRecords({ classId, type, limitCount = 20 }) {
    if (!this.isInitialized) throw new Error("Firebase가 초기화되지 않았습니다.");
    const { collection, getDocs, query, where, orderBy, limit } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");

    const recordsRef = collection(db, "records");
    let q;
    if (type) {
      q = query(recordsRef, where("classId", "==", classId), where("type", "==", type), orderBy("createdAt", "desc"), limit(limitCount));
    } else {
      q = query(recordsRef, where("classId", "==", classId), orderBy("createdAt", "desc"), limit(limitCount));
    }

    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  async addRecord(recordData) {
    if (!this.isInitialized) throw new Error("Firebase가 초기화되지 않았습니다.");
    const { collection, addDoc, doc, updateDoc, increment, serverTimestamp } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");

    // 블라인드 북인 경우 책 정보는 secret/book 서브문서로 분리
    let secretBook = null;
    if (recordData.type === "blind" && recordData.book) {
      secretBook = recordData.book;
      delete recordData.book;
    }

    const docRef = await addDoc(collection(db, "records"), {
      ...recordData,
      commentCount: 0,
      reactionCounts: {},
      createdAt: serverTimestamp()
    });

    if (secretBook) {
      const secretRef = doc(db, `records/${docRef.id}/secret/book`);
      const { setDoc } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");
      await setDoc(secretRef, secretBook);
    }

    // 완독 시 학급 나무 열매 +1
    if (recordData.completed && recordData.classId) {
      const classRef = doc(db, "classes", recordData.classId);
      await updateDoc(classRef, {
        treeFruits: increment(1),
        treeLeaves: increment(1)
      });
    }

    return { success: true, id: docRef.id };
  },

  async getSecretBook(recordId) {
    if (!this.isInitialized) return null;
    const { doc, getDoc } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");
    const secretRef = doc(db, `records/${recordId}/secret/book`);
    const snap = await getDoc(secretRef);
    return snap.exists() ? snap.data() : null;
  },

  async getClassTree(classId) {
    if (!this.isInitialized) return null;
    const { doc, getDoc } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");
    const classRef = doc(db, "classes", classId);
    const snap = await getDoc(classRef);
    return snap.exists() ? { id: snap.id, ...snap.data() } : { id: classId, treeFruits: 0, treeLeaves: 0 };
  }
};
