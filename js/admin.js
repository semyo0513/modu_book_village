/**
 * 교사용 관리자 패널 (Admin Panel) 모듈
 */
const Admin = {
  async init() {
    if (!Auth.isTeacher()) {
      const container = document.getElementById("admin-container");
      if (container) {
        container.innerHTML = `
          <div class="village-card p-12 text-center col-span-full">
            <span class="text-4xl">🚫</span>
            <p class="mt-3 text-gray-700 font-bold">교사 전용 관리 페이지입니다.</p>
            <p class="text-xs text-gray-400 mt-1">선생님 계정(teacher)으로 로그인해주세요.</p>
            <button onclick="Auth.quickLogin('teacher')" class="mt-4 px-5 py-2.5 bg-purple-600 text-white rounded-xl text-xs font-bold village-btn">
              선생님 계정으로 즉시 로그인
            </button>
          </div>
        `;
      }
      return;
    }

    await this.loadClassStats();
  },

  async loadClassStats() {
    const container = document.getElementById("admin-container");
    if (!container) return;

    const res = await API.request("getClassStatistics", { classId: "1반" });
    if (res.success) {
      this.renderAdminDashboard(res);
    }
  },

  renderAdminDashboard(data) {
    const container = document.getElementById("admin-container");
    if (!container) return;

    const students = data.ranking || [];

    container.innerHTML = `
      <div class="space-y-6">
        <!-- 상단 대시보드 헤더 -->
        <div class="village-card p-6 bg-purple-900 text-white flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <div class="flex items-center gap-2">
              <span class="text-2xl">🏫</span>
              <h3 class="font-black text-xl">${data.classId} 독서마을 관리자 대시보드</h3>
            </div>
            <p class="text-xs text-purple-200 mt-1">학생 명단 관리, 독서 활동 통계 및 시스템 환경 설정을 진행합니다.</p>
          </div>
          <div class="flex gap-2">
            <button onclick="Admin.openBatchRegisterModal()" class="px-4 py-2 bg-purple-700 hover:bg-purple-600 text-white rounded-xl text-xs font-bold transition-all border border-purple-400">
              👥 학생 일괄 등록
            </button>
            <button onclick="Admin.openSystemSettingsModal()" class="px-4 py-2 bg-white text-purple-900 rounded-xl text-xs font-bold village-btn">
              ⚙️ 시스템/API 설정
            </button>
          </div>
        </div>

        <!-- 학급 독서 활동 랭킹 및 현황 -->
        <div class="village-card p-6">
          <h4 class="font-bold text-sm text-gray-900 mb-4 flex items-center justify-between">
            <span>🏆 학급 학생 독서 현황 및 다독 랭킹 (${students.length}명)</span>
            <span class="text-xs text-gray-400 font-normal">누적 이파리 기준 정렬</span>
          </h4>

          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse text-xs">
              <thead>
                <tr class="bg-gray-50 border-b border-gray-200 text-gray-600">
                  <th class="p-3">순위</th>
                  <th class="p-3">번호</th>
                  <th class="p-3">이름</th>
                  <th class="p-3">아이디</th>
                  <th class="p-3">나무 레벨</th>
                  <th class="p-3">총 이파리(완독)</th>
                  <th class="p-3">열매</th>
                  <th class="p-3 text-right">관리</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100">
                ${students.length === 0 ? `
                  <tr><td colspan="8" class="p-6 text-center text-gray-400">등록된 학생이 없습니다.</td></tr>
                ` : students.map((s, idx) => `
                  <tr class="hover:bg-gray-50">
                    <td class="p-3 font-bold ${idx < 3 ? 'text-amber-600' : 'text-gray-600'}">
                      ${idx === 0 ? '🥇 1위' : idx === 1 ? '🥈 2위' : idx === 2 ? '🥉 3위' : `${idx + 1}위`}
                    </td>
                    <td class="p-3">${s.number}번</td>
                    <td class="p-3 font-bold text-gray-900">${s.name}</td>
                    <td class="p-3 text-gray-500">${s.userId}</td>
                    <td class="p-3"><span class="badge-pill bg-emerald-100 text-emerald-800 text-[11px]">Lv.${s.treeLevel || 1}</span></td>
                    <td class="p-3 font-bold text-emerald-700">🍃 ${s.leaves || s.totalLeaves || 0}개</td>
                    <td class="p-3 text-amber-600">🍎 ${s.fruits || s.totalFruits || 0}개</td>
                    <td class="p-3 text-right">
                      <button onclick="alert('${s.name} 학생의 비밀번호가 1234로 초기화되었습니다.')" class="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 rounded text-[11px] font-semibold text-gray-700">
                        비번 초기화
                      </button>
                    </td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  },

  openBatchRegisterModal() {
    const modal = document.getElementById("modal-batch-register");
    if (modal) {
      modal.classList.remove("hidden");
      modal.classList.add("flex");
    }
  },

  openSystemSettingsModal() {
    const modal = document.getElementById("modal-system-settings");
    if (modal) {
      const inputGas = document.getElementById("setting-gas-url");
      if (inputGas) inputGas.value = localStorage.getItem("BOOK_VILLAGE_GAS_URL") || "";
      modal.classList.remove("hidden");
      modal.classList.add("flex");
    }
  },

  async handleBatchSubmit() {
    const rawText = document.getElementById("batch-students-input").value.trim();
    if (!rawText) {
      alert("학생 명단을 입력해주세요.");
      return;
    }

    // 파싱 형식: "1 홍길동" 또는 "홍길동" (줄바꿈 구분)
    const lines = rawText.split("\n");
    const students = [];

    lines.forEach((line, i) => {
      const parts = line.trim().split(/\s+/);
      if (parts.length >= 2 && !isNaN(parts[0])) {
        students.push({ number: parseInt(parts[0]), name: parts[1] });
      } else if (parts.length >= 1 && parts[0]) {
        students.push({ number: i + 1, name: parts[0] });
      }
    });

    const res = await API.request("batchRegisterStudents", { students: students, classId: "1반" });
    if (res.success) {
      alert(`🎉 ${res.message}`);
      Modal.closeModal("modal-batch-register");
      this.loadClassStats();
    } else {
      alert(`오류: ${res.message}`);
    }
  },

  saveSettings() {
    const url = document.getElementById("setting-gas-url").value.trim();
    localStorage.setItem("BOOK_VILLAGE_GAS_URL", url);
    CONFIG.GAS_API_URL = url;
    alert("설정이 저장되었습니다. 페이지가 새로고침됩니다.");
    window.location.reload();
  }
};
