# 🏡 책마을 : 우리 반 독서 빌리지 — 배포 및 설정 가이드

본 문서는 **Google Apps Script(GAS) 백엔드 배포**, **알라딘 Open API TTBKey 설정**, **GitHub Pages 프론트엔드 호스팅** 및 **학급 학생 일괄 등록** 절차를 단계별로 안내합니다.

---

## 1단계: Google 스프레드시트 및 Apps Script 백엔드 설정

1. [Google 스프레드시트](https://sheets.google.com)에 접속하여 **새 스프레드시트**를 만듭니다. (이름 예: `책마을_데이터베이스`)
2. 상단 메뉴에서 **[확장 프로그램] → [Apps Script]**를 클릭합니다.
3. 좌측 `코드.gs` 파일의 기본 내용을 모두 지우고, 프로젝트의 `backend/Code.js` 내용 전체를 복사하여 붙여넣습니다.
4. 좌측 상단 함수 선택 드롭다운에서 **`initDatabase`**를 선택한 후 **[실행]** 버튼을 누릅니다.
   - 최초 실행 시 "권한 검토" 팝업이 뜨면 계정을 선택하고 허용합니다.
   - 실행이 완료되면 스프레드시트에 8개의 시트(`Users`, `Books`, `Records`, `Connections`, `BlindStatus`, `Comments`, `Reactions`, `ClassTree`)가 자동 생성되고 기본 교사 계정(`teacher` / `admin1234`)이 생성됩니다.

---

## 2단계: 알라딘 Open API TTBKey 설정

1. [알라딘 Open API 센터](https://www.aladin.co.kr/openapi/wopenopen.aspx)에서 무료로 **TTBKey**를 발급받습니다.
2. Apps Script 편집기 좌측 메뉴에서 **[프로젝트 설정 (톱니바퀴 아이콘 ⚙️)]**을 클릭합니다.
3. 화면 하단의 **[스크립트 속성]** 섹션에서 **[스크립트 속성 추가]**를 누릅니다:
   - **속성(Property)**: `ALADIN_TTB_KEY`
   - **값(Value)**: 발급받은 알라딘 TTBKey 문자열
4. **[스크립트 속성 저장]**을 누릅니다.

---

## 3단계: Apps Script 웹 앱 배포 (Web App URL 발급)

1. Apps Script 편집기 우측 상단의 파란색 **[배포] → [새 배포]**를 클릭합니다.
2. 유형 선택(톱니바퀴)에서 **[웹 앱]**을 선택합니다.
3. 설정을 다음과 같이 지정합니다:
   - **설명**: `책마을 API Gateway v1`
   - **다음 사용자로 실행**: `나(내 Google 계정)`
   - **액세스 권한이 있는 사용자**: `모든 사용자 (Anyone)` *(학생들이 구글 로그인 없이 접근하기 위함)*
4. **[배포]**를 누르면 발급되는 **웹 앱 URL (`https://script.google.com/macros/s/.../exec`)**을 복사합니다.

---

## 4단계: GitHub Pages 프론트엔드 배포

1. GitHub에 새 Repository를 생성합니다 (예: `book-village`).
2. 프로젝트의 모든 파일(`index.html`, `css/`, `js/`, `assets/`, `backend/`)을 저장소에 push합니다.
3. `js/config.js` 파일을 열고, 3단계에서 복사한 웹 앱 URL을 붙여넣습니다:
   ```javascript
   const CONFIG = {
     GAS_API_URL: "https://script.google.com/macros/s/AKfycbyKt7RD6O0nDDnx8Wu-bxuVvWts_6hmZQ9SqC0WAqNQDKNVnktoFv_6t-Dosib2hpaFTQ/exec",
     // ...
   };
   ```
4. GitHub 저장소의 **[Settings] → [Pages]** 탭으로 이동합니다.
5. **Source**를 `Deploy from a branch`, **Branch**를 `main` / `root`로 선택하고 **[Save]**를 누릅니다.
6. 1~2분 후 생성되는 **GitHub Pages URL (`https://<username>.github.io/book-village`)**로 접속하면 학급 전용 독서 빌리지가 오픈됩니다!

---

## 5단계: 학급 운영 시작 (학생 일괄 등록)

1. 배포된 웹사이트에 접속합니다.
2. 우측 상단 **[⚡ 빠른 체험] → [담임선생님 (관리자)]**을 누르거나 `teacher` / `admin1234`로 로그인합니다.
3. 상단 메뉴의 **[🏫 교사 관리]** 탭으로 이동합니다.
4. **[👥 학생 일괄 등록]** 버튼을 누르고 우리 반 학생 명단을 입력합니다:
   ```text
   1 김하늘
   2 이바다
   3 박우주
   4 최별
   ```
5. 등록 즉시 학생들에게 `s01`, `s02` 아이디와 초기 비밀번호 `1234`가 부여됩니다.
6. 학생들에게 사이트 주소를 공유하고 독서마을 활동을 시작하세요!
