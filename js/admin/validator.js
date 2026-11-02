/**
 * 관리자 CSV 업로드 클라이언트 유효성 검사기 (validator.js)
 */

export const Validator = {
  validateRows(rows) {
    const validated = [];
    const seenIds = new Set();
    const seenStudentKeys = new Set();

    rows.forEach(row => {
      const errors = [];
      const grade = parseInt(row.grade, 10);
      const classNo = parseInt(row.classNo, 10);
      const number = parseInt(row.number, 10);

      // 필수값 검증
      if (!row.grade || isNaN(grade) || grade < 1 || grade > 6) {
        errors.push("학년(1~6) 오류");
      }
      if (!row.classNo || isNaN(classNo) || classNo < 1 || classNo > 30) {
        errors.push("반(1~30) 오류");
      }
      if (!row.number || isNaN(number) || number < 1 || number > 60) {
        errors.push("번호(1~60) 오류");
      }
      if (!row.name || row.name.length < 1 || row.name.length > 20) {
        errors.push("이름(1~20자) 누락");
      }

      // 학년/반/번호 중복 검증
      const studentKey = `${grade}-${classNo}-${number}`;
      if (seenStudentKeys.has(studentKey)) {
        errors.push(`동일 학년/반/번호(${studentKey}) 중복`);
      } else {
        seenStudentKeys.add(studentKey);
      }

      // 자동 생성 아이디 또는 수동 아이디
      const autoId = `s${grade}${String(classNo).padStart(2, "0")}${String(number).padStart(2, "0")}`;
      const loginId = (row.loginId || autoId).toLowerCase();

      if (!/^[a-z0-9_-]{4,20}$/.test(loginId)) {
        errors.push("아이디 형식 오류 (영소문자/숫자 4~20자)");
      }

      if (seenIds.has(loginId)) {
        errors.push(`아이디(${loginId}) 중복`);
      } else {
        seenIds.add(loginId);
      }

      // 초기 비밀번호 검증
      if (row.initialPassword && row.initialPassword.length < 6) {
        errors.push("비밀번호 6자 이상 필요");
      }

      validated.push({
        ...row,
        computedLoginId: loginId,
        isValid: errors.length === 0,
        errors
      });
    });

    return validated;
  }
};
