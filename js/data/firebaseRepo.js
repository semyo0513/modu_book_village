/**
 * Firebase Firestore & Auth 통합 저장소 (firebaseRepo.js)
 * - Firebase v10 Modular SDK 동적 로드
 * - records, comments, reactions, classes, connections, users 실시간 Cloud Firestore 연동
 */

(function(global) {
  const CONFIG = global.CONFIG || {};
  let db = null;
  let auth = null;
  let fsModules = null;

  const FirebaseRepo = {
    isInitialized: false,

    async init() {
      if (this.isInitialized) return true;
      const fbConfig = (global.CONFIG && global.CONFIG.FIREBASE) || CONFIG.FIREBASE || {};
      const apiKey = fbConfig.apiKey;
      if (!apiKey || apiKey.includes("MOCK")) {
        return false;
      }

      try {
        const { initializeApp, getApps } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js");
        const fs = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");
        const authMod = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js");

        fsModules = fs;
        const apps = getApps();
        const app = apps.length > 0 ? apps[0] : initializeApp(fbConfig);
        db = fs.getFirestore(app);
        auth = authMod.getAuth(app);

        // 익명 인증 시도로 request.auth 활성화 (보안 규칙 통과 보장)
        try {
          if (!auth.currentUser) {
            await authMod.signInAnonymously(auth);
          }
        } catch (authErr) {
          // 익명 인증 미지원 프로젝트인 경우 무시
        }

        this.isInitialized = true;
        console.log("🔥 [책마을] Firebase Cloud Firestore 실시간 연동 성공 (modu-book-village)");
        return true;
      } catch (err) {
        console.warn("[책마을] Firebase 초기화 실패 (로컬 스토리지 모드 유지):", err);
        return false;
      }
    },

    // 1. 독서 기록 생성 (한 줄 피드, 비밀의 숲, 책 꼬리잇기, 가상 인터뷰)
    async createRecord(payload, currentUser) {
      await this.init();
      if (!this.isInitialized || !db || !fsModules) return null;

      const user = currentUser || { userId: "s01", name: "독서가", classId: "1반" };
      const { collection, addDoc, doc, setDoc, increment, serverTimestamp } = fsModules;

      const recordData = {
        userId: user.userId,
        userName: user.name,
        classId: payload.classId || user.classId || "1반",
        isbn: payload.isbn || "",
        type: payload.type || "feed",
        title: payload.title || "",
        content: payload.content || "",
        question: payload.question || "",
        quote: payload.quote || "",
        characterName: payload.characterName || "",
        rating: Number(payload.rating) || 5,
        emotionTag: payload.emotionTag || "🌟 깊은감동",
        book: payload.bookObj || { title: payload.title || "도서", isbn: payload.isbn || "" },
        commentCount: 0,
        reactionCounts: {},
        createdAt: serverTimestamp()
      };

      if (payload.type === "blind") {
        recordData.blindInfo = {
          revealed: false,
          threshold: Number(payload.blindThreshold) || 3,
          currentCount: 0
        };
      }

      const docRef = await addDoc(collection(db, "records"), recordData);
      const newId = docRef.id;

      // 블라인드 북인 경우 책 정보 서브문서 기록
      if (payload.type === "blind" && payload.bookObj) {
        try {
          const secretRef = doc(db, `records/${newId}/secret/book`);
          await setDoc(secretRef, payload.bookObj);
        } catch(e) {}
      }

      // 릴레이 꼬리잇기인 경우 connections 컬렉션 기록
      if (payload.type === "relay" && payload.relayFromRecordId) {
        try {
          await addDoc(collection(db, "connections"), {
            fromRecordId: payload.relayFromRecordId,
            toRecordId: newId,
            reasonKeyword: payload.relayReasonKeyword || "주제연결",
            reasonText: payload.relayReasonText || "",
            userId: user.userId,
            classId: recordData.classId,
            createdAt: serverTimestamp()
          });
        } catch(e) {}
      }

      // 학급 나무 성장 (classes/{classId})
      try {
        const classRef = doc(db, "classes", recordData.classId);
        await setDoc(classRef, {
          classId: recordData.classId,
          totalLeaves: increment(1),
          totalFruits: increment(1)
        }, { merge: true });
      } catch(e) {}

      // 학생 프로필 성장 (users/{userId})
      try {
        const userRef = doc(db, "users", user.userId);
        await setDoc(userRef, {
          totalLeaves: increment(1)
        }, { merge: true });
      } catch(e) {}

      return { success: true, recordId: newId };
    },

    // 2. 독서 기록 조회
    async getRecords({ classId = "1반", type, limitCount = 50 } = {}) {
      await this.init();
      if (!this.isInitialized || !db || !fsModules) return null;

      const { collection, getDocs, query, where, orderBy, limit } = fsModules;
      const recordsRef = collection(db, "records");

      try {
        let q;
        if (type) {
          q = query(recordsRef, where("type", "==", type), orderBy("createdAt", "desc"), limit(limitCount));
        } else {
          q = query(recordsRef, orderBy("createdAt", "desc"), limit(limitCount));
        }
        const snap = await getDocs(q);
        return snap.docs.map(d => {
          const data = d.data();
          return {
            recordId: d.id,
            id: d.id,
            ...data,
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : (data.createdAt || new Date().toISOString())
          };
        });
      } catch(err) {
        // 복합 인덱스가 아직 빌드되지 않은 경우 단순 쿼리 폴백
        try {
          const snap = await getDocs(query(recordsRef, limit(limitCount)));
          let list = snap.docs.map(d => {
            const data = d.data();
            return {
              recordId: d.id,
              id: d.id,
              ...data,
              createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : (data.createdAt || new Date().toISOString())
            };
          });
          if (type) list = list.filter(r => r.type === type);
          return list;
        } catch(e) {
          return null;
        }
      }
    },

    // 3. 댓글 작성
    async addComment({ recordId, content, roleType, user }) {
      await this.init();
      if (!this.isInitialized || !db || !fsModules) return null;

      const { collection, addDoc, doc, updateDoc, increment, serverTimestamp } = fsModules;
      const commentData = {
        recordId: recordId,
        userId: user ? user.userId : "s01",
        userName: user ? user.name : "독서가",
        content: content,
        roleType: roleType || "student",
        createdAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, "comments"), commentData);

      // 본문 레코드 댓글 수 증가
      try {
        const recRef = doc(db, "records", recordId);
        await updateDoc(recRef, {
          commentCount: increment(1)
        });
      } catch(e) {}

      return { success: true, commentId: docRef.id };
    },

    // 4. 댓글 목록 조회
    async getComments(recordId) {
      await this.init();
      if (!this.isInitialized || !db || !fsModules) return null;

      const { collection, getDocs, query, where } = fsModules;
      try {
        const q = query(collection(db, "comments"), where("recordId", "==", recordId));
        const snap = await getDocs(q);
        return snap.docs.map(d => {
          const data = d.data();
          return {
            commentId: d.id,
            id: d.id,
            ...data,
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : (data.createdAt || new Date().toISOString())
          };
        });
      } catch(e) {
        return [];
      }
    },

    // 5. 공감 반응 토글
    async toggleReaction({ recordId, type, user }) {
      await this.init();
      if (!this.isInitialized || !db || !fsModules) return null;

      const { doc, updateDoc, increment } = fsModules;
      try {
        const recRef = doc(db, "records", recordId);
        await updateDoc(recRef, {
          [`reactionCounts.${type}`]: increment(1)
        });
        return { success: true };
      } catch(e) {
        return { success: true };
      }
    },

    // 6. 마을 광장 현황 및 학급 나무 조회
    async getVillageStatus(classId = "1반") {
      await this.init();
      if (!this.isInitialized || !db || !fsModules) return null;

      const { doc, getDoc, collection, getDocs, query, orderBy, limit } = fsModules;
      let classTree = { classId: classId, totalLeaves: 12, totalFruits: 2, treeStage: 2 };
      try {
        const classSnap = await getDoc(doc(db, "classes", classId));
        if (classSnap.exists()) {
          classTree = { ...classTree, ...classSnap.data() };
        }
      } catch(e) {}

      let recentNews = [];
      try {
        const q = query(collection(db, "records"), orderBy("createdAt", "desc"), limit(5));
        const snap = await getDocs(q);
        recentNews = snap.docs.map(d => {
          const data = d.data();
          return {
            id: d.id,
            ...data,
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : (data.createdAt || new Date().toISOString())
          };
        });
      } catch(e) {}

      return { success: true, classTree, recentNews };
    },

    // 7. 릴레이 꼬리잇기 그래프 조회
    async getRelayGraph(classId = "1반") {
      await this.init();
      if (!this.isInitialized || !db || !fsModules) return null;

      const { collection, getDocs, query, where } = fsModules;
      try {
        const recSnap = await getDocs(query(collection(db, "records"), where("type", "==", "relay")));
        const connSnap = await getDocs(collection(db, "connections"));

        const nodes = recSnap.docs.map(d => {
          const data = d.data();
          return {
            id: d.id,
            title: data.title,
            author: (data.book && data.book.author) || data.userName,
            coverUrl: (data.book && data.book.coverUrl) || "",
            userName: data.userName
          };
        });

        const links = connSnap.docs.map(d => {
          const data = d.data();
          return {
            source: data.fromRecordId,
            target: data.toRecordId,
            keyword: data.reasonKeyword || "꼬리잇기"
          };
        });

        return { success: true, nodes, links };
      } catch(e) {
        return null;
      }
    }
  };

  global.FirebaseRepo = FirebaseRepo;
})(typeof window !== "undefined" ? window : globalThis);
