/**
 * 교사용 종합 관리자 대시보드 (js/admin.js)
 * - 학생 수동 개별 등록 및 명단 관리
 * - 독서 기록 실시간 모니터링 & 교사 칭찬 스탬프/피드백
 * - 독서 활동 평가 및 생활기록부용 포트폴리오 리포트 (CSV/인쇄)
 */

const Admin = {
  activeTab: "students", // 'students' | 'feedback' | 'assessment'
  searchQuery: "",
  sortBy: "number",      // 'number' | 'leaves' | 'name'
  feedbackFilter: "all", // 'all' | 'done' | 'pending'
  currentStudents: [],
  currentRecords: [],
  currentPortfolioUserId: null,
  selectedStamp: "🌟 참 잘했어요",

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

    // 1. 학생 통계 데이터 가져오기
    const res = await API.request("getClassStatistics", { classId: "1반" });
    if (res.success) {
      this.currentStudents = res.ranking || [];
    }

    // 2. 전체 독서 기록 데이터 가져오기 (피드백용)
    const recRes = await API.request("getRecords", { classId: "1반" });
    if (recRes && recRes.success) {
      this.currentRecords = recRes.records || [];
    } else {
      const saved = localStorage.getItem("BOOK_VILLAGE_MOCK_STORAGE");
      try {
        const parsed = JSON.parse(saved);
        this.currentRecords = parsed.records || [];
      } catch(e) {}
    }

    this.renderAdminDashboard();
  },

  switchAdminTab(tabName) {
    this.activeTab = tabName;
    this.renderAdminDashboard();
  },

  renderAdminDashboard() {
    const container = document.getElementById("admin-container");
    if (!container) return;

    container.innerHTML = `
      <div class="space-y-6">
        <!-- 상단 대시보드 헤더 -->
        <div class="village-card p-6 bg-gradient-to-r from-purple-900 via-indigo-900 to-purple-800 text-white flex flex-col md:flex-row justify-between items-center gap-4 shadow-lg">
          <div>
            <div class="flex items-center gap-2.5">
              <span class="text-3xl">🏫</span>
              <div>
                <h3 class="font-black text-xl">1반 독서마을 교사용 관리 포털</h3>
                <p class="text-xs text-purple-200 mt-0.5">학생 계정 관리, 실시간 칭찬 피드백 및 생활기록부 독서 평가를 지원합니다.</p>
              </div>
            </div>
          </div>
          <div class="flex flex-wrap gap-2">
            <button onclick="Admin.openSingleStudentModal()" class="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center gap-1.5">
              <span>➕</span> 학생 수동 등록
            </button>
            <button onclick="Admin.openBatchRegisterModal()" class="px-3.5 py-2 bg-purple-700 hover:bg-purple-600 text-white rounded-xl text-xs font-bold transition border border-purple-400 flex items-center gap-1.5">
              <span>👥</span> CSV 일괄 등록
            </button>
            <button onclick="Admin.openSystemSettingsModal()" class="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition flex items-center gap-1">
              <span>⚙️</span> API 설정
            </button>
          </div>
        </div>

        <!-- 3대 관리자 탭 내비게이션 -->
        <div class="flex bg-white p-1.5 rounded-2xl shadow-sm border border-gray-100 gap-1">
          <button onclick="Admin.switchAdminTab('students')" class="flex-1 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${this.activeTab === 'students' ? 'bg-purple-100 text-purple-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'}">
            <span>👥</span> 학생 계정 및 명단 관리 (${this.currentStudents.length}명)
          </button>
          <button onclick="Admin.switchAdminTab('feedback')" class="flex-1 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${this.activeTab === 'feedback' ? 'bg-amber-100 text-amber-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'}">
            <span>🏅</span> 독서 기록 피드백 & 칭찬 도장 (${this.currentRecords.length}건)
          </button>
          <button onclick="Admin.switchAdminTab('assessment')" class="flex-1 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${this.activeTab === 'assessment' ? 'bg-emerald-100 text-emerald-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'}">
            <span>📊</span> 독서 활동 평가 & 포트폴리오
          </button>
        </div>

        <!-- 탭별 본문 영역 -->
        <div>
          ${this.activeTab === 'students' ? this.renderStudentsTab() : ''}
          ${this.activeTab === 'feedback' ? this.renderFeedbackTab() : ''}
          ${this.activeTab === 'assessment' ? this.renderAssessmentTab() : ''}
        </div>
      </div>
    `;
  },

  // ==========================================
  // [탭 1] 학생 계정 및 명단 관리
  // ==========================================
  renderStudentsTab() {
    let list = [...this.currentStudents];

    // 검색 필터
    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      list = list.filter(s => 
        (s.name && s.name.toLowerCase().includes(q)) || 
        (s.userId && s.userId.toLowerCase().includes(q)) || 
        String(s.number).includes(q)
      );
    }

    // 정렬
    if (this.sortBy === "number") {
      list.sort((a, b) => (Number(a.number) || 0) - (Number(b.number) || 0));
    } else if (this.sortBy === "leaves") {
      list.sort((a, b) => (Number(b.leaves || b.totalLeaves) || 0) - (Number(a.leaves || a.totalLeaves) || 0));
    } else if (this.sortBy === "name") {
      list.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    }

    return `
      <div class="village-card p-6 space-y-4">
        <!-- 검색 및 정렬 바 -->
        <div class="flex flex-col sm:flex-row justify-between items-center gap-3 pb-3 border-b border-gray-100">
          <div class="flex items-center gap-2 w-full sm:w-auto">
            <input 
              type="text" 
              placeholder="학생 이름, 번호, 아이디 검색..." 
              value="${this.searchQuery}" 
              oninput="Admin.searchQuery = this.value; Admin.renderAdminDashboard();" 
              class="px-3.5 py-2 border rounded-xl text-xs w-full sm:w-64 focus:ring-2 focus:ring-purple-400 outline-none"
            />
          </div>

          <div class="flex items-center gap-2 w-full sm:w-auto justify-end">
            <span class="text-xs text-gray-500 font-semibold">정렬:</span>
            <select onchange="Admin.sortBy = this.value; Admin.renderAdminDashboard();" class="px-3 py-1.5 border rounded-xl text-xs font-bold outline-none bg-white">
              <option value="number" ${this.sortBy === 'number' ? 'selected' : ''}>출석 번호순</option>
              <option value="leaves" ${this.sortBy === 'leaves' ? 'selected' : ''}>다독(완독)순</option>
              <option value="name" ${this.sortBy === 'name' ? 'selected' : ''}>이름 가나다순</option>
            </select>
          </div>
        </div>

        <!-- 학생 테이블 -->
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse text-xs">
            <thead>
              <tr class="bg-gray-50 border-b border-gray-200 text-gray-600 font-bold">
                <th class="p-3">번호</th>
                <th class="p-3">이름 (닉네임)</th>
                <th class="p-3">아이디</th>
                <th class="p-3">나무 레벨</th>
                <th class="p-3">완독 이파리</th>
                <th class="p-3">황금 열매</th>
                <th class="p-3 text-right">학생 관리 액션</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              ${list.length === 0 ? `
                <tr><td colspan="7" class="p-8 text-center text-gray-400">등록된 학생이 없거나 검색 결과가 없습니다.</td></tr>
              ` : list.map((s) => `
                <tr class="hover:bg-purple-50/30 transition">
                  <td class="p-3 font-bold text-gray-700">${s.number || '-'}번</td>
                  <td class="p-3">
                    <span class="font-bold text-gray-900">${s.name}</span>
                    ${s.nickname && s.nickname !== s.name ? `<span class="text-[11px] text-gray-400">(${s.nickname})</span>` : ''}
                  </td>
                  <td class="p-3 text-purple-700 font-mono font-semibold">${s.userId}</td>
                  <td class="p-3"><span class="badge-pill bg-purple-100 text-purple-800 text-[11px] font-bold">Lv.${s.treeLevel || 1}</span></td>
                  <td class="p-3 font-bold text-emerald-700">🍃 ${s.leaves || s.totalLeaves || 0}개</td>
                  <td class="p-3 font-bold text-amber-600">🍎 ${s.fruits || s.totalFruits || 0}개</td>
                  <td class="p-3 text-right space-x-1 whitespace-nowrap">
                    <button onclick="Admin.openStudentPortfolioModal('${s.userId}')" class="px-2.5 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg text-[11px] font-bold transition">
                      📜 포트폴리오
                    </button>
                    <button onclick="Admin.resetStudentPassword('${s.userId}', '${s.name}')" class="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-[11px] font-bold transition" title="비밀번호를 123456으로 초기화합니다">
                      🔑 비번 초기화
                    </button>
                    <button onclick="Admin.deleteStudent('${s.userId}', '${s.name}')" class="px-2 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg text-[11px] font-bold transition">
                      🗑️
                    </button>
                  </td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  // ==========================================
  // [탭 2] 독서 기록 피드백 & 칭찬 도장
  // ==========================================
  renderFeedbackTab() {
    let records = [...this.currentRecords];

    if (this.feedbackFilter === "done") {
      records = records.filter(r => r.teacherFeedback && r.teacherFeedback.stamp);
    } else if (this.feedbackFilter === "pending") {
      records = records.filter(r => !r.teacherFeedback || !r.teacherFeedback.stamp);
    }

    return `
      <div class="village-card p-6 space-y-4">
        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b">
          <div>
            <h4 class="font-bold text-sm text-gray-900">학급 학생 독서 활동 피드백</h4>
            <p class="text-xs text-gray-400 mt-0.5">학생들의 독서 감상평에 칭찬 도장과 조언 한마디를 남겨주세요.</p>
          </div>
          <div class="flex bg-gray-100 p-1 rounded-xl text-xs font-bold">
            <button onclick="Admin.feedbackFilter = 'all'; Admin.renderAdminDashboard();" class="px-3 py-1.5 rounded-lg transition ${this.feedbackFilter === 'all' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}">전체 (${this.currentRecords.length})</button>
            <button onclick="Admin.feedbackFilter = 'pending'; Admin.renderAdminDashboard();" class="px-3 py-1.5 rounded-lg transition ${this.feedbackFilter === 'pending' ? 'bg-white text-amber-700 shadow-sm' : 'text-gray-500'}">미확인 (${this.currentRecords.filter(r => !r.teacherFeedback).length})</button>
            <button onclick="Admin.feedbackFilter = 'done'; Admin.renderAdminDashboard();" class="px-3 py-1.5 rounded-lg transition ${this.feedbackFilter === 'done' ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-500'}">칭찬 완료 (${this.currentRecords.filter(r => r.teacherFeedback).length})</button>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          ${records.length === 0 ? `
            <div class="p-12 text-center text-gray-400 col-span-full">표시할 독서 기록이 없습니다.</div>
          ` : records.map(r => `
            <div class="p-4 rounded-2xl border ${r.teacherFeedback ? 'border-amber-200 bg-amber-50/20' : 'border-gray-200 bg-white'} shadow-sm flex flex-col justify-between space-y-3">
              <div>
                <div class="flex justify-between items-center mb-2">
                  <span class="text-xs font-bold text-purple-900 flex items-center gap-1.5">
                    <span class="w-6 h-6 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-[10px]">${(r.userName || '학')[0]}</span>
                    ${r.userName || '학생'}
                  </span>
                  <span class="badge-pill bg-gray-100 text-gray-600 text-[10px]">
                    ${r.type === 'feed' ? '🎪 한줄피드' : r.type === 'blind' ? '🔮 비밀의숲' : r.type === 'relay' ? '📮 꼬리잇기' : '🎙️ 인터뷰'}
                  </span>
                </div>

                <h5 class="text-xs font-bold text-gray-900 line-clamp-1">${r.title || (r.book && r.book.title) || '독서 기록'}</h5>
                <p class="text-xs text-gray-600 mt-1 line-clamp-3 leading-relaxed">"${r.content || ''}"</p>

                ${r.teacherFeedback ? `
                  <div class="mt-3 p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
                    <div class="font-bold flex items-center gap-1">
                      <span>${r.teacherFeedback.stamp ? r.teacherFeedback.stamp.split(" ")[0] : '🏅'}</span>
                      <span>${r.teacherFeedback.stamp || '칭찬 도장'}</span>
                    </div>
                    <p class="text-[11px] text-amber-800 mt-0.5">"${r.teacherFeedback.comment || ''}"</p>
                  </div>
                ` : ''}
              </div>

              <div class="pt-2 border-t flex justify-end">
                <button onclick="Admin.openTeacherFeedbackModal('${r.recordId}', '${r.userName}', '${(r.title || (r.book && r.book.title) || '독서 기록').replace(/'/g, "\\'")}')" class="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold village-btn shadow-sm flex items-center gap-1">
                  <span>${r.teacherFeedback ? '✏️ 피드백 수정' : '🏅 칭찬 도장 찍기'}</span>
                </button>
              </div>
            </div>
          `).join("")}
        </div>
      </div>
    `;
  },

  // ==========================================
  // [탭 3] 독서 활동 평가 & 생기부 포트폴리오
  // ==========================================
  renderAssessmentTab() {
    const students = this.currentStudents;
    const totalLeaves = students.reduce((acc, s) => acc + (Number(s.leaves || s.totalLeaves) || 0), 0);
    const avgLeaves = students.length > 0 ? (totalLeaves / students.length).toFixed(1) : 0;

    return `
      <div class="village-card p-6 space-y-6">
        <!-- 학급 독서 활동 요약 지표 -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div class="p-4 bg-purple-50 rounded-2xl border border-purple-100 flex items-center gap-3">
            <span class="text-3xl">👥</span>
            <div>
              <p class="text-xs text-purple-600 font-bold">등록 학생 수</p>
              <h4 class="text-xl font-black text-purple-950">${students.length}명</h4>
            </div>
          </div>
          <div class="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center gap-3">
            <span class="text-3xl">🍃</span>
            <div>
              <p class="text-xs text-emerald-600 font-bold">학급 총 완독 권수</p>
              <h4 class="text-xl font-black text-emerald-950">${totalLeaves}권</h4>
            </div>
          </div>
          <div class="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex items-center gap-3">
            <span class="text-3xl">📈</span>
            <div>
              <p class="text-xs text-amber-600 font-bold">1인당 평균 완독</p>
              <h4 class="text-xl font-black text-amber-950">${avgLeaves}권</h4>
            </div>
          </div>
        </div>

        <!-- 액션 헤더 -->
        <div class="flex justify-between items-center pb-2 border-b">
          <div>
            <h4 class="font-bold text-sm text-gray-900">학생별 생활기록부 독서 평가 의견</h4>
            <p class="text-xs text-gray-400 mt-0.5">평가 문장을 클릭하여 편집하거나 전체 명단을 CSV로 일괄 내보낼 수 있습니다.</p>
          </div>
          <button onclick="Admin.downloadEvaluationCsv()" class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold village-btn shadow flex items-center gap-1.5">
            <span>📥</span> 전체 독서 평가 엑셀(CSV) 다운로드
          </button>
        </div>

        <!-- 학생 평가 카드 목록 -->
        <div class="space-y-3">
          ${students.length === 0 ? `
            <div class="p-8 text-center text-gray-400">등록된 학생이 없습니다.</div>
          ` : students.map(s => {
            const leaves = s.leaves || s.totalLeaves || 0;
            const evalText = (s.evaluation && s.evaluation.summary) || "";
            return `
              <div class="p-4 rounded-2xl border border-gray-100 hover:border-purple-200 transition bg-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div class="flex items-center gap-3 flex-shrink-0">
                  <div class="w-10 h-10 rounded-2xl bg-purple-100 text-purple-800 font-black flex items-center justify-center text-sm">
                    ${s.number}번
                  </div>
                  <div>
                    <h5 class="font-bold text-xs text-gray-900">${s.name} <span class="text-gray-400 font-mono text-[11px]">(${s.userId})</span></h5>
                    <p class="text-[11px] text-emerald-700 font-bold mt-0.5">🍃 완독: ${leaves}권 | 🍎 열매: ${s.fruits || s.totalFruits || 0}개</p>
                  </div>
                </div>

                <div class="flex-1 w-full bg-gray-50 p-2.5 rounded-xl border border-gray-100 text-xs text-gray-700 line-clamp-2">
                  ${evalText ? `
                    <span class="text-purple-900 font-bold">생기부 의견:</span> "${evalText}"
                  ` : `
                    <span class="text-gray-400 italic">아직 작성된 교사 평가 의견이 없습니다. 우측 [의견 작성]을 클릭하세요.</span>
                  `}
                </div>

                <button onclick="Admin.openStudentPortfolioModal('${s.userId}')" class="px-3.5 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold village-btn flex-shrink-0 whitespace-nowrap">
                  ✏️ 의견 작성 & 포트폴리오
                </button>
              </div>
            `;
          }).join("")}
        </div>
      </div>
    `;
  },

  // ==========================================
  // 모달 제어 & 액션 핸들러
  // ==========================================

  // 1. 단일 학생 수동 등록 모달
  openSingleStudentModal() {
    const modal = document.getElementById("modal-student-single-add");
    if (!modal) return;

    // 번호 자동 계산
    const maxNum = this.currentStudents.reduce((max, s) => Math.max(max, Number(s.number) || 0), 0);
    const nextNum = maxNum + 1;
    document.getElementById("single-st-number").value = nextNum;
    document.getElementById("single-st-name").value = "";
    document.getElementById("single-st-nickname").value = "";
    document.getElementById("single-st-password").value = "123456";
    this.updateAutoIdPreview();

    modal.classList.remove("hidden");
    modal.classList.add("flex");
  },

  updateAutoIdPreview() {
    const num = Number(document.getElementById("single-st-number")?.value) || 1;
    const cleanNum = num < 10 ? "0" + num : num;
    const idInput = document.getElementById("single-st-userid");
    if (idInput && !idInput.dataset.manual) {
      idInput.value = "s" + cleanNum;
    }
  },

  async handleSingleStudentSubmit(e) {
    e.preventDefault();
    const btn = document.getElementById("btn-submit-single-student");
    if (btn) btn.disabled = true;

    const number = Number(document.getElementById("single-st-number").value);
    const classId = document.getElementById("single-st-class").value.trim() || "1반";
    const name = document.getElementById("single-st-name").value.trim();
    const nickname = document.getElementById("single-st-nickname").value.trim() || name;
    const userId = document.getElementById("single-st-userid").value.trim();
    const password = document.getElementById("single-st-password").value.trim();

    try {
      const res = await window.AdminApi.registerSingleStudent({
        number, classId, name, nickname, userId, password
      });

      if (res.success) {
        alert(`🎉 [${name}] 학생의 계정이 파이어베이스에 성공적으로 등록되었습니다!\n\n• 아이디: ${userId}\n• 초기 비밀번호: ${password}`);
        Modal.closeModal("modal-student-single-add");
        await this.loadClassStats();
      } else {
        alert("등록 실패: " + res.message);
      }
    } catch(err) {
      alert("오류 발생: " + err.message);
    } finally {
      if (btn) btn.disabled = false;
    }
  },

  // 2. 칭찬 도장 & 피드백 모달
  openTeacherFeedbackModal(recordId, studentName, bookTitle) {
    const modal = document.getElementById("modal-teacher-feedback");
    if (!modal) return;

    document.getElementById("feedback-record-id").value = recordId;
    document.getElementById("feedback-target-title").textContent = bookTitle || "도서 독서록";
    document.getElementById("feedback-target-author").textContent = `작성 학생: ${studentName || '학생'}`;

    // 기존 피드백이 있으면 채우기
    const record = this.currentRecords.find(r => r.recordId === recordId);
    if (record && record.teacherFeedback) {
      this.selectFeedbackStamp(record.teacherFeedback.stamp || "🌟 참 잘했어요");
      document.getElementById("feedback-comment-input").value = record.teacherFeedback.comment || "";
    } else {
      this.selectFeedbackStamp("🌟 참 잘했어요");
      document.getElementById("feedback-comment-input").value = "";
    }

    modal.classList.remove("hidden");
    modal.classList.add("flex");
  },

  selectFeedbackStamp(stamp) {
    this.selectedStamp = stamp;
    const buttons = document.querySelectorAll(".stamp-btn");
    buttons.forEach(btn => {
      if (btn.textContent.includes(stamp.split(" ")[0])) {
        btn.className = "stamp-btn p-2 rounded-xl border-2 border-amber-500 bg-amber-50 text-xs font-bold flex items-center gap-1.5 shadow-sm";
      } else {
        btn.className = "stamp-btn p-2 rounded-xl border border-gray-200 hover:bg-gray-50 text-xs font-bold flex items-center gap-1.5";
      }
    });
  },

  async submitTeacherFeedback() {
    const recordId = document.getElementById("feedback-record-id").value;
    const comment = document.getElementById("feedback-comment-input").value.trim();
    const stamp = this.selectedStamp;

    const feedback = {
      stamp: stamp,
      comment: comment,
      teacherName: "담임선생님",
      createdAt: new Date().toISOString()
    };

    // 1. Firebase Firestore 업데이트
    if (window.FirebaseRepo) {
      await window.FirebaseRepo.addTeacherFeedback(recordId, feedback);
    }

    // 2. 로컬 스토리지 동기화
    const target = this.currentRecords.find(r => r.recordId === recordId);
    if (target) {
      target.teacherFeedback = feedback;
    }
    const saved = localStorage.getItem("BOOK_VILLAGE_MOCK_STORAGE");
    if (saved) {
      try {
        const db = JSON.parse(saved);
        const r = db.records.find(x => x.recordId === recordId);
        if (r) r.teacherFeedback = feedback;
        localStorage.setItem("BOOK_VILLAGE_MOCK_STORAGE", JSON.stringify(db));
      } catch(e) {}
    }

    alert(`✨ [${stamp}] 칭찬 도장과 피드백이 학생의 글에 성공적으로 등록되었습니다!`);
    Modal.closeModal("modal-teacher-feedback");
    this.renderAdminDashboard();
  },

  // 3. 학생 포트폴리오 & 생기부 의견 모달
  openStudentPortfolioModal(userId) {
    const student = this.currentStudents.find(s => s.userId === userId);
    if (!student) return;

    this.currentPortfolioUserId = userId;
    const modal = document.getElementById("modal-student-portfolio");
    if (!modal) return;

    document.getElementById("portfolio-student-name").textContent = `${student.name} 학생 독서 포트폴리오`;
    document.getElementById("portfolio-student-meta").textContent = `출석번호 ${student.number}번 | 아이디: ${student.userId} | 1반`;

    document.getElementById("portfolio-stat-leaves").textContent = `${student.leaves || student.totalLeaves || 0}권`;
    document.getElementById("portfolio-stat-fruits").textContent = `${student.fruits || student.totalFruits || 0}개`;

    // 학생이 남긴 독서 기록 필터
    const studentRecords = this.currentRecords.filter(r => r.userId === userId);
    document.getElementById("portfolio-stat-records").textContent = `${studentRecords.length}개`;
    const stampedCount = studentRecords.filter(r => r.teacherFeedback && r.teacherFeedback.stamp).length;
    document.getElementById("portfolio-stat-stamps").textContent = `${stampedCount}개`;

    const recordsContainer = document.getElementById("portfolio-records-list");
    if (recordsContainer) {
      if (studentRecords.length === 0) {
        recordsContainer.innerHTML = `<div class="p-4 text-center text-gray-400 text-xs">작성한 활동 기록이 없습니다.</div>`;
      } else {
        recordsContainer.innerHTML = studentRecords.map(r => `
          <div class="p-2.5 bg-white rounded-xl border border-gray-100 flex items-center justify-between gap-2 text-xs">
            <div class="overflow-hidden">
              <span class="font-bold text-gray-900">${r.title || (r.book && r.book.title) || '활동 기록'}</span>
              <span class="text-[10px] text-gray-400 ml-1.5">${new Date(r.createdAt).toLocaleDateString()}</span>
              <p class="text-[11px] text-gray-500 truncate mt-0.5">${r.content}</p>
            </div>
            ${r.teacherFeedback ? `
              <span class="badge-pill bg-amber-50 text-amber-800 border border-amber-200 text-[10px] whitespace-nowrap flex-shrink-0">
                ${r.teacherFeedback.stamp ? r.teacherFeedback.stamp.split(" ")[0] : '🏅'} 칭찬완료
              </span>
            ` : ''}
          </div>
        `).join("");
      }
    }

    // 기존 평가 의견 불러오기
    const evalInput = document.getElementById("portfolio-evaluation-text");
    if (evalInput) {
      evalInput.value = (student.evaluation && student.evaluation.summary) || "";
    }

    modal.classList.remove("hidden");
    modal.classList.add("flex");
  },

  insertEvaluationTemplate(type) {
    const input = document.getElementById("portfolio-evaluation-text");
    if (!input) return;

    const templates = {
      dadaok: "풍부한 독서량을 바탕으로 다양한 장르의 도서를 깊이 있게 탐독하며, 학급 독서 활동에 성실하고 모범적으로 참여함.",
      empathy: "작품 속 등장인물의 감정과 내면 심리를 섬세하게 공감하며 따뜻하고 감동적인 독서 감상평을 작성함.",
      critical: "작품 속 사건과 배경을 다각도로 분석하고, 자신의 주관과 가치관을 논리적으로 피력하는 능력이 뛰어남.",
      creative: "가상 인물 인터뷰와 책 꼬리잇기 활동에서 기발한 상상력과 창의적인 질문을 던지며 작품의 세계관을 주도적으로 확장함."
    };

    const text = templates[type] || "";
    if (input.value.trim()) {
      input.value += " " + text;
    } else {
      input.value = text;
    }
  },

  async saveCurrentEvaluation() {
    const userId = this.currentPortfolioUserId;
    if (!userId) return;

    const summary = document.getElementById("portfolio-evaluation-text").value.trim();
    const evaluation = {
      summary: summary,
      teacherName: "담임선생님",
      updatedAt: new Date().toISOString()
    };

    // 1. Firestore 저장
    if (window.FirebaseRepo) {
      await window.FirebaseRepo.saveStudentEvaluation(userId, evaluation);
    }

    // 2. 로컬 스토리지 동기화
    const student = this.currentStudents.find(s => s.userId === userId);
    if (student) {
      student.evaluation = evaluation;
    }
    const saved = localStorage.getItem("BOOK_VILLAGE_MOCK_STORAGE");
    if (saved) {
      try {
        const db = JSON.parse(saved);
        const u = db.users.find(x => x.userId === userId);
        if (u) u.evaluation = evaluation;
        localStorage.setItem("BOOK_VILLAGE_MOCK_STORAGE", JSON.stringify(db));
      } catch(e) {}
    }

    alert("💾 학생의 생활기록부 독서 평가 의견이 파이어베이스에 성공적으로 저장되었습니다!");
    Modal.closeModal("modal-student-portfolio");
    this.renderAdminDashboard();
  },

  // 4. 전체 독서 평가 CSV 다운로드
  downloadEvaluationCsv() {
    const students = this.currentStudents;
    if (!students || students.length === 0) {
      alert("다운로드할 학생 데이터가 없습니다.");
      return;
    }

    const headers = ["출석번호", "이름", "아이디", "완독권수(이파리)", "열매수", "작성활동수", "교사칭찬도장수", "생기부종합의견"];
    let csv = "\uFEFF"; // UTF-8 BOM
    csv += headers.join(",") + "\r\n";

    students.forEach(s => {
      const records = this.currentRecords.filter(r => r.userId === s.userId);
      const stamps = records.filter(r => r.teacherFeedback && r.teacherFeedback.stamp).length;
      const evalText = (s.evaluation && s.evaluation.summary) ? s.evaluation.summary.replace(/"/g, '""') : "";

      const row = [
        s.number || "",
        `"${s.name || ''}"`,
        `"${s.userId || ''}"`,
        s.leaves || s.totalLeaves || 0,
        s.fruits || s.totalFruits || 0,
        records.length,
        stamps,
        `"${evalText}"`
      ];
      csv += row.join(",") + "\r\n";
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `1반_독서활동_종합평가표_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },

  // 5. 비밀번호 초기화
  async resetStudentPassword(userId, name) {
    if (!confirm(`[${name}] 학생의 비밀번호를 기본 '123456'으로 초기화하시겠습니까?`)) {
      return;
    }

    await window.AdminApi.resetStudentPassword(userId, "123456");
    alert(`🔑 [${name}] 학생의 비밀번호가 '123456'으로 초기화되었습니다.`);
  },

  // 6. 학생 계정 삭제
  async deleteStudent(userId, name) {
    if (!confirm(`⚠️ 정말로 [${name}] 학생의 계정을 삭제하시겠습니까?\n작성된 기록 및 통계가 정리됩니다.`)) {
      return;
    }

    await window.AdminApi.deleteStudent(userId);
    alert(`🗑️ [${name}] 학생 계정이 삭제되었습니다.`);
    await this.loadClassStats();
  },

  // ==========================================
  // 기존 CSV 일괄 생성 & 시스템 설정 호환
  // ==========================================
  openBatchRegisterModal() {
    const modal = document.getElementById("modal-batch-register");
    if (modal) {
      modal.classList.remove("hidden");
      modal.classList.add("flex");
    }
  },

  downloadCsvTemplate() {
    if (window.CsvParser) window.CsvParser.downloadTemplate();
  },

  parsedCsvRows: [],
  lastBatchResults: [],

  async handleCsvFileSelect(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    try {
      const rows = await window.CsvParser.parseFile(file);
      if (!rows || rows.length === 0) {
        alert("CSV 파일에서 읽을 수 있는 데이터가 없습니다.");
        return;
      }
      const validated = window.Validator.validateRows(rows);
      this.parsedCsvRows = validated;
      this.renderCsvPreview(validated);
    } catch (err) {
      alert("CSV 파일 파싱 중 오류가 발생했습니다: " + err.message);
    }
  },

  renderCsvPreview(rows) {
    const previewArea = document.getElementById("csv-preview-area");
    const summarySpan = document.getElementById("csv-preview-summary");
    const tbody = document.getElementById("csv-preview-tbody");
    if (!previewArea || !tbody) return;

    previewArea.classList.remove("hidden");
    const validCount = rows.filter(r => r.isValid).length;
    summarySpan.innerHTML = `총 <b>${rows.length}</b>명 (정상: <span class="text-emerald-600 font-bold">${validCount}</span>, 오류: <span class="text-rose-600 font-bold">${rows.length - validCount}</span>)`;

    tbody.innerHTML = rows.map((r) => `
      <tr class="${r.isValid ? 'hover:bg-emerald-50/50' : 'bg-rose-50 text-rose-800'}">
        <td class="p-2 border-b">${r._line}</td>
        <td class="p-2 border-b font-medium">${r.grade}학년 ${r.classNo}반 ${r.number}번</td>
        <td class="p-2 border-b font-bold">${r.name}</td>
        <td class="p-2 border-b font-mono text-gray-600">${r.computedLoginId}</td>
        <td class="p-2 border-b">
          ${r.isValid 
            ? '<span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">정상</span>' 
            : `<span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-200 text-rose-900" title="${r.errors.join(', ')}">${r.errors[0]}</span>`}
        </td>
      </tr>
    `).join("");

    const btnExec = document.getElementById("btn-execute-bulk");
    if (btnExec) {
      btnExec.disabled = validCount === 0;
      btnExec.textContent = `🚀 정상 ${validCount}명 파이어베이스 계정 생성 실행`;
    }
  },

  async executeBulkCreate() {
    const validRows = (this.parsedCsvRows || []).filter(r => r.isValid);
    if (validRows.length === 0) {
      alert("생성 가능한 정상 데이터가 없습니다.");
      return;
    }

    if (!confirm(`총 ${validRows.length}명의 학생 계정을 파이어베이스에 일괄 생성하시겠습니까?`)) {
      return;
    }

    const progressContainer = document.getElementById("csv-progress-container");
    const progressBar = document.getElementById("csv-progress-bar");
    const progressText = document.getElementById("csv-progress-text");
    const btnExec = document.getElementById("btn-execute-bulk");
    const btnDownload = document.getElementById("btn-download-results");

    if (progressContainer) progressContainer.classList.remove("hidden");
    if (btnExec) btnExec.disabled = true;

    try {
      const res = await window.AdminApi.bulkCreate(validRows, (current, total) => {
        const pct = Math.round((current / total) * 100);
        if (progressBar) progressBar.style.width = pct + "%";
        if (progressText) progressText.textContent = `${pct}% 처리 완료 (${current}/${total}명)`;
      });

      if (res.success) {
        this.lastBatchResults = res.results;
        alert(`🎉 파이어베이스 일괄 계정 생성 완료! (성공: ${res.successCount}명)`);
        if (btnDownload) btnDownload.classList.remove("hidden");
        await this.loadClassStats();
      } else {
        alert("오류 발생: " + res.message);
      }
    } catch (err) {
      alert("실행 실패: " + err.message);
    } finally {
      if (btnExec) btnExec.disabled = false;
    }
  },

  downloadResultsCsv() {
    if (this.lastBatchResults && this.lastBatchResults.length > 0) {
      window.CsvParser.downloadResults(this.lastBatchResults);
    } else {
      alert("다운로드할 결과 데이터가 없습니다.");
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

  saveSettings() {
    const url = document.getElementById("setting-gas-url").value.trim();
    localStorage.setItem("BOOK_VILLAGE_GAS_URL", url);
    CONFIG.GAS_API_URL = url;
    alert("설정이 저장되었습니다.");
    Modal.closeModal("modal-system-settings");
  }
};
