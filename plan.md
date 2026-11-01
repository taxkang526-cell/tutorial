# 한결 세무회계 사이트 Next.js 재구축 계획

- 대상: https://tutorial-two-puce.vercel.app/ (이 저장소 루트의 정적 HTML/CSS/JS와 동일한 사이트)
- 목표: 현재 화면과 기능을 유지한 채 Next.js로 옮기고, 실제 운영에 빠져 있는 것(상담 신청 전송, SEO, 법적 고지)을 채운다.
- 작성일: 2026-11-01

## 1. 현재 사이트 분석

### 구성

정적 사이트이며 프레임워크, 빌드 도구, 서버, 이미지 파일이 없다. 헤더와 푸터는 JS 문자열로 주입한다.

| 파일 | 줄 수 | 역할 |
| --- | --- | --- |
| `css/common.css`, `components.css`, `pages.css` | 731 | 디자인 토큰, 레이아웃, 컴포넌트 |
| `js/data.js` | 211 | 세무 일정, 후기 4건, 칼럼 8건, 분야별 준비물 |
| `js/layout.js` | 127 | 사무실 정보, 메뉴, 헤더/푸터/상담 띠/모바일 고정 바 |
| `js/common.js` | 107 | 스크롤, 모바일 메뉴, 등장 효과, 아코디언, 서브 메뉴 강조 |
| `js/home.js`, `insights.js`, `contact.js`, `faq.js` | 약 410 | 페이지별 동작 |

### 페이지와 기능

| 현재 경로 | 새 경로 | 내용 | 브라우저 동작이 필요한 기능 |
| --- | --- | --- | --- |
| `index.html` | `/` | 히어로, 숫자, 업무 6종, 선택 이유, 고객 유형, 후기, 최신 칼럼 3건 | 이번 달 일정과 D-day, 숫자 카운트업, 후기 슬라이더(자동 재생 6초, 스와이프) |
| `about.html` | `/about` | 인사말, 가치, 연혁, 세무사 3인, 조직, 갤러리(사진 자리만 있음), 오시는 길 | 서브 메뉴 강조 |
| `services.html` | `/services` | 업무 6종 상세, 진행 절차, 수수료 표, 사례 3건 | 서브 메뉴 강조 |
| `insights.html` | `/insights` | 연간 달력, 칼럼 목록과 모달, 부가세 계산기 | 달력 강조, 분야 탭, `#col-N` 모달 열기, 계산기 |
| `faq.html` | `/faq` | 질문 21건, 7개 분야 | 탭, 검색, `?cat=` 초기 탭, 아코디언 |
| `contact.html` | `/contact` | 연락 수단, 신청 폼, 준비물, 운영시간, 개인정보 안내 | 영업 상태, `?type=` 초기값, 분야별 준비물, 전화번호 하이픈, 글자 수, 폼 검증 |

### 재구축 때 고칠 문제

| # | 문제 | 근거 | 조치 |
| --- | --- | --- | --- |
| 1 | **상담 신청이 어디에도 전송되지 않는데 "접수되었습니다"라고 표시한다.** 고객 문의가 그대로 사라진다. | `js/contact.js:96-99` | 실제 전송 구현 (4단계) |
| 2 | 개인정보 안내의 수집 항목에 폼이 받는 `연락받기 편한 시간`, `희망 상담 방식`이 없다. | `contact.html:181` | 안내 문구 수정 |
| 3 | 푸터의 개인정보처리방침이 상담 폼의 동의 안내로 연결되며, 별도 방침 문서가 없다. | `js/layout.js:103` | `/privacy` 신설 |
| 4 | `robots.txt`, `sitemap.xml`, `favicon.ico`가 모두 404이고 OG 태그와 구조화 데이터가 없다. | 배포 사이트 요청 결과 | Next 메타데이터로 추가 |
| 5 | 칼럼이 모달 안에만 있어 글마다 고유 URL과 제목이 없다. | `js/insights.js:72` | 칼럼별 상세 페이지 |
| 6 | 영업 상태와 D-day가 방문자 기기의 시간대를 따른다. 해외 방문자에게는 틀리게 표시된다. | `js/contact.js:14`, `js/common.js:100` | 한국 시간 기준으로 계산 |
| 7 | 전화번호, 이메일, 주소가 `contact.html`과 `about.html`에 직접 적혀 있어 `SITE`와 중복된다. | `contact.html:32-53` | `SITE` 한 곳으로 통합 |
| 8 | 슬라이더 자동 재생에 정지 버튼이 없고 키보드 포커스에도 멈추지 않는다. 탭은 `role="tab"`이지만 방향키가 동작하지 않는다. `.reveal` 요소는 JS가 없으면 보이지 않는다. | `js/home.js`, `css/common.css:174` | 접근성 보완 (3, 6단계) |

