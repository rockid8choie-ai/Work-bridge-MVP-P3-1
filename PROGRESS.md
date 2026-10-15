# PROGRESS — 작업 인수인계

> 새 세션·새 머신에서는 **이 파일부터** 읽는다. 매 작업 단위마다 갱신하고 커밋·푸시한다.
> 최종 갱신: 2026-10-15 저녁 (배포 느림 해결 · BLOCKED 원인 = 커밋 작성자 · Docker compose 완성 · 디자인 가이드 08)

---

## 0. 지금 상태 한 줄

Day 1(10/12) 구현 완료, Day 2(10/13)는 **Mac 이전 + RFP 원문 확보 + 기획서 원고 + AI 공정 분해 설계**로 썼다. 코드 변경 없음. 기본 필수 33항목 중 **12항목 구현·배포 검증 끝**. **10/14부터 지원 관리(트랜잭션) 구현 시작.**

- 배포: https://workbridge-gray.vercel.app (Vercel 프로젝트 `workbridge`, 팀 `rockid8choie-3144s-projects`). **이 주소만 공개용.** `workbridge-rockid8choie-3144s-projects.vercel.app` 쪽은 Vercel 보호가 걸려 로그인으로 튕긴다.
- 배포 속도(10/15 저녁): 홈·로그인·목록 0.05~0.4초. 함수 리전 sin1 ↔ Neon 싱가포르. 첫 요청(콜드 스타트)만 1~1.5초.
- 리포: https://github.com/rockid8choie-ai/Work-bridge-MVP-P3-1 (**private**, 제출 시 public 전환)
- 데모 계정: `owner@workbridge.test` / `pro@workbridge.test` (비밀번호 `demo1234`)
- **Mac 로컬: `~/Projects/workbridge`** — vercel link · env pull · prisma generate · `npm run dev` 까지 확인 끝(10/13). Windows 쪽은 더 이상 안 쓴다.
- 마지막 커밋: 아래 git log 참고 — 작업 트리 깨끗, origin/main 과 동일

---

## 1. Mac 에서 시작하기

```bash
git clone https://github.com/rockid8choie-ai/Work-bridge-MVP-P3-1.git workbridge
cd workbridge
npm install

# .env 복원 — 비밀값은 전부 Vercel(Development 환경)에 있다. 수동 입력 불필요.
npx vercel login
npx vercel link            # 팀 rockid8choie-3144s-projects → 프로젝트 workbridge 선택
npx vercel env pull .env   # DATABASE_URL, DIRECT_URL, JWT_*, *_TTL, PLATFORM_FEE_RATE

npx prisma generate
npm run dev                # http://localhost:3000
```

- **로컬 개발 DB 는 Docker Postgres (10/15 전환).** `npm run db:up` → `localhost:5433`. `.env.local` 이 이 DB 를 가리키고, `.env`(vercel env pull) 는 배포용 Neon 값이다. Next 는 `.env.local` 을 우선한다.
  - 호스트 5432 는 Homebrew `postgresql@18` 이 이미 쓰고 있어 **5433** 으로 매핑했다.
  - Docker 엔진은 **colima** (`colima start`). Docker Desktop 은 설치에 관리자 비밀번호가 필요해 보류. 재부팅 후엔 `colima start` 먼저.
  - 초기화: `npm run db:up && npx prisma migrate deploy && ALLOW_DEMO=1 npm run db:seed` (DATABASE_URL 은 .env.local 값 사용). 전부 지우고 다시: `npm run db:reset`.
  - Neon 으로 다시 보고 싶으면 `.env.local` 의 DATABASE_URL/DIRECT_URL 두 줄만 지운다.
