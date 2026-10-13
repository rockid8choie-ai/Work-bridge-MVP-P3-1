# PROGRESS — 작업 인수인계

> 새 세션·새 머신에서는 **이 파일부터** 읽는다. 매 작업 단위마다 갱신하고 커밋·푸시한다.
> 최종 갱신: 2026-10-13 (Windows → Mac 이전 직전)

---

## 0. 지금 상태 한 줄

Day 1(10/12) 완료. 기본 필수 30항목 중 **12항목 구현·배포 검증 끝**. 10/13부터 Day 2 — 지원 관리(트랜잭션)부터.

- 배포: https://workbridge-gray.vercel.app (Vercel 프로젝트 `workbridge`, 팀 `rockid8choie-3144s-projects`)
- 리포: https://github.com/rockid8choie-ai/Work-bridge-MVP-P3-1 (**private**, 제출 시 public 전환)
- 데모 계정: `owner@workbridge.test` / `pro@workbridge.test` (비밀번호 `demo1234`)
- 마지막 커밋: `86afd4e` 2026-10-12 18:42 — 작업 트리 깨끗, origin/main 과 동일

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

- DB 는 **Neon 클라우드**다. 로컬 DB 를 띄울 필요 없고, Windows 와 같은 DB 를 그대로 본다.
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
| `01-요구사항-분해.md` | 과제 명세 → 수용 기준 44항목(기본 30 / 고급 14 / 도전 4), 자율 결정 8건, 2주 일정 |
| `02-ERD.md` | dbdiagram DSL · 상태 전이 · 부수 효과 |
| `03-시장조사.md` | 왜 이 사업인가 · 경쟁 지도 · 예상 반박 7개 |
| `04-개발일지.md` | Day 1 일지(판단 근거 · 막힌 것 · 검증표) |

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

## 3. 다음 할 일 (Day 2, 10/13 ~)

**지원 관리가 핵심.** 수락 한 번에 다섯 가지가 동시에 바뀜 → **Prisma 트랜잭션 하나로 묶기**:
해당 지원 `accepted` · 나머지 일괄 `rejected` · 프로젝트 `closed` + `awaiting_contract` · 수락 알림 1건 · 자동거절 알림 N건.

- [ ] #8 B-18, B-23 지원서 제출 · 중복 방지 · 제출 후 동선
- [ ] #9 B-19~22 지원자 관리 · 자동 거절 · 일괄 마감
- [ ] #10 B-24~26 인앱 알림 5종 · 헤더 미확인 표시 · 읽음 처리
- [ ] #5 B-08, B-09 프로젝트 수정 · 소프트 삭제
- [ ] #7 나머지 상태 전이
- [ ] #11 북마크 + 추천 프로젝트
- [ ] #2 소셜 로그인(Google · Kakao) — OAuth 클라이언트 키 발급 필요
- [ ] 스프린트 1 계획서(워크스페이스 산출물)

우선순위 고정: **기본 필수 → 고급 필수 → 문서·발표 → 도전 과제.** 도전 과제 중 C-01(마일스톤 분할 정산, #20)은 차별화 완결점이라 사수.

---

## 4. 막힌 것 · 정할 것

| 항목 | 상태 |
|---|---|
| **과제 원문(RFP) 파일이 어디에도 없다** | 로컬·리포·바탕화면 모두 없음. `docs/01` 3장이 RFP 8장을 그대로 옮긴 것이라 작업은 가능하지만, 제출 요건·채점표 재확인용으로 원문 PDF 를 `docs/rfp/` 에 넣을 것. **사용자에게 다시 요청함(10/13).** |
| GitHub Projects 칸반 보드 | `gh` 토큰에 `project` 스코프 없음. `gh auth refresh -s project` 후 생성 |
| 팀명 | 제출 파일명 규칙 `[팀명]_[산출물명]_[버전]` 이라 1인이라도 팀명 필요 |
| OAuth 키 | Google · Kakao 클라이언트 ID/Secret 미발급 (#2 착수 전) |
| AI · PG 키 | `ANTHROPIC_API_KEY`, 토스 sandbox 키 미설정 (스프린트 2 착수 전) |

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