### 그대로 유지할 것

부가세 계산기 공식은 고치지 않는다. 0원부터 500만 원까지 모든 금액을 정수 연산과 비교했을 때 부동소수점 오차가 한 건도 없었다.

## 2. 기술 결정

| 항목 | 결정 | 이유 |
| --- | --- | --- |
| 프레임워크 | Next.js 16 App Router, TypeScript strict, npm | 현재 최신(16.4.3). 로컬 Node 24에서 실행 가능 |
| 렌더링 | 전 페이지 정적 생성, 상담 전송만 Server Action | 내용이 자주 바뀌지 않으며 서버 비용이 들지 않는다 |
| 스타일 | 기존 CSS 3개를 전역 CSS로 이전, Tailwind 미도입 | 화면 동일성을 지키기 가장 쉽고, 다시 작성할 이유가 없다 |
| 콘텐츠 | `src/content/*.ts`에 타입이 있는 데이터로 관리, CMS 미도입 | 칼럼 8건 규모에는 과하다. 지금도 "이 파일만 수정" 방식이다 |
| 폰트 | `next/font/google`로 Noto Sans KR, Noto Serif KR 제공 | 레이아웃 흔들림과 외부 요청이 줄어든다 |
| 폼 전송 | Server Action + zod + Resend 이메일. DB 미사용 | 사무실 메일로 받으면 충분하고, 개인정보 저장소를 새로 만들지 않아도 된다 |
| 스팸 방지 | 허니팟 + Cloudflare Turnstile | 서버리스 환경에서는 메모리 기반 호출 제한을 믿을 수 없다 |
| 테스트 | Vitest(계산 로직), Playwright(주요 흐름, 화면 비교) | 원본과 비교해 회귀를 찾아낸다 |
| 배포 | Vercel 새 프로젝트 | 현재 호스팅과 같다. 기존 사이트는 전환 전까지 유지한다 |
| 위치 | `C:\Users\tax52\hangyeol-tax`, 새 Git 저장소 | 이 저장소에는 `tax-monitor`, `sns-infographic` 등 무관한 폴더가 섞여 있다 |

## 3. 프로젝트 구조

```text
src/
├─ app/
│  ├─ layout.tsx              # 폰트, 헤더/푸터, 기본 메타데이터
│  ├─ page.tsx                # 홈
│  ├─ about/page.tsx
│  ├─ services/page.tsx
│  ├─ insights/page.tsx
│  ├─ insights/[slug]/page.tsx # 칼럼 상세 (generateStaticParams)
│  ├─ faq/page.tsx
│  ├─ contact/page.tsx
│  ├─ contact/actions.ts      # 상담 신청 Server Action
│  ├─ privacy/page.tsx
│  ├─ not-found.tsx
│  ├─ sitemap.ts
│  ├─ robots.ts
│  └─ globals.css             # 기존 CSS 이전
├─ components/
│  ├─ layout/                 # Header*, Footer, CtaBand, QuickBar, ToTop*
│  ├─ ui/                     # Reveal*, Accordion*, Tabs*, Subnav*, PageHero, SectionHead
│  ├─ home/                   # TaxSchedule*, Counter*, ReviewSlider*
│  ├─ insights/               # TaxCalendar*, ColumnList*, VatCalculator*, LegacyHashRedirect*
│  ├─ faq/                    # FaqExplorer*
│  └─ contact/                # ContactForm*, OfficeStatus*
├─ content/                   # site, schedule, reviews, columns, faq, services, team, history, prep
└─ lib/                       # tax-date, vat, phone, contact-schema
```

`*`는 Client Component이고, 나머지는 Server Component로 작성해 브라우저로 보내는 JS를 줄인다.

## 4. 작업 단계

각 단계가 끝나면 커밋한다. 괄호 안은 완료 기준이다.

### 0단계. 프로젝트 준비

- [ ] `create-next-app`으로 프로젝트 생성, Git 저장소 초기화
- [ ] ESLint, Vitest, Playwright 설정
- [ ] 원본 사이트를 데스크톱(1440px), 태블릿(768px), 모바일(390px)로 페이지별 캡처해 비교 기준으로 보관