- 앱까지 컨테이너로: `docker compose up --build` — db → migrate(마이그레이션 + 시드, build 단계 이미지) → web(Next standalone) 순서로 뜬다. 포트 바꾸려면 `WEB_PORT=3100 docker compose up -d web`.
- **git 작성자는 반드시 `rockid8choie-ai <rockid8choie@gmail.com>`** (`git config --global user.name/user.email`). 다른 이름으로 커밋하면 Vercel 이 그 커밋 배포를 `BLOCKED` 로 막는다(아래 4장).
- `.env` 에 `OAUTH_REDIRECT_BASE` 가 Vercel 에 없다. `.env.example` 참고해서 `http://localhost:3000` 한 줄 추가.
- Node 24 / npm 11 에서 개발했다. Next 16.4.0, Prisma 6.19.
- `next.config.ts` 의 `experimental.cpus: 2` 는 Windows 메모리 부족 때문에 둔 것. Vercel 에서는 자동 해제되고, Mac 에서 빌드가 느리면 그 줄을 지워도 된다.
- 테스트 계정 정리: `npx tsx scripts/cleanup-test-data.ts` (데모 계정은 건드리지 않음)

---

## 2. 끝난 것 (Day 1, 10/12)

### 문서 (`docs/`)
| 파일 | 내용 |
|---|---|
| `00-안내.md` | 프로젝트 요약 · 폴더 안내 · 제출물 목록 |
| `01-요구사항-분해.md` | 과제 명세 → 수용 기준 47항목(기본 33 / 고급 14 / 도전 4), 자율 결정 8건, 2주 일정 |
| `rfp/` | **과제 가이드 원문 5편**(배경·일정·RFP·제출·발표) — 10/13 확보 |
| `02-ERD.md` | dbdiagram DSL · 상태 전이 · 부수 효과 |
| `03-시장조사.md` | 왜 이 사업인가 · 경쟁 지도 · 예상 반박 7개 |
| `04-개발일지.md` | Day 1·2 일지(판단 근거 · 막힌 것 · 검증표) |
| `05-프로젝트-개요.md` | **기획서·발표 도입부 원고** — 수행 목적 · 한 줄 요약 · 상세 개요(거래 흐름 11단계) · 배경 및 문제 정의. 10/13 |
| `06-AI-공정분해-설계.md` | **공정표 생성 방식** — 공정 사전 · 단가 범위 · 구조화 JSON+zod · 폴백 · 전문가 수정 · ScopeChange · 심사 예상 질문. 10/13 |
| `07-시장조사-심화.md` | 심화 시장조사 (Windows 쪽에서 10/15 추가) |
| `08-디자인-가이드.md` | **2026 미국 매칭 플랫폼 매출 순위 기반 디자인 토큰·화면별 적용안** — 색·둥글기·CTA 규칙, 적용 순서 5단계. 10/15. 코드 적용은 스프린트 1 뒤 |
| `03-시장조사.md` 부록 B | 빌딩왕 보도자료 대조 · 보완 방안 (10/15) |

### 코드
| AC | 내용 | 상태 |
|---|---|---|
| B-01 | 이메일 가입·로그인, bcrypt, 중복 검증 | ✅ |
| B-02 | Access/Refresh 발급 · 자동 재발급 · 토큰 회전(Refresh 는 난수 + SHA-256 저장) | ✅ |
| B-05 | 역할별 프로필(건물주 / 전문가) | ✅ |
| B-06 | 프로필 미완성 시 428 `PROFILE_REQUIRED` → `/profile?next=` 복귀 | ✅ |
| B-07 | 프로젝트 등록 3단계 퍼널 | ✅ |
| B-10 | 프로젝트 상세 | ✅ |
| B-11~14 | 검색 · 필터 · 정렬 · 페이지네이션(10건) | ✅ |
| B-15 | 모집 시작일 기준 상태 자동 결정 | ✅ |
| B-17 | 외부 목록에 모집 단계만 노출 (`recruitStatus` / `dealStatus` 분리) | ✅ |
| B-30 | 로그인 상태별 헤더 분기 | ✅ |

Neon 연결 · 초기 마이그레이션(`20261012074602_init`) · 시드 · Vercel 배포까지 끝.

