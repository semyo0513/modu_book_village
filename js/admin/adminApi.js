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
      const gasUrl = CONFIG.GAS_API_URL || CONFIG.GAS_ADMIN_GATEWAY_URL;
      if (!gasUrl) {
        return this.mockBulkCreate(rows, onProgress);
      }

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
        loginId: r.computedLoginId || r.loginId || `s${r.grade}${r.classNo}${r.number}`,
        name: r.name,
        nickname: r.nickname || r.name,
        initialPassword: r.initialPassword || "demo" + Math.floor(1000 + Math.random() * 9000),
        status: "SUCCESS"
      }));

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