(`npm run build`, `lint`, `test`가 빈 프로젝트에서 통과)

### 1단계. 기반과 콘텐츠

- [ ] CSS 3개와 디자인 토큰을 `globals.css`로 이전, 폰트 연결
- [ ] `data.js`, `layout.js`의 데이터를 타입과 함께 `src/content`로 이전
- [ ] HTML에 직접 적힌 내용을 데이터로 추출: 업무 6종, FAQ 21건, 세무사, 연혁, 수수료, 사례
- [ ] FAQ 답변은 목록을 포함하는 경우가 있으므로 문단과 목록을 표현할 수 있는 구조로 설계
- [ ] 순수 로직을 `lib`로 이전하고 테스트 작성

| 테스트 대상 | 확인할 경우 |
| --- | --- |
| `tax-date` | 토요일과 일요일의 월요일 조정, 월을 넘기는 조정, D-day, 한국 시간 자정 경계 |
| `vat` | 공급가액 기준, 합계금액 기준, 0원, 13자리 |
| `phone` | 자릿수별 하이픈 형식 |

(원본 문구가 콘텐츠 파일에 빠짐없이 들어가고 단위 테스트 통과)

### 2단계. 공통 레이아웃

- [ ] Header(스크롤 배경, 모바일 메뉴, Esc 닫기, 현재 메뉴 표시), Footer, CtaBand(상담 페이지 제외), QuickBar, ToTop
- [ ] 공통 UI: PageHero, Breadcrumb, Subnav, Reveal, Accordion, Tabs
- [ ] 키보드와 JS 미실행 보완: 탭 방향키 지원, JS 없이도 `.reveal` 내용 표시

(6개 경로가 공통 레이아웃과 함께 열리고 모바일 메뉴가 동작)

### 3단계. 정적 페이지와 기능 이전

- [ ] `/about`, `/services`
- [ ] `/` : 일정은 시간에 따라 달라지므로 브라우저에서 계산한다. 숫자는 HTML에 최종값을 넣고 애니메이션만 추가한다.
- [ ] 후기 슬라이더: 정지 버튼 추가, 포커스 시 일시정지, `prefers-reduced-motion` 유지
- [ ] `/insights` : 달력, 분야 탭, 계산기
- [ ] 칼럼 상세 `/insights/[slug]` : 칼럼에 영문 slug와 기존 ID를 함께 저장, 모달은 페이지로 대체
- [ ] `/faq` : `?cat=`, 검색, 결과 수, 결과 없음 표시
- [ ] `/contact` 화면: 영업 상태, `?type=`, 준비물, 하이픈, 글자 수, 클라이언트 검증

주의점:

- 정적 HTML은 빌드 시점에 고정되므로 "오늘"에 의존하는 값(D-day, 영업 상태, 이번 달 강조)은 마운트 후 계산해 hydration 불일치를 막는다.
- 모든 날짜 계산은 `Asia/Seoul` 기준으로 한다.
- `useSearchParams`를 쓰는 컴포넌트는 `Suspense`로 감싼다.

(1장의 모든 기능이 동작하고 원본 캡처와 시각적으로 일치)

### 4단계. 상담 신청 실제 전송

- [ ] zod 스키마를 클라이언트와 서버에서 공유하고, 서버에서 다시 검증
- [ ] Server Action에서 Resend로 사무실 메일 발송
- [ ] 허니팟과 Turnstile 적용, 발송 중 버튼 비활성화로 중복 제출 방지
- [ ] **발송에 성공했을 때만 접수 메시지 표시.** 실패하면 입력값을 유지하고 전화 연락처를 안내
- [ ] 고객 입력값을 서버 로그에 남기지 않기
- [ ] `RESEND_API_KEY`, `CONTACT_TO_EMAIL`, Turnstile 키를 환경 변수로 분리하고 `.env.example` 작성

(실제 메일 수신 확인, 발송 실패를 흉내 냈을 때 성공 메시지가 나오지 않음)

### 5단계. SEO와 법적 고지

- [ ] 페이지별 `metadata`, canonical, OG 이미지, favicon
- [ ] `sitemap.ts`, `robots.ts`, 칼럼 상세 포함
- [ ] JSON-LD: `AccountingService`(사무실), `Article`(칼럼), `FAQPage`(FAQ)
- [ ] `/privacy` 작성, 폼 수집 항목 안내 수정, 푸터 링크 변경
- [ ] Resend 이용에 따른 처리 위탁과 국외 이전 고지 여부 검토
- [ ] 기존 주소 호환