### GitHub
- 마일스톤 2개: 스프린트 1(기본 필수, ~10/17) · 스프린트 2(고급 필수, ~10/23)
- 이슈 22개(#1~#22). Day 1 에 끝난 #1 #3 #4 #6 #12 는 10/13 닫음. #5 #7 은 일부 완료(코멘트 참고).

---

## 2.5 진행 중 — 10/15 Windows 세션 (사용량 한도로 중단)

**PR #23 `feat/applications-notifications` (Draft)** — 스프린트 1 남은 기본 필수를 한 번에 구현. 커밋 2aa86fe + 7965675.
- 구현: 지원 제출·목록, 수락(트랜잭션)/거절, 모집 마감, 취소(B-32), 수정(예산·마감일 잠금)·소프트 삭제, 알림 6종+헤더 배지+읽음+클릭 이동, 북마크, 추천, 내 지원·내 프로젝트(B-33)·내 북마크, 공개 프로필, 탐색 필터 UI, 랜딩 검색·카테고리 진입, 시드 전문가 2명
- `tsc` · `eslint` 통과. 셀프 리뷰 코멘트 PR 에 남김(동시 수락 경쟁·마감 되살림 2건 수정 완료).
- **미완: 프리뷰 E2E 검증.** 스크립트는 스크랩패드 `e2e.sh`(Windows 임시폴더, 세션 종료 시 사라질 수 있음). 프리뷰는 Vercel Authentication 으로 보호돼 `vercel curl` 경유로 돌렸는데 PUT /api/profile 단계에서 멈춤(원인 미확인 — vercel curl 의 PUT 처리 또는 느린 npx 기동). **Mac 에서는 `npm run dev` 로 로컬에서 같은 시나리오를 돌리는 게 빠르다.** 시나리오: 가입3 → 428 → 프로필 → 프로젝트3 → 지원(403/201/409/400) → 알림4 → 수정잠금 409 → 수락→자동거절·알림 → 거절·마감·알림 → 읽음 → 북마크 → 취소·삭제 → 필터 → 화면 200.
- 테스트 계정 `e2e-*@wb.local` 3개가 Neon 에 남아 있을 수 있음 → `npx tsx scripts/cleanup-test-data.ts`
- 검증 끝나면: PR 본문 "검증" 채우기 → Draft 해제 → merge → main 자동 배포(Vercel GitHub 연동 확인됨) → 이슈 #5 #7 #8 #9 #10 #11 닫기 → 개발일지 3일차 작성.

## 3. 다음 할 일 (Day 3, 10/14 ~)

**지원 관리가 핵심.** 수락 한 번에 다섯 가지가 동시에 바뀜 → **Prisma 트랜잭션 하나로 묶기**:
해당 지원 `accepted` · 나머지 일괄 `rejected` · 프로젝트 `closed` + `awaiting_contract` · 수락 알림 1건 · 자동거절 알림 N건.

- [ ] #8 B-18, B-23 지원서 제출 · 중복 방지 · 제출 후 동선
- [ ] #9 B-19~22 지원자 관리 · 자동 거절 · 일괄 마감
- [ ] #10 B-24~26 인앱 알림 5종 · 헤더 미확인 표시 · 읽음 처리
- [ ] #5 B-08, B-09 프로젝트 수정 · 소프트 삭제
- [ ] #7 나머지 상태 전이
- [ ] #11 북마크 + 추천 프로젝트
- [ ] B-31 프로필 이미지 업로드(스토리지) · B-32 프로젝트 취소 · B-33 내 프로젝트 화면 — 10/13 RFP 대조로 추가
- [ ] #2 소셜 로그인(Google · Kakao) — OAuth 클라이언트 키 발급 필요
- [ ] 스프린트 1 계획서(워크스페이스 산출물)
- [ ] (스프린트 1 끝나고) 프로젝트 등록 **0단계 자연어 입력** — 한 줄 설명 → AI 가 카테고리·전문분야·키워드 추출해 3단계 폼 미리 채움. 3단계 폼은 유지(B-07). `docs/05` 흐름 1번. LLM 클라이언트·zod 검증 틀을 이때 만들어 스프린트 2 공정 분해에 재사용
- [ ] (스프린트 2) AI 공정 분해는 `docs/06` 설계대로 — 공정 사전 7종 채우기부터
- [ ] (ERD) `ScopeChange` 테이블 추가 — 계약 후 범위 변경 합의 기록. 구현은 도전 과제, 설계만 먼저

우선순위 고정: **기본 필수 → 고급 필수 → 문서·발표 → 도전 과제.** 도전 과제 중 C-01(마일스톤 분할 정산, #20)은 차별화 완결점이라 사수.

---

## 4. 막힌 것 · 정할 것

| 항목 | 상태 |
|---|---|
| ~~과제 원문(RFP) 파일이 어디에도 없다~~ | **해결(10/13)** — 사용자가 5편 재전달, `docs/rfp/` 에 커밋. 대조 결과 B-31~B-33 추가 |
| ~~Vercel 배포가 BLOCKED (10/15)~~ | **해결(10/15 저녁)**. 두 가지가 겹쳐 있었다. ① 느림: 함수 리전 iad1 ↔ Neon 싱가포르 → `vercel.json` regions sin1 + 프로젝트 설정 sin1, GitHub 연동 연결(이전엔 CLI 배포만). ② BLOCKED: 사유는 `COMMIT_AUTHOR_REQUIRED` — Mac 기본 git 작성자(`apple@…local`)가 GitHub 계정과 안 맞아 Vercel 이 빌드 거부. 작성자를 `rockid8choie-ai` 로 고정했다. Windows 커밋 `8aa7fde` 는 작성자가 맞아 정상 배포됐고 **프로덕션은 이미 sin1**. 남은 것: Vercel 대시보드 → Settings → Deployment Protection 이 "모든 배포(커스텀 도메인 제외)" 로 되어 있어 팀 이름 주소가 로그인으로 튕김. 공개 주소는 `workbridge-gray` 라 실사용엔 지장 없음. 원하면 Standard 로 내리기(API 변경은 권한 승인 필요해 미실행) |
| GitHub Projects 칸반 보드 | `gh` 토큰에 `project` 스코프 없음. `gh auth refresh -s project` 후 생성 |
| 팀명 | 제출 파일명 규칙 `[팀명]_[산출물명]_[버전]` 이라 1인이라도 팀명 필요 |
| OAuth 키 | Google · Kakao 클라이언트 ID/Secret 미발급 (#2 착수 전) |
| AI · PG 키 | `ANTHROPIC_API_KEY`, 토스 sandbox 키 미설정. **0단계 자연어 입력을 당기려면 AI 키가 먼저 필요** |

---

## 5. 운영 규칙

- `main` ← `feat/*` PR 경유, PR 본문에 판단 근거, 작성자/리뷰어 시점 분리 셀프 리뷰
- **BFS 코드 직접 포크 금지** — 제출물은 영구 공개. 본인이 쓴 인프라 모듈만 새로 작성해 이식
- 결제는 **sandbox 키만**
- 문서 원본은 `docs/*.md`. 바탕화면 `실무프로젝트 3-1\` 의 PDF 는 읽기용 사본 — 내용 고치면 PDF 재추출
- 세션이 자주 끊기므로 **단계마다 이 파일 갱신 + 커밋 + 푸시**

---

## 6. 최종 제출물 (10/25)

- 발표자료(PPT 또는 PDF)
- 배포 서비스 URL
- 깃허브 리포 URL(public 전환)
- ERD(PNG/PDF + 원본 링크) — `docs/02-ERD.md` 의 DSL 을 dbdiagram.io 에 붙이면 PNG 추출
- API 명세서(PDF + 원본 링크) — 미작성
- 프로젝트 관리 워크스페이스 URL(스프린트 계획서 + 칸반 + 회고록 2회 이상)
