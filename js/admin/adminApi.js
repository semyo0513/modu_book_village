/**
 * 교사용 관리 API 클라이언트 (adminApi.js)
 * - GAS ② 관리 게이트웨이 호출 (일괄 계정 생성, 비밀번호 재설정, 계정 비활성화)
 * - Firebase ID 토큰 첨부 및 프리플라이트 방지 (text/plain 전송)
 */

import { CONFIG } from "../config.js";
import { AuthService } from "../auth/authService.js";

export const AdminApi = {
  async bulkCreate(rows, onProgress = null) {
    if (!AuthService.isTeacher()) {
      return { success: false, message: "교사 권한이 필요합니다." };
    }

    if (!CONFIG.GAS_ADMIN_GATEWAY_URL) {
      // Mock 모드 일괄 생성
      return this.mockBulkCreate(rows, onProgress);
    }

    const CHUNK_SIZE = 50;
    const allResults = [];
    const total = rows.length;

    for (let i = 0; i < total; i += CHUNK_SIZE) {
      const chunk = rows.slice(i, i + CHUNK_SIZE);
      const payload = {
        action: "bulkCreate",
        idToken: AuthService.currentUser.idToken,
        rows: chunk
      };

      try {
        const res = await fetch(CONFIG.GAS_ADMIN_GATEWAY_URL, {
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
        chunk.forEach((row, idx) => {
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
    if (!AuthService.isTeacher()) return { success: false, message: "교사 권한 필요" };
    if (!CONFIG.GAS_ADMIN_GATEWAY_URL) {
      return { success: true, tempPassword: "mock" + Math.floor(1000 + Math.random() * 9000) };
    }

    const payload = {
      action: "resetPassword",
      idToken: AuthService.currentUser.idToken,
      uid
    };

    const res = await fetch(CONFIG.GAS_ADMIN_GATEWAY_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload)
    });
    return await res.json();
  }
};