| 기존 주소 | 처리 |
| --- | --- |
| `/index.html` | `/`로 영구 리다이렉트 |
| `/about.html` 등 나머지 5개 | 새 경로로 영구 리다이렉트 (`?type=`, `?cat=` 유지) |
| `/insights#col-N` | 해시는 서버에 전달되지 않으므로 `LegacyHashRedirect`가 브라우저에서 칼럼 상세로 이동 |

(Lighthouse로 메타데이터와 구조화 데이터 확인, 기존 주소 전부 정상 이동)

### 6단계. 품질 검증

- [ ] Playwright 주요 흐름: 메뉴 이동, 업무 분야에서 `?type=`으로 상담 진입, FAQ 탭과 검색, 칼럼 탭과 상세, 계산기, 폼 오류와 성공
- [ ] 3개 화면 폭에서 원본과 화면 비교
- [ ] 키보드 전체 조작 확인, axe 접근성 검사에서 심각 및 중대 위반 0건
- [ ] Lighthouse 모바일 목표: Performance 90, Accessibility 95, SEO 100 이상
- [ ] 콘솔 오류와 hydration 경고 0건

### 7단계. 배포와 전환

- [ ] Vercel 새 프로젝트 연결, 환경 변수 등록, 미리보기 배포에서 메일 전송 확인
- [ ] 8장의 공개 전 교체 항목 완료
- [ ] 운영 도메인 연결, Search Console에 사이트맵 제출
- [ ] 기존 Vercel 프로젝트는 문제가 없음을 확인할 때까지 유지

## 5. 범위에서 제외

- 관리자 페이지, CMS, 회원 로그인, 온라인 결제
- 상담 내역 DB 저장
- 다국어 지원
- 디자인 개편
- 공휴일 자동 반영 (현재처럼 안내 문구로 고지)

## 6. 주요 위험

| 위험 | 대응 |
| --- | --- |
| 정적 HTML의 날짜가 빌드 시점에 고정됨 | 날짜 의존 값은 브라우저에서 계산, 달력과 일정 로직 테스트 |
| Resend 장애로 문의 유실 | 실패를 고객에게 그대로 알리고 전화, 카카오톡 안내 |
| 칼럼의 세법 수치가 개정으로 낡음 | 공개 전 세무사 검수, 칼럼에 기준일 표시 |
| CSS 이전 중 화면 차이 발생 | 단계별로 원본 캡처와 비교 |

## 7. 완료 기준

- 1장의 모든 페이지와 기능이 새 경로에서 동작한다.
- 1장의 문제 8건이 모두 해결되었다.
- 상담 신청이 실제로 사무실 메일에 도착한다.
- 기존 URL이 모두 새 주소로 연결된다.
- 6단계 검증과 8장의 교체를 마쳤다.

## 8. 공개 전 사무실에서 제공해야 할 항목

코드로 해결할 수 없으며 현재 사이트에 임시값으로 들어 있는 항목이다. **특히 앞의 3개는 사실이 아닌 내용이 고객에게 그대로 보이므로 공개 전에 반드시 교체한다.**

- [ ] 고객 후기 4건: 고객 동의를 받은 실제 후기로 교체 (현재 예시)
- [ ] 상담 사례 3건: 실제 사례 기반인지 확인 (예시 표시 없이 게시 중)
- [ ] 수수료 표: 실제 금액으로 교체 (현재 예시)
- [ ] 후기, 사례, 숫자 표현(1,200+ 고객 등)이 세무사 광고 규정에 맞는지 확인
- [ ] 사업자등록번호 (현재 `000-00-00000`)
- [ ] 카카오톡 채널 주소 (현재 `https://pf.kakao.com/`)
- [ ] 세무사 학력과 경력의 `○○`, 지하철역과 버스 노선의 `○○`
- [ ] 사무실 사진 5장, 세무사 사진 3장, 로고 파일
- [ ] 지도 임베드 여부와 실제 전화, 이메일, 주소
- [ ] 개인정보처리방침 최종 문안 (개인정보 보호책임자 포함)
- [ ] 칼럼 8건과 FAQ 21건의 세법 내용 검수
- [ ] 운영 도메인, 상담 수신 메일 주소, Resend 발신 도메인 인증 권한
