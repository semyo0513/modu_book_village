/**
 * CSV 파서 및 템플릿 생성기 (csvParser.js)
 */

(function(global) {
  const CsvParser = {
    downloadTemplate() {
      const headers = ["학년", "반", "번호", "이름", "닉네임", "아이디", "초기비밀번호", "역할"];
      const sampleRows = [
        ["3", "1", "1", "김하늘", "하늘이", "s30101", "", "student"],
        ["3", "1", "2", "이바다", "바다", "", "", "student"],
        ["3", "1", "3", "박새싹", "", "", "pass1234", "student"]
      ];

      let csvContent = "\uFEFF";
      csvContent += headers.join(",") + "\r\n";
      sampleRows.forEach(row => {
        csvContent += row.map(this.escapeCsvCell).join(",") + "\r\n";
      });

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", "책마을_학생_일괄생성_양식.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    },

    downloadResults(results) {
      const headers = ["순번", "아이디", "이름", "닉네임", "초기비밀번호", "상태", "비고/오류"];
      let csvContent = "\uFEFF";
      csvContent += headers.join(",") + "\r\n";

      results.forEach((r, idx) => {
        let initialPw = r.initialPassword || "";
        if (/^[=+\-@]/.test(initialPw)) initialPw = "'" + initialPw;

        const row = [
          idx + 1,
          r.loginId || "",
          r.name || "",
          r.nickname || "",
          initialPw,
          r.status === "SUCCESS" ? "성공" : "실패",
          r.error || ""
        ];
        csvContent += row.map(this.escapeCsvCell).join(",") + "\r\n";
      });

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `책마을_계정발급결과_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    },

    escapeCsvCell(val) {
      if (val === null || val === undefined) return "";
      let str = String(val);
      if (str.includes(",") || str.includes("\"") || str.includes("\n") || str.includes("\r")) {
        return "\"" + str.replace(/"/g, "\"\"") + "\"";
      }
      return str;
    },

    async parseFile(file) {
      const buffer = await file.arrayBuffer();
      let text = "";
      try {
        const decoder = new TextDecoder("utf-8", { fatal: true });
        text = decoder.decode(buffer);
      } catch (e) {
        const decoder = new TextDecoder("euc-kr");
        text = decoder.decode(buffer);
      }
      return this.parseCsvText(text);
    },

    parseCsvText(text) {
      if (text.charCodeAt(0) === 0xFEFF) {
        text = text.substring(1);
      }

      const lines = text.split(/\r\n|\n|\r/).filter(l => l.trim().length > 0);
      if (lines.length < 2) return [];

      const headers = this.parseCsvLine(lines[0]).map(h => h.trim());
      const headerMap = {
        "학년": "grade",
        "반": "classNo",
        "번호": "number",
        "이름": "name",
        "닉네임": "nickname",
        "아이디": "loginId",
        "초기비밀번호": "initialPassword",
        "역할": "role"
      };

      const rows = [];
      for (let i = 1; i < lines.length; i++) {
        const values = this.parseCsvLine(lines[i]);
        if (values.length === 0 || values.every(v => !v.trim())) continue;

        const rowObj = { _line: i + 1 };
        headers.forEach((h, colIdx) => {
          const key = headerMap[h] || `col_${colIdx}`;
          rowObj[key] = values[colIdx] ? values[colIdx].trim() : "";
        });
        rows.push(rowObj);
      }

      return rows;
    },

    parseCsvLine(line) {
      const result = [];
      let current = "";
      let inQuotes = false;

      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === "\"") {
          if (inQuotes && line[i + 1] === "\"") {
            current += "\"";
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === "," && !inQuotes) {
          result.push(current);
          current = "";
        } else {
          current += char;
        }
      }
      result.push(current);
      return result;
    }
  };

  global.CsvParser = CsvParser;
})(typeof window !== "undefined" ? window : globalThis);
