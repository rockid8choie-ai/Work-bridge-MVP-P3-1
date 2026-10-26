# 데이터 모델 (ERD)

> **제출용 다이어그램: [`erd/ERD.png`](erd/ERD.png) (7080×3440) · [`erd/ERD.pdf`](erd/ERD.pdf)** — 원본은 [`erd/erd.html`](erd/erd.html)(Mermaid erDiagram, 브라우저로 열면 렌더링). 2026-10-26 생성.
> 아래 dbdiagram DSL 은 같은 모델의 텍스트 원본이다. [dbdiagram.io](https://dbdiagram.io)에 붙여넣어도 된다.

---

## 1. 설계 의도

RFP 4장이 제시한 8개 엔티티(User / Project / Application / Contract / Payment / Review / Notification / Bookmark)를
기준으로 삼되, 세 군데에서 의도적으로 갈라냈다.

**① 역할별 프로필을 분리했다** — `client_profiles` / `freelancer_profiles`
`users`에 전부 넣으면 역할마다 절반이 NULL이 된다. 분리하면 "프로젝트 등록 시점에 의뢰인 프로필이 비어 있으면
입력 유도"(B-06) 같은 판정이 행 존재 여부 하나로 끝난다.

**② 프로젝트 상태를 두 축으로 나눴다** — `recruit_status` / `deal_status`
RFP는 단일 enum도 허용하지만, 외부 목록에는 모집 단계만 노출해야 한다(B-17).
단일 enum이면 조회할 때마다 "거래 단계면 모집 마감으로 바꿔서 보여주기" 변환이 붙는다.
두 축이면 외부 질의는 `recruit_status`만 보면 되고, 내부 화면만 `deal_status`를 읽는다.

**③ AI 분해 결과를 별도 테이블로 올렸다** — `scope_analyses` / `scope_items`
이 프로젝트의 차별화 축이다. 분석 결과를 JSON 한 칸에 담아두면 리포트 출력 외에는 못 쓴다.
행으로 쪼개 두면 `scope_items.id`를 `milestones`가 참조해서,
**AI가 쪼갠 공정 하나가 그대로 계약 범위 조항이자 마일스톤이자 부분 정산 단위**가 된다.

정산 금액은 `milestones`에 흡수했고(`fee`, `net`), 리뷰 태그는 배열 컬럼으로 뒀다. 테이블을 늘릴 이유가 없었다.

---

## 2. dbdiagram DSL

```dbml
Project workbridge {
  database_type: 'PostgreSQL'
  Note: '건물 유지보수 외주 매칭 — 의뢰인(건물주) ↔ 프리랜서(전문가)'
}

// ───────── 사용자 ─────────

Table users {
  id            uuid [pk]
  email         varchar [unique, not null]
  password_hash varchar            // 소셜 전용 계정은 null
  name          varchar [not null]
  role          user_role [not null]
  avatar_url    varchar
  bio           text
  created_at    timestamptz [not null, default: `now()`]
}

Table oauth_accounts {
  id                uuid [pk]
  user_id           uuid [ref: > users.id, not null]
  provider          varchar [not null]   // google | kakao
  provider_user_id  varchar [not null]
  linked_at         timestamptz [not null, default: `now()`]

  Note: '동일 이메일로 가입된 계정이 있으면 새 계정을 만들지 않고 여기에 연결한다 (B-03)'
  indexes { (provider, provider_user_id) [unique] }
}

Table refresh_tokens {
  id         uuid [pk]
  user_id    uuid [ref: > users.id, not null]
  token_hash varchar [not null]     // 평문 저장 금지
  expires_at timestamptz [not null]
  revoked_at timestamptz            // 로그아웃 시 무효화

  Note: 'Access Token 만료 시 재발급 근거 (B-02)'
}

Table client_profiles {
  user_id       uuid [pk, ref: - users.id]
  building_name varchar [not null]
  building_type varchar [not null]   // 상가 | 오피스 | 다세대 | 기타
  region        varchar [not null]   // 시·군·구
  website       varchar
}

Table freelancer_profiles {
  user_id       uuid [pk, ref: - users.id]
  main_category varchar [not null]
  years         integer [not null]
  hourly_rate   integer [not null]
  portfolio_url varchar
}

// ───────── 전문분야 (M:N) ─────────

Table skills {
  id        uuid [pk]
  name      varchar [unique, not null]
  is_custom boolean [not null, default: false]

  Note: '기본 6종: 전기 / 설비·배관 / 방수·도장 / 인테리어·목공 / 소방·안전 / 공조·환기 (D-07)'
}

Table freelancer_skills {
  freelancer_id uuid [ref: > freelancer_profiles.user_id]
  skill_id      uuid [ref: > skills.id]
  indexes { (freelancer_id, skill_id) [pk] }
}

Table project_skills {
  project_id uuid [ref: > projects.id]
  skill_id   uuid [ref: > skills.id]
  indexes { (project_id, skill_id) [pk] }
}

// ───────── 프로젝트 · 지원 ─────────

Table projects {
  id               uuid [pk]
  client_id        uuid [ref: > users.id, not null]
  title            varchar [not null]
  description      text [not null]
  category         varchar [not null]
  recruit_start_at timestamptz
  deadline_at      timestamptz [not null]
  budget           integer
  recruit_status   recruit_status_t [not null, default: 'scheduled']
  deal_status      deal_status_t
  deleted_at       timestamptz        // 소프트 딜리트 (B-09)
  created_at       timestamptz [not null, default: `now()`]

  Note: '외부 목록은 recruit_status만 노출. deal_status는 내부 화면 전용 (B-17, D-03)'
  indexes {
    (recruit_status, deadline_at)
    (category)
  }
}

Table applications {
  id              uuid [pk]
  project_id      uuid [ref: > projects.id, not null]
  freelancer_id   uuid [ref: > users.id, not null]
  cover_letter    text [not null]
  proposed_amount integer [not null]
  proposed_days   integer [not null]
  status          application_status_t [not null, default: 'pending']
  created_at      timestamptz [not null, default: `now()`]

  Note: '중복 지원 방지 (B-18). 수락·거절 후에도 행은 남아 내 지원 현황에 노출 (B-22)'
  indexes { (project_id, freelancer_id) [unique] }
}

// ───────── AI 범위 분해 (차별화 축) ─────────

Table scope_analyses {
  id             uuid [pk]
  project_id     uuid [ref: > projects.id, not null]
  total_estimate integer [not null]
  model          varchar [not null]    // 사용한 LLM
  created_at     timestamptz [not null, default: `now()`]
}

Table scope_items {
  id          uuid [pk]
  analysis_id uuid [ref: > scope_analyses.id, not null]
  sort_order  integer [not null]
  name        varchar [not null]     // 예: 방수 재시공
  description text [not null]
  estimate    integer [not null]
  rationale   text [not null]        // 산정 근거 (A-01 필수)

  Note: '이 행 하나가 계약 범위 조항이자 마일스톤이자 부분 정산 단위가 된다 (D-02)'
}

// ───────── 계약 · 결제 · 정산 ─────────

Table contracts {
  id                  uuid [pk]
  project_id          uuid [ref: - projects.id, not null]
  application_id      uuid [ref: - applications.id, not null]
  agreed_amount       integer [not null]
  scope_snapshot      jsonb [not null]   // 체결 시점의 scope_items 사본
  client_signed_at    timestamptz
  freelancer_signed_at timestamptz
  created_at          timestamptz [not null, default: `now()`]

  Note: '양측 서명이 모두 차면 체결. 범위는 스냅샷으로 고정해 사후 변경 불가 (A-05, A-06)'
}

Table milestones {
  id            uuid [pk]
  contract_id   uuid [ref: > contracts.id, not null]
  scope_item_id uuid [ref: - scope_items.id]
  sort_order    integer [not null]
  title         varchar [not null]
  amount        integer [not null]
  status        milestone_status_t [not null, default: 'todo']
  fee           integer    // 수수료 10%
  net           integer    // 실지급액
  approved_at   timestamptz

  Note: '의뢰인이 단계를 승인할 때마다 그만큼 정산 (C-01)'
}

Table payments {
  id             uuid [pk]
  contract_id    uuid [ref: > contracts.id, not null]
  pg_order_id    varchar [unique, not null]
  pg_payment_key varchar
  amount         integer [not null]
  status         payment_status_t [not null, default: 'pending']
  paid_at        timestamptz

  Note: 'PG sandbox 전용. 콜백에서 금액을 서버 측 재검증한다 (A-07)'
}

// ───────── 리뷰 · 알림 · 북마크 ─────────

Table reviews {
  id         uuid [pk]
  project_id uuid [ref: > projects.id, not null]
  author_id  uuid [ref: > users.id, not null]
  direction  review_direction_t [not null]
  rating     integer [not null]      // 1-5
  comment    text
  tags       "varchar[]"             // 고정 태그 세트 (D-08)
  created_at timestamptz [not null, default: `now()`]

  Note: '프로젝트당 방향별 1회, 수정 불가 (A-12)'
  indexes { (project_id, direction) [unique] }
}

Table notifications {
  id         uuid [pk]
  user_id    uuid [ref: > users.id, not null]
  type       varchar [not null]
  title      varchar [not null]
  body       varchar
  link       varchar [not null]      // 클릭 시 이동 경로 (B-25)
  read_at    timestamptz
  created_at timestamptz [not null, default: `now()`]

  indexes { (user_id, read_at) }
}

Table bookmarks {
  user_id    uuid [ref: > users.id]
  project_id uuid [ref: > projects.id]
  created_at timestamptz [not null, default: `now()`]
  indexes { (user_id, project_id) [pk] }
}

// ───────── Enum ─────────

Enum user_role { client freelancer }

Enum recruit_status_t {
  scheduled   // 모집 예정
  open        // 모집 중
  closed      // 모집 마감
}

Enum deal_status_t {
  awaiting_contract  // 계약 대기 (금액 합의·서명)
  awaiting_payment   // 결제 대기 (D-04)
  in_progress        // 작업 중
  completed          // 완료
  cancelled          // 취소
}

Enum application_status_t {
  pending   // 검토중
  accepted  // 수락
  rejected  // 거절 (직접·자동·일괄 모두 동일 상태)
}

Enum milestone_status_t { todo in_progress submitted approved }

Enum payment_status_t { pending paid partially_settled settled refunded }

Enum review_direction_t { client_to_freelancer freelancer_to_client }
```

---

## 3. 상태 전이

### 모집 단계 (외부 노출)

```
scheduled ──(모집 시작일 도래)──> open ──┬──(마감일 초과)─────────> closed
                                          ├──(의뢰인 수동 마감)────> closed
                                          └──(지원자 1명 수락)─────> closed
```

`closed`로 가는 모든 경로에서 **미처리 지원은 일괄 `rejected`** 로 바꾸고 지원자 전원에게 알림을 보낸다 (B-20, B-21, B-24).

### 거래 단계 (내부 전용)

```
awaiting_contract ──(양측 서명)──> awaiting_payment ──(에스크로 결제)──> in_progress
                 │                                                          │
                 └──(금액 거부 D-06)──> 지원 rejected                       │
                      프로젝트 recruit_status = open 으로 복귀               │
                                                                            ▼
                                                      (마일스톤 전부 승인) completed
```

계약 체결 **이전**에만 `cancelled`로 갈 수 있다. 체결 이후는 환불 흐름을 거친다 (RFP 2.3).

---

## 4. 부수 효과 정리

트랜잭션으로 묶어야 하는 지점이다. 하나라도 빠지면 상태가 어긋난다.

| 트리거 | 함께 일어나는 일 |
|---|---|
| 지원 수락 | 해당 지원 `accepted` · 나머지 대기 지원 일괄 `rejected` · 프로젝트 `closed` + `awaiting_contract` · 수락 알림 1건 + 자동거절 알림 N건 |
| 모집 마감 | 프로젝트 `closed` · 미처리 지원 일괄 `rejected` · 지원자 전원 알림 |
| 양측 서명 완료 | 계약 체결 · `scope_snapshot` 고정 · 마일스톤 생성 · `awaiting_payment` 전환 |
| 결제 콜백 검증 통과 | 결제 `paid` · 프로젝트 `in_progress` · 양측 알림 |
| 마일스톤 승인 | 마일스톤 `approved` · 수수료 10% 차감 후 `net` 기록 · 전부 승인되면 프로젝트 `completed` + 리뷰 작성 가능 |
