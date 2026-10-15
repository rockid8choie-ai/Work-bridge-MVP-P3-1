# Work bridge MVP [P(3-1)] — Claude 작업 규칙

> 이 파일은 Claude Code 가 세션마다 자동으로 읽는다. 사람이 읽어도 된다.

## 입력어: "워킹브릿지 브리핑"

사용자가 **"워킹브릿지 브리핑"** 이라고 하면 (어느 머신이든, 어느 폴더에 있든) 아래를 순서대로 한다. 묻지 말고 바로 한다.

1. 리포가 로컬에 없으면 클론한다: `gh repo clone rockid8choie-ai/Work-bridge-MVP-P3-1 workbridge` (Mac 은 `~/Projects/workbridge` 에 이미 있음). 있으면 `git pull --ff-only origin main`.
2. **`PROGRESS.md`** 를 읽는다 — 상태 한 줄, 끝난 것, 다음 할 일, 막힌 것.
3. **`docs/04-개발일지.md`** 의 마지막 일차를 읽는다 — 직전 판단과 "내일" 항목.
4. `git log --oneline -15` 와 `gh issue list --state open` 으로 PROGRESS 가 최신인지 대조한다. 어긋나면 그 사실을 먼저 말한다.
5. 배포 URL 이 살아있는지 `curl` 로 확인한다 (https://workbridge-gray.vercel.app → 200, `/projects` 비로그인 → 307).
6. 브리핑을 쓴다: **어디까지 됐나 / 오늘 할 일(우선순위 순) / 챙길 것(막힌 것·결정 안 된 것) / 일정 감각(스프린트 마감까지 며칠, 항목 몇 개 남았나)**.

새 머신에서 환경까지 잡아야 하면 `PROGRESS.md` 1장 "시작하기" 절차를 따른다. 비밀값은 Vercel 에 있다 (`npx vercel login` 은 사용자가 직접).

## 문서가 어디 있나

| 알고 싶은 것 | 파일 |
|---|---|
| 지금 상태 · 다음 할 일 · 막힌 것 | `PROGRESS.md` |
| 일자별 판단 근거 · 막힌 것 · 검증 | `docs/04-개발일지.md` |
| 요구사항 47항목 체크리스트 · 자율 결정 · 일정 | `docs/01-요구사항-분해.md` |
| 데이터 모델 · 상태 전이 · 트랜잭션 묶음 | `docs/02-ERD.md`, `prisma/schema.prisma` |
| 시장조사 · 경쟁 · 수치 출처 | `docs/03-시장조사.md` |
| 기획서·발표 도입부 원고 | `docs/05-프로젝트-개요.md` |
| AI 공정 분해를 어떻게 만드나 | `docs/06-AI-공정분해-설계.md` |
| 과제 원문 (RFP · 제출 · 발표 가이드) | `docs/rfp/` |

## 사용자가 원하는 방식

- **묻지 말고 한다.** "A 로 할까요 B 로 할까요" 금지. 합리적인 쪽을 골라 하고 결과만 말한다. 전체 범위(47항목 + 도전) 를 다 하는 게 전제다.
- **쉬운 말.** "수용 기준", "AC", "B-07" 같은 약어를 설명 없이 쓰지 않는다. 풀어서 쓰고 코드는 괄호 안에만.
- 문서 원본은 `docs/*.md`. 고치면 거기를 고친다.
- 작업 단위가 끝나면 `PROGRESS.md` 갱신 → 커밋 → 푸시. 사용자가 "저장해놔" 라고 하면 이걸 뜻한다.
- `main` 직접 push 는 문서 커밋만. 코드는 `feat/*` → PR → 셀프 리뷰.

## 기술 메모

- Next.js 16 App Router · React 19 · Tailwind 4 · Prisma 6 · Neon Postgres · 자체 JWT (Access 15m / Refresh 14d, 난수 + SHA-256, 회전).
- API 응답은 `{ ok, data }` / `{ ok, code, message }` 한 모양 (`lib/server/api.ts`). 프로필 미완성은 428 `PROFILE_REQUIRED`.
- 결제는 sandbox 키만. live 키 금지.
- `AGENTS.md` 는 `next dev` 가 자동 생성·갱신하는 Next 16 주의사항 — 지우지 말고 함께 커밋.
