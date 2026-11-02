/**
 * Firebase Firestore REST API 통합 저장소 (firebaseRepo.js)
 * - 브라우저 네이티브 fetch 기반 Google Cloud Firestore v1 REST API 완전 지원
 * - records, comments, reactions, classes, connections, users 실시간 Cloud Firestore 양방향 동기화
 * - idToken 인증 및 API Key 폴백 자동 지원
 */

(function(global) {
  const CONFIG = global.CONFIG || {};

  // Firestore REST 데이터 변환 유틸리티
  function toFirestoreValue(val) {
    if (val === null || val === undefined) return { nullValue: null };
    if (typeof val === "boolean") return { booleanValue: val };
    if (typeof val === "number") {
      return Number.isInteger(val) ? { integerValue: String(val) } : { doubleValue: val };
    }
    if (typeof val === "string") return { stringValue: val };
    if (val instanceof Date) return { timestampValue: val.toISOString() };
    if (Array.isArray(val)) {
      return { arrayValue: { values: val.map(toFirestoreValue) } };
    }
    if (typeof val === "object") {
      const fields = {};
      for (const [k, v] of Object.entries(val)) {
        if (v !== undefined) {
          fields[k] = toFirestoreValue(v);
        }
      }
      return { mapValue: { fields } };
    }
    return { stringValue: String(val) };
  }

  function fromFirestoreValue(val) {
    if (!val) return null;
    if ("nullValue" in val) return null;
    if ("booleanValue" in val) return val.booleanValue;
    if ("integerValue" in val) return parseInt(val.integerValue, 10);
    if ("doubleValue" in val) return parseFloat(val.doubleValue);
    if ("stringValue" in val) return val.stringValue;
    if ("timestampValue" in val) return val.timestampValue;
    if ("arrayValue" in val) {
      return (val.arrayValue.values || []).map(fromFirestoreValue);
    }
    if ("mapValue" in val) {
      const obj = {};
      const fields = val.mapValue.fields || {};
      for (const [k, v] of Object.entries(fields)) {
        obj[k] = fromFirestoreValue(v);
      }
      return obj;
    }
    return null;
  }

  function parseFirestoreDoc(doc) {
    if (!doc || !doc.fields) return null;
    const data = {};
    for (const [k, v] of Object.entries(doc.fields)) {
      data[k] = fromFirestoreValue(v);
    }
    const nameParts = (doc.name || "").split("/");
    const docId = nameParts[nameParts.length - 1];
    return {
      ...data,
      id: docId,
      recordId: data.recordId || docId,
      createdAt: data.createdAt || doc.createTime || new Date().toISOString()
    };
  }

  const FirebaseRepo = {
    isInitialized: false,

    getConfig() {
      const fbConfig = (global.CONFIG && global.CONFIG.FIREBASE) || (CONFIG && CONFIG.FIREBASE) || {};
      const apiKey = fbConfig.apiKey || "AIzaSyBjAM4dw2O4fgooftg1fAB9F5zpe_PRJeU";
      const projectId = fbConfig.projectId || "modu-book-village";
      return { apiKey, projectId };
    },

    getAuthHeaders() {
      const headers = { "Content-Type": "application/json" };
      let token = null;
      if (typeof localStorage !== "undefined") {
        token = localStorage.getItem("BOOK_VILLAGE_AUTH_TOKEN");
      }
      if (token && !token.startsWith("mock_")) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      return headers;
    },

    getBaseUrl() {
      const { projectId, apiKey } = this.getConfig();
      return `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;
    },

    async init() {
      const { apiKey } = this.getConfig();
      if (!apiKey || apiKey.includes("MOCK")) {
        this.isInitialized = false;
        return false;
      }
      this.isInitialized = true;
      return true;
    },

    // 1. 독서 기록 생성 (Firestore /records)
    async createRecord(payload, currentUser) {
      await this.init();
      if (!this.isInitialized) return null;

      const { apiKey } = this.getConfig();
      const user = currentUser || (global.Auth && global.Auth.getCurrentUser ? global.Auth.getCurrentUser() : null) || { userId: "s01", name: "독서가", classId: "1반" };
      const newRecordId = "rec_" + Date.now().toString(36) + "_" + Math.random().toString(36).substring(2, 6);

      const recordData = {
        recordId: newRecordId,
        userId: user.userId,
        userName: user.name,
        classId: payload.classId || user.classId || "1반",
        isbn: payload.isbn || "",
        type: payload.type || "feed",
        title: payload.title || (payload.bookObj ? payload.bookObj.title : "도서"),
        content: payload.content || "",
        question: payload.question || "",
        quote: payload.quote || "",
        characterName: payload.characterName || "",
        rating: Number(payload.rating) || 5,
        emotionTag: payload.emotionTag || "🌟 깊은감동",
        book: payload.bookObj || { title: payload.title || "도서", isbn: payload.isbn || "" },
        commentCount: 0,
        reactionCounts: {},
        createdAt: new Date().toISOString()
      };

      if (payload.type === "blind") {
        recordData.blindInfo = {
          revealed: false,
          threshold: Number(payload.blindThreshold) || 3,
          currentCount: 0
        };
      }

      const firestoreBody = {
        fields: {}
      };
      for (const [k, v] of Object.entries(recordData)) {
        firestoreBody.fields[k] = toFirestoreValue(v);
      }

      try {
        const url = `${this.getBaseUrl()}/records/${newRecordId}?key=${apiKey}`;
        const res = await fetch(url, {
          method: "PATCH",
          headers: this.getAuthHeaders(),
          body: JSON.stringify(firestoreBody)
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          console.warn("[Firestore] createRecord 실패:", errData);
          throw new Error(errData.error ? errData.error.message : "기록 생성 실패");
        }

        console.log(`🔥 [Firestore] 독서 기록 생성 성공: /records/${newRecordId}`);

        // 릴레이 꼬리잇기인 경우 /connections 컬렉션 추가 기록
        if (payload.type === "relay" && payload.relayFromRecordId) {
          try {
            const connId = "conn_" + Date.now().toString(36);
            const connData = {
              connectionId: connId,
              fromRecordId: payload.relayFromRecordId,
              toRecordId: newRecordId,
              reasonKeyword: payload.relayReasonKeyword || "주제연결",
              reasonText: payload.relayReasonText || "",
              userId: user.userId,
              classId: recordData.classId,
              createdAt: new Date().toISOString()
            };
            const connFields = {};
            for (const [k, v] of Object.entries(connData)) {
              connFields[k] = toFirestoreValue(v);
            }
            await fetch(`${this.getBaseUrl()}/connections/${connId}?key=${apiKey}`, {
              method: "PATCH",
              headers: this.getAuthHeaders(),
              body: JSON.stringify({ fields: connFields })
            });
            console.log(`🔥 [Firestore] 꼬리잇기 연결선 생성 성공: /connections/${connId}`);
          } catch(e) {
            console.warn("[Firestore] connections 기록 실패:", e);
          }
        }

        // 학급 나무(/classes/{classId}) 성장 업데이트
        try {
          const classId = encodeURIComponent(recordData.classId);
          const classUrl = `${this.getBaseUrl()}/classes/${classId}?key=${apiKey}`;
          const currentClassRes = await fetch(classUrl, { headers: this.getAuthHeaders() });
          let leaves = 1;
          let fruits = 0;
          if (currentClassRes.ok) {
            const currentDoc = await currentClassRes.json();
            const parsed = parseFirestoreDoc(currentDoc) || {};
            leaves = (parsed.totalLeaves || 0) + 1;
            fruits = parsed.totalFruits || 0;
            if (leaves % 5 === 0) fruits += 1;
          }
          await fetch(classUrl, {
            method: "PATCH",
            headers: this.getAuthHeaders(),
            body: JSON.stringify({
              fields: {
                classId: toFirestoreValue(recordData.classId),
                totalLeaves: toFirestoreValue(leaves),
                totalFruits: toFirestoreValue(fruits),
                treeStage: toFirestoreValue(Math.min(5, Math.floor(leaves / 10) + 1)),
                updatedAt: toFirestoreValue(new Date().toISOString())
              }
            })
          });
        } catch(e) {
          console.warn("[Firestore] 학급 나무 업데이트 실패:", e);
        }

        // 학생 프로필(/users/{userId}) 독서량 성장 업데이트
        try {
          const userDocId = encodeURIComponent(user.userId);
          const userUrl = `${this.getBaseUrl()}/users/${userDocId}?key=${apiKey}&updateMask.fieldPaths=totalLeaves&updateMask.fieldPaths=treeLevel`;
          await fetch(userUrl, {
            method: "PATCH",
            headers: this.getAuthHeaders(),
            body: JSON.stringify({
              fields: {
                totalLeaves: toFirestoreValue(Number(user.totalLeaves || 0) + 1),
                treeLevel: toFirestoreValue(Math.floor((Number(user.totalLeaves || 0) + 1) / 3) + 1)
              }
            })
          });
        } catch(e) {}

        return { success: true, recordId: newRecordId };
      } catch (err) {
        console.warn("[Firestore REST] createRecord 에러:", err.message);
        return null;
      }
    },

    // 2. 독서 기록 조회 (/records)
    async getRecords({ classId, type, limitCount = 50 } = {}) {
      await this.init();
      if (!this.isInitialized) return null;

      const { apiKey } = this.getConfig();
      try {
        const url = `${this.getBaseUrl()}/records?key=${apiKey}&pageSize=${limitCount}`;
        const res = await fetch(url, { headers: this.getAuthHeaders() });
        if (!res.ok) {
          throw new Error("독서 기록 조회 실패");
        }
        const data = await res.json();
        const documents = data.documents || [];

        let list = documents.map(doc => parseFirestoreDoc(doc)).filter(Boolean);

        // 클라이언트 사이드 필터 및 정렬
        if (type) {
          list = list.filter(r => r.type === type);
        }
        if (classId) {
          list = list.filter(r => r.classId === classId);
        }

        // 최신순 정렬
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        return list;
      } catch (err) {
        console.warn("[Firestore REST] getRecords 에러:", err.message);
        return null;
      }
    },

    // 3. 댓글 작성 (/comments)
    async addComment({ recordId, content, roleType, user }) {
      await this.init();
      if (!this.isInitialized) return null;

      const { apiKey } = this.getConfig();
      const currentUser = user || (global.Auth && global.Auth.getCurrentUser ? global.Auth.getCurrentUser() : null) || { userId: "s01", name: "독서가" };
      const commentId = "cmt_" + Date.now().toString(36) + "_" + Math.random().toString(36).substring(2, 6);

      const commentData = {
        commentId: commentId,
        recordId: recordId,
        userId: currentUser.userId,
        userName: currentUser.name,
        content: content,
        roleType: roleType || "student",
        createdAt: new Date().toISOString()
      };

      const fields = {};
      for (const [k, v] of Object.entries(commentData)) {
        fields[k] = toFirestoreValue(v);
      }

      try {
        const url = `${this.getBaseUrl()}/comments/${commentId}?key=${apiKey}`;
        const res = await fetch(url, {
          method: "PATCH",
          headers: this.getAuthHeaders(),
          body: JSON.stringify({ fields })
        });
        if (!res.ok) throw new Error("댓글 작성 실패");

        console.log(`🔥 [Firestore] 댓글 생성 성공: /comments/${commentId}`);

        // 본문 레코드 댓글 수 증가
        try {
          const recUrl = `${this.getBaseUrl()}/records/${recordId}?key=${apiKey}`;
          const recRes = await fetch(recUrl, { headers: this.getAuthHeaders() });
          if (recRes.ok) {
            const recDoc = await recRes.json();
            const rec = parseFirestoreDoc(recDoc);
            const count = (rec?.commentCount || 0) + 1;
            await fetch(`${recUrl}&updateMask.fieldPaths=commentCount`, {
              method: "PATCH",
              headers: this.getAuthHeaders(),
              body: JSON.stringify({ fields: { commentCount: toFirestoreValue(count) } })
            });
          }
        } catch(e) {}

        return { success: true, commentId };
      } catch (err) {
        console.warn("[Firestore REST] addComment 에러:", err.message);
        return null;
      }
    },

    // 4. 댓글 목록 조회 (/comments)
    async getComments(recordId) {
      await this.init();
      if (!this.isInitialized) return [];

      const { apiKey } = this.getConfig();
      try {
        const url = `${this.getBaseUrl()}/comments?key=${apiKey}&pageSize=100`;
        const res = await fetch(url, { headers: this.getAuthHeaders() });
        if (!res.ok) return [];

        const data = await res.json();
        const documents = data.documents || [];
        const comments = documents
          .map(doc => parseFirestoreDoc(doc))
          .filter(c => c && c.recordId === recordId);

        comments.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        return comments;
      } catch (err) {
        console.warn("[Firestore REST] getComments 에러:", err.message);
        return [];
      }
    },

    // 5. 공감 반응 토글 (/records/{recordId} 내 reactionCounts)
    async toggleReaction({ recordId, type, user }) {
      await this.init();
      if (!this.isInitialized) return { success: true };

      const { apiKey } = this.getConfig();
      try {
        const recUrl = `${this.getBaseUrl()}/records/${recordId}?key=${apiKey}`;
        const recRes = await fetch(recUrl, { headers: this.getAuthHeaders() });
        if (recRes.ok) {
          const recDoc = await recRes.json();
          const rec = parseFirestoreDoc(recDoc) || {};
          const reactionCounts = rec.reactionCounts || {};
          reactionCounts[type] = (Number(reactionCounts[type]) || 0) + 1;

          await fetch(`${recUrl}&updateMask.fieldPaths=reactionCounts`, {
            method: "PATCH",
            headers: this.getAuthHeaders(),
            body: JSON.stringify({
              fields: {
                reactionCounts: toFirestoreValue(reactionCounts)
              }
            })
          });
        }
        return { success: true };
      } catch (err) {
        return { success: true };
      }
    },

    // 6. 마을 광장 현황 및 학급 나무 조회 (/classes, /records)
    async getVillageStatus(classId = "1반") {
      await this.init();
      if (!this.isInitialized) return null;

      const { apiKey } = this.getConfig();
      let classTree = { classId: classId, totalLeaves: 10, totalFruits: 2, treeStage: 2 };
      try {
        const classUrl = `${this.getBaseUrl()}/classes/${encodeURIComponent(classId)}?key=${apiKey}`;
        const classRes = await fetch(classUrl, { headers: this.getAuthHeaders() });
        if (classRes.ok) {
          const classDoc = await classRes.json();
          const parsed = parseFirestoreDoc(classDoc);
          if (parsed) classTree = { ...classTree, ...parsed };
        }
      } catch(e) {}

      let recentNews = [];
      try {
        const records = await this.getRecords({ classId, limitCount: 5 });
        if (records && records.length > 0) {
          recentNews = records.slice(0, 5);
        }
      } catch(e) {}

      return { success: true, classTree, recentNews };
    },

    // 7. 릴레이 꼬리잇기 그래프 조회 (/records, /connections)
    async getRelayGraph(classId = "1반") {
      await this.init();
      if (!this.isInitialized) return null;

      const { apiKey } = this.getConfig();
      try {
        const records = await this.getRecords({ type: "relay" });
        const nodes = (records || []).map(r => ({
          id: r.recordId || r.id,
          title: r.title,
          author: (r.book && r.book.author) || r.userName,
          coverUrl: (r.book && r.book.coverUrl) || "",
          userName: r.userName
        }));

        const connUrl = `${this.getBaseUrl()}/connections?key=${apiKey}&pageSize=100`;
        const connRes = await fetch(connUrl, { headers: this.getAuthHeaders() });
        let links = [];
        if (connRes.ok) {
          const connData = await connRes.json();
          const documents = connData.documents || [];
          links = documents
            .map(d => parseFirestoreDoc(d))
            .filter(Boolean)
            .map(d => ({
              source: d.fromRecordId,
              target: d.toRecordId,
              keyword: d.reasonKeyword || "꼬리잇기"
            }));
        }

        return { success: true, nodes, links };
      } catch (err) {
        return null;
      }
    },

    // 8. 교사 칭찬 스탬프 및 피드백 저장 (/records/{recordId})
    async addTeacherFeedback(recordId, feedback) {
      await this.init();
      if (!this.isInitialized) return null;

      const { apiKey } = this.getConfig();
      try {
        const recUrl = `${this.getBaseUrl()}/records/${recordId}?key=${apiKey}&updateMask.fieldPaths=teacherFeedback`;
        const fbData = {
          ...feedback,
          createdAt: new Date().toISOString()
        };
        const res = await fetch(recUrl, {
          method: "PATCH",
          headers: this.getAuthHeaders(),
          body: JSON.stringify({
            fields: {
              teacherFeedback: toFirestoreValue(fbData)
            }
          })
        });

        if (!res.ok) throw new Error("피드백 저장 실패");
        console.log(`🔥 [Firestore] 교사 피드백 저장 완료: /records/${recordId}`);
        return { success: true };
      } catch (err) {
        console.warn("[Firestore REST] 피드백 저장 오류:", err.message);
        return null;
      }
    },

    // 9. 학생 독서 평가 및 생기부 종합 의견 저장 (/users/{userId})
    async saveStudentEvaluation(userId, evaluation) {
      await this.init();
      if (!this.isInitialized) return null;

      const { apiKey } = this.getConfig();
      try {
        const userUrl = `${this.getBaseUrl()}/users/${encodeURIComponent(userId)}?key=${apiKey}&updateMask.fieldPaths=evaluation`;
        const evalData = {
          ...evaluation,
          updatedAt: new Date().toISOString()
        };
        const res = await fetch(userUrl, {
          method: "PATCH",
          headers: this.getAuthHeaders(),
          body: JSON.stringify({
            fields: {
              evaluation: toFirestoreValue(evalData)
            }
          })
        });

        if (!res.ok) throw new Error("평가 의견 저장 실패");
        console.log(`🔥 [Firestore] 학생 독서 평가 저장 완료: /users/${userId}`);
        return { success: true };
      } catch (err) {
        console.warn("[Firestore REST] 평가 저장 오류:", err.message);
        return null;
      }
    },

    // 10. 학생 계정 삭제 (/users/{userId})
    async deleteStudent(userId) {
      await this.init();
      if (!this.isInitialized) return null;

      const { apiKey } = this.getConfig();
      try {
        const userUrl = `${this.getBaseUrl()}/users/${encodeURIComponent(userId)}?key=${apiKey}`;
        const res = await fetch(userUrl, {
          method: "DELETE",
          headers: this.getAuthHeaders()
        });
        return { success: res.ok };
      } catch (err) {
        return null;
      }
    },

    // 11. 로컬 스토리지에만 머무르는 독서 기록들을 Firestore로 일괄 동기화 (마이그레이션)
    async syncLocalToFirestore() {
      await this.init();
      if (!this.isInitialized) {
        return { success: false, message: "Firebase 설정이 필요합니다." };
      }

      let localDb = null;
      try {
        const saved = localStorage.getItem("BOOK_VILLAGE_MOCK_STORAGE");
        localDb = saved ? JSON.parse(saved) : null;
      } catch(e) {}

      if (!localDb || !localDb.records || localDb.records.length === 0) {
        return { success: false, message: "동기화할 로컬 독서 기록이 없습니다." };
      }

      let syncedRecords = 0;
      let syncedConnections = 0;

      for (const rec of localDb.records) {
        const payload = {
          classId: rec.classId,
          type: rec.type,
          isbn: rec.isbn,
          title: rec.title || (rec.book ? rec.book.title : "도서"),
          content: rec.content,
          quote: rec.quote,
          question: rec.question,
          characterName: rec.characterName,
          rating: rec.rating,
          emotionTag: rec.emotionTag,
          bookObj: rec.book || localDb.books[rec.isbn]
        };
        const user = { userId: rec.userId, name: rec.userName, classId: rec.classId };
        const res = await this.createRecord(payload, user);
        if (res && res.success) {
          syncedRecords++;
        }
      }

      // 학급 나무 정보도 동기화
      if (localDb.classTree) {
        try {
          const { apiKey } = this.getConfig();
          const treeUrl = `${this.getBaseUrl()}/classes/${encodeURIComponent(localDb.classTree.classId || "1반")}?key=${apiKey}`;
          await fetch(treeUrl, {
            method: "PATCH",
            headers: this.getAuthHeaders(),
            body: JSON.stringify({
              fields: {
                classId: toFirestoreValue(localDb.classTree.classId || "1반"),
                totalLeaves: toFirestoreValue(localDb.classTree.totalLeaves || 10),
                totalFruits: toFirestoreValue(localDb.classTree.totalFruits || 2),
                treeStage: toFirestoreValue(localDb.classTree.treeStage || 2),
                updatedAt: toFirestoreValue(new Date().toISOString())
              }
            })
          });
        } catch(e) {}
      }

      return {
        success: true,
        message: `총 ${syncedRecords}개의 독서 기록과 학급 나무 데이터가 Firestore로 성공적으로 전송되었습니다!`,
        syncedRecords
      };
    }
  };

  global.FirebaseRepo = FirebaseRepo;
})(typeof window !== "undefined" ? window : globalThis);
