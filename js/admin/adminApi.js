/**
 * 교사용 관리 API 클라이언트 (adminApi.js)
 */

(function(global) {
  const AdminApi = {
    async bulkCreate(rows, onProgress = null) {
      const isTeacher = global.Auth && global.Auth.isTeacher();
      if (!isTeacher) {
        return { success: false, message: "교사 권한이 필요합니다." };
      }

      const CONFIG = global.CONFIG || {};
      const fbConfig = CONFIG.FIREBASE || {};
      const apiKey = fbConfig.apiKey;
      const isRealFirebase = apiKey && !apiKey.includes("MOCK");
      const authDomain = fbConfig.authDomain || "modu-book-village.firebaseapp.com";
      const projectId = fbConfig.projectId || "modu-book-village";

      // 1. 실제 Firebase 프로젝트 연동이 설정된 경우: Firebase Authentication & Firestore에 직접 등록!
      if (isRealFirebase) {
        return await this.firebaseBulkCreate(rows, apiKey, authDomain, projectId, onProgress);
      }

      // 2. GAS 백엔드 URL이 있는 경우: GAS로 프록시 요청
      const gasUrl = CONFIG.GAS_API_URL || CONFIG.GAS_ADMIN_GATEWAY_URL;
      if (gasUrl) {
        return await this.gasBulkCreate(rows, gasUrl, onProgress);
      }

      // 3. 로컬 Mock 등록
      return this.mockBulkCreate(rows, onProgress);
    },

    // Firebase Authentication & Firestore 실시간 일괄 생성
    async firebaseBulkCreate(rows, apiKey, authDomain, projectId, onProgress = null) {
      const allResults = [];
      const total = rows.length;
      let successCount = 0;

      // 로컬 스토리지 DB 동기화용
      let localDb = null;
      try {
        const saved = localStorage.getItem("BOOK_VILLAGE_MOCK_STORAGE");
        localDb = saved ? JSON.parse(saved) : null;
      } catch(e) {}
      if (!localDb) localDb = { users: [], records: [] };
      if (!localDb.users) localDb.users = [];

      for (let i = 0; i < total; i++) {
        const row = rows[i];
        const num = Number(row.number) || (i + 1);
        const loginId = (row.computedLoginId || row.loginId || ("s" + (num < 10 ? "0" + num : num))).trim().toLowerCase();
        const email = `${loginId}@${authDomain}`;
        // Firebase Auth 비밀번호 최소 길이는 6자 이상
        const initialPw = (row.initialPassword && String(row.initialPassword).length >= 6) 
          ? String(row.initialPassword) 
          : "123456";

        let localId = "";
        let idToken = "";
        let status = "SUCCESS";
        let errorMsg = "";

        try {
          // 1. Firebase Authentication 계정 생성
          const authRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: email, password: initialPw, returnSecureToken: true })
          });
          const authData = await authRes.json();

          if (authRes.ok) {
            localId = authData.localId;
            idToken = authData.idToken;
          } else {
            // 이미 등록된 이메일인 경우
            if (authData.error && authData.error.message && authData.error.message.includes("EMAIL_EXISTS")) {
              localId = "existing_" + loginId;
              status = "EXISTS";
            } else {
              throw new Error(authData.error ? authData.error.message : "계정 생성 실패");
            }
          }

          // 2. Cloud Firestore users 컬렉션에 학생 프로필 문서 저장 시도
          const docTargetId = localId || loginId;
          const fsUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${docTargetId}`;
          const fsBody = {
            fields: {
              userId: { stringValue: loginId },
              name: { stringValue: row.name || loginId },
              nickname: { stringValue: row.nickname || row.name || loginId },
              number: { integerValue: String(num) },
              classId: { stringValue: String(row.classId || "1반") },
              role: { stringValue: "student" },
              treeLevel: { integerValue: "1" },
              totalLeaves: { integerValue: "0" },
              totalFruits: { integerValue: "0" },
              createdAt: { stringValue: new Date().toISOString() }
            }
          };

          const fsHeaders = { "Content-Type": "application/json" };
          if (idToken) {
            fsHeaders["Authorization"] = `Bearer ${idToken}`;
          }

          try {
            await fetch(fsUrl, {
              method: "PATCH",
              headers: fsHeaders,
              body: JSON.stringify(fsBody)
            });
          } catch(fsErr) {
            console.warn("Firestore 프로필 동기화 경고:", fsErr.message);
          }

          // 3. 로컬 DB 동기화
          const existingUser = localDb.users.find(u => u.userId === loginId);
          if (existingUser) {
            existingUser.name = row.name || existingUser.name;
            existingUser.initialPassword = initialPw;
          } else {
            localDb.users.push({
              userId: loginId,
              name: row.name || loginId,
              nickname: row.nickname || row.name || loginId,
              number: num,
              classId: row.classId || "1반",
              role: "student",
              treeLevel: 1,
              totalLeaves: 0,
              totalFruits: 0,
              badges: ["책마을입주민"],
              initialPassword: initialPw
            });
          }

          successCount++;
        } catch (err) {
          console.error(`학생 ${loginId} 등록 실패:`, err);
          status = "FAIL";
          errorMsg = err.message;
        }

        allResults.push({
          line: i + 1,
          loginId: loginId,
          name: row.name || loginId,
          initialPassword: initialPw,
          status: status,
          error: errorMsg
        });

        if (onProgress) {
          onProgress(i + 1, total);
        }
      }

      // 로컬 스토리지 저장
      try {
        localStorage.setItem("BOOK_VILLAGE_MOCK_STORAGE", JSON.stringify(localDb));
      } catch(e) {}

      return {
        success: true,
        results: allResults,
        successCount: successCount
      };
    },

    // GAS를 통한 일괄 생성
    async gasBulkCreate(rows, gasUrl, onProgress = null) {
      const CHUNK_SIZE = 50;
      const allResults = [];
      const total = rows.length;
      const userToken = global.Auth.getToken() || "token";

      for (let i = 0; i < total; i += CHUNK_SIZE) {
        const chunk = rows.slice(i, i + CHUNK_SIZE);
        const payload = {
          action: "bulkCreate",
          idToken: userToken,
          rows: chunk
        };

        try {
          const res = await fetch(gasUrl, {
            method: "POST",
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify(payload)
          });
          const data = await res.json();
          if (data.results) {
            allResults.push(...data.results);
          }
        } catch (err) {
          console.error("청크 일괄 생성 오류:", err);
          chunk.forEach((row) => {
            allResults.push({
              loginId: row.computedLoginId || row.loginId,
              name: row.name,
              status: "FAIL",
              error: "서버 통신 실패"
            });
          });
        }

        if (onProgress) {
          onProgress(Math.min(i + CHUNK_SIZE, total), total);
        }
      }

      return {
        success: true,
        results: allResults,
        successCount: allResults.filter(r => r.status === "SUCCESS").length
      };
    },

    mockBulkCreate(rows, onProgress) {
      const results = rows.map((r, i) => ({
        line: i + 1,
        loginId: r.computedLoginId || r.loginId || `s${r.grade || '3'}${r.classNo || '01'}${r.number || (i+1)}`,
        name: r.name,
        nickname: r.nickname || r.name,
        initialPassword: r.initialPassword || "123456",
        status: "SUCCESS"
      }));

      // 로컬 스토리지 DB 동기화
      try {
        const saved = localStorage.getItem("BOOK_VILLAGE_MOCK_STORAGE");
        const db = saved ? JSON.parse(saved) : { users: [] };
        if (!db.users) db.users = [];
        results.forEach(res => {
          if (!db.users.find(u => u.userId === res.loginId)) {
            db.users.push({
              userId: res.loginId,
              name: res.name,
              number: i + 1,
              classId: "1반",
              role: "student",
              treeLevel: 1,
              totalLeaves: 0,
              totalFruits: 0,
              badges: ["책마을입주민"]
            });
          }
        });
        localStorage.setItem("BOOK_VILLAGE_MOCK_STORAGE", JSON.stringify(db));
      } catch(e) {}

      if (onProgress) onProgress(rows.length, rows.length);
      return { success: true, results, successCount: results.length };
    },

    async resetPassword(uid) {
      const isTeacher = global.Auth && global.Auth.isTeacher();
      if (!isTeacher) return { success: false, message: "교사 권한 필요" };

      const CONFIG = global.CONFIG || {};
      const gasUrl = CONFIG.GAS_API_URL || CONFIG.GAS_ADMIN_GATEWAY_URL;
      if (!gasUrl) {
        return { success: true, tempPassword: "mock" + Math.floor(1000 + Math.random() * 9000) };
      }

      const payload = {
        action: "resetPassword",
        idToken: global.Auth.getToken() || "token",
        uid
      };

      const res = await fetch(gasUrl, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload)
      });
      return await res.json();
    }
  };

  global.AdminApi = AdminApi;
})(typeof window !== "undefined" ? window : globalThis);
