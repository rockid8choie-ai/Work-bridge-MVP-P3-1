#!/usr/bin/env bash
# 스프린트 1 E2E — 지원·수락·자동거절·알림·북마크·수정잠금·마감·취소·삭제 (67 검사)
# 사용: npm run dev 띄운 뒤  bash scripts/e2e-sprint1.sh http://localhost:3000
# 끝나면 npx tsx scripts/cleanup-test-data.ts 로 e2e-*@wb.local 계정 정리. 10/16 로컬 67/67 통과.
set -u
BASE="$1"; shift
EXTRA=("$@")
# 쿠키 저장소는 Windows curl.exe 가 읽을 수 있는 경로여야 한다 (MSYS 경로 변환을 끄므로 /tmp 는 못 쓴다)
J="$(cygpath -m "$(mktemp -d)")"
PASS=0; FAIL=0

req() { # req <jar> <method> <path> [json]
  local jar="$1" m="$2" p="$3" body="${4:-}"
  local args=(-s -b "$J/$jar" -c "$J/$jar" -X "$m" -w '\n%{http_code}')
  # Windows curl.exe 는 argv 의 한글을 ANSI 로 깨뜨린다 → 본문은 UTF-8 파일로 넘긴다
  if [ -n "$body" ]; then printf '%s' "$body" > "$J/body.json"; args+=(-H "Content-Type: application/json" --data-binary "@$J/body.json"); fi
  if [ "${USE_VERCEL_CURL:-0}" = 1 ]; then
    # 프리뷰 배포는 Vercel Authentication 으로 보호됨 → CLI 가 bypass 헤더를 붙여 curl 을 실행한다
    (cd "$REPO" && MSYS_NO_PATHCONV=1 npx vercel curl "$p" --deployment "$BASE" --yes -- "${args[@]}" 2>/dev/null)
  else
    curl "${EXTRA[@]}" "${args[@]}" "$BASE$p"
  fi
}
REPO="${REPO:-/c/PROJECTS/workbridge}"
code() { tail -n1 <<<"$1"; }
body() { sed '$d' <<<"$1"; }
jget() { python -X utf8 -c "import sys,json; d=json.load(sys.stdin); print(eval('d'+sys.argv[1]))" "$1" 2>/dev/null; }
check() { # check <label> <expected> <actual>
  if [ "$2" = "$3" ]; then PASS=$((PASS+1)); echo "  ok   $1 ($3)"; else FAIL=$((FAIL+1)); echo "  FAIL $1 expected=$2 actual=$3"; fi
}

TS=$(date +%s)
echo "== 가입 3명"
r=$(req owner POST /api/auth/signup "{\"name\":\"E2E건물주\",\"email\":\"e2e-owner@wb.local\",\"password\":\"test1234\",\"role\":\"client\"}"); check "owner signup" 201 "$(code "$r")"
r=$(req pro1 POST /api/auth/signup "{\"name\":\"E2E전문가1\",\"email\":\"e2e-pro1@wb.local\",\"password\":\"test1234\",\"role\":\"freelancer\"}"); check "pro1 signup" 201 "$(code "$r")"
r=$(req pro2 POST /api/auth/signup "{\"name\":\"E2E전문가2\",\"email\":\"e2e-pro2@wb.local\",\"password\":\"test1234\",\"role\":\"freelancer\"}"); check "pro2 signup" 201 "$(code "$r")"

SKILLS=$(req owner GET /api/skills); SKILL1=$(body "$SKILLS" | jget "['data']['skills'][0]['id']"); SKILL2=$(body "$SKILLS" | jget "['data']['skills'][1]['id']")
DEADLINE=$(python -c "import datetime;print((datetime.datetime.utcnow()+datetime.timedelta(days=10)).strftime('%Y-%m-%dT00:00:00.000Z'))")
PASTDL=$(python -c "import datetime;print((datetime.datetime.utcnow()-datetime.timedelta(days=1)).strftime('%Y-%m-%dT00:00:00.000Z'))")

echo "== 프로필 없이 등록 → 428"
r=$(req owner POST /api/projects "{\"title\":\"E2E 누수 보수 공사\",\"description\":\"3층 화장실 천장 누수, 아래층까지 번짐. E2E 테스트용 프로젝트입니다.\",\"category\":\"누수·방수\",\"deadlineAt\":\"$DEADLINE\",\"budget\":3000000,\"skills\":[\"$SKILL1\"]}"); check "project w/o profile" 428 "$(code "$r")"

echo "== 프로필 3명"
r=$(req owner PUT /api/profile '{"buildingName":"E2E빌딩","buildingType":"상가","region":"서울 마포구"}'); check "owner profile" 200 "$(code "$r")"
r=$(req pro1 PUT /api/profile "{\"mainCategory\":\"방수·도장\",\"years\":10,\"hourlyRate\":50000,\"skills\":[\"$SKILL1\"]}"); check "pro1 profile" 200 "$(code "$r")"
r=$(req pro2 PUT /api/profile "{\"mainCategory\":\"설비·배관\",\"years\":5,\"hourlyRate\":45000,\"skills\":[\"$SKILL1\",\"$SKILL2\"]}"); check "pro2 profile" 200 "$(code "$r")"

echo "== 프로젝트 3개 (A: 수락 흐름 / B: 마감 흐름 / C: 취소·삭제 흐름)"
mk() { req owner POST /api/projects "{\"title\":\"$1\",\"description\":\"E2E 테스트용 프로젝트 설명입니다. 스무 자 이상 채웁니다.\",\"category\":\"누수·방수\",\"deadlineAt\":\"$DEADLINE\",\"budget\":3000000,\"skills\":[\"$SKILL1\"]}"; }
r=$(mk "E2E A 누수 보수"); check "create A" 201 "$(code "$r")"; PA=$(body "$r" | jget "['data']['project']['id']")
r=$(mk "E2E B 옥상 방수"); check "create B" 201 "$(code "$r")"; PB=$(body "$r" | jget "['data']['project']['id']")
r=$(mk "E2E C 외벽 도장"); check "create C" 201 "$(code "$r")"; PC=$(body "$r" | jget "['data']['project']['id']")

echo "== 지원 (B-18): 건물주 지원 403, pro1·pro2 지원 201, 중복 409, 짧은 소개 400"
r=$(req owner POST /api/projects/$PA/applications '{"coverLetter":"건물주가 지원하면 안 되는 케이스입니다 스무자","proposedAmount":100000,"proposedDays":3}'); check "owner apply" 403 "$(code "$r")"
r=$(req pro1 POST /api/projects/$PA/applications '{"coverLetter":"누수 진단 후 배관 교체, 방수 재시공 순으로 진행하겠습니다.","proposedAmount":2800000,"proposedDays":7}'); check "pro1 apply A" 201 "$(code "$r")"; APP1=$(body "$r" | jget "['data']['application']['id']")
r=$(req pro2 POST /api/projects/$PA/applications '{"coverLetter":"열화상 진단 장비로 원인 확인 후 최소 범위로 보수하겠습니다.","proposedAmount":2500000,"proposedDays":5}'); check "pro2 apply A" 201 "$(code "$r")"; APP2=$(body "$r" | jget "['data']['application']['id']")
r=$(req pro1 POST /api/projects/$PA/applications '{"coverLetter":"중복 지원 시도입니다. 스무 자 이상 채웁니다.","proposedAmount":100000,"proposedDays":3}'); check "pro1 dup apply" 409 "$(code "$r")"
r=$(req pro1 POST /api/projects/$PB/applications '{"coverLetter":"짧음","proposedAmount":100000,"proposedDays":3}'); check "short cover" 400 "$(code "$r")"
r=$(req pro1 POST /api/projects/$PB/applications '{"coverLetter":"B 프로젝트 지원. 옥상 우레탄 전면 재시공 경험 다수.","proposedAmount":4500000,"proposedDays":10}'); check "pro1 apply B" 201 "$(code "$r")"
r=$(req pro2 POST /api/projects/$PC/applications '{"coverLetter":"C 프로젝트 지원. 외벽 도장 경험 다수. 스무자 이상.","proposedAmount":1500000,"proposedDays":4}'); check "pro2 apply C" 201 "$(code "$r")"

echo "== 건물주 알림: 지원 4건 도착 (B-24 ①)"
r=$(req owner GET /api/notifications); check "owner unread" 4 "$(body "$r" | jget "['data']['unreadCount']")"

echo "== 수정 잠금 (B-08): 지원자 있는 A 의 예산 변경 409, 제목 변경 200, 남의 프로젝트 404"
r=$(req owner PATCH /api/projects/$PA '{"budget":9999999}'); check "A budget locked" 409 "$(code "$r")"
r=$(req owner PATCH /api/projects/$PA '{"title":"E2E A 누수 보수 (수정됨)"}'); check "A title edit" 200 "$(code "$r")"
r=$(req pro1 PATCH /api/projects/$PA '{"title":"해킹"}'); check "pro edits A" 403 "$(code "$r")"

echo "== 지원자 목록: 건물주 200(2명), 전문가 403"
r=$(req owner GET /api/projects/$PA/applications); check "applicants list" 200 "$(code "$r")"; check "applicants count" 2 "$(body "$r" | jget "['data']['applications'].__len__()")"
r=$(req pro1 GET /api/projects/$PA/applications); check "pro lists applicants" 403 "$(code "$r")"

echo "== 수락 트랜잭션 (B-19, B-20): pro1 수락 → pro2 자동 거절, A closed+awaiting_contract"
r=$(req owner PATCH /api/applications/$APP1 '{"action":"accept"}'); check "accept pro1" 200 "$(code "$r")"; check "autoRejected" 1 "$(body "$r" | jget "['data']['autoRejected']")"
r=$(req owner PATCH /api/applications/$APP2 '{"action":"accept"}'); check "accept again" 409 "$(code "$r")"
r=$(req owner GET /api/me/projects); A_STATE=$(body "$r" | python -X utf8 -c "import sys,json; d=json.load(sys.stdin); p=[x for x in d['data']['projects'] if x['id']=='$PA'][0]; print(p['recruitStatus'], p['dealStatus'], p['acceptedFreelancer'])")
check "A state" "closed awaiting_contract E2E전문가1" "$A_STATE"
r=$(req pro1 GET /api/me/applications); check "pro1 A accepted" accepted "$(body "$r" | python -X utf8 -c "import sys,json; d=json.load(sys.stdin); print([a['status'] for a in d['data']['applications'] if a['project']['id']=='$PA'][0])")"
r=$(req pro2 GET /api/me/applications); check "pro2 A rejected" rejected "$(body "$r" | python -X utf8 -c "import sys,json; d=json.load(sys.stdin); print([a['status'] for a in d['data']['applications'] if a['project']['id']=='$PA'][0])")"
r=$(req pro1 GET /api/notifications); check "pro1 accepted notif" application_accepted "$(body "$r" | jget "['data']['notifications'][0]['type']")"
r=$(req pro2 GET /api/notifications); check "pro2 auto-reject notif" application_rejected_auto "$(body "$r" | jget "['data']['notifications'][0]['type']")"
r=$(req pro2 POST /api/projects/$PA/applications '{"coverLetter":"마감된 프로젝트에 지원 시도. 스무 자 이상 채웁니다.","proposedAmount":100000,"proposedDays":3}'); check "apply to closed" 409 "$(code "$r")"

echo "== 직접 거절 + 모집 마감 (B-21, B-24 ④⑤): B 에서 pro1 거절 후 pro2 지원, 마감 → pro2 일괄 거절"
APPB1=$(req owner GET /api/projects/$PB/applications | sed '$d' | jget "['data']['applications'][0]['id']")
r=$(req owner PATCH /api/applications/$APPB1 '{"action":"reject"}'); check "reject pro1 on B" 200 "$(code "$r")"
r=$(req pro1 GET /api/notifications); check "pro1 rejected notif" application_rejected "$(body "$r" | jget "['data']['notifications'][0]['type']")"
r=$(req pro2 POST /api/projects/$PB/applications '{"coverLetter":"B 프로젝트 지원합니다. 스무 자 이상 채웁니다 네.","proposedAmount":4000000,"proposedDays":9}'); check "pro2 apply B" 201 "$(code "$r")"
r=$(req owner POST /api/projects/$PB/close); check "close B" 200 "$(code "$r")"
r=$(req owner POST /api/projects/$PB/close); check "close B again" 409 "$(code "$r")"
r=$(req pro2 GET /api/notifications); check "pro2 closed notif" recruit_closed "$(body "$r" | jget "['data']['notifications'][0]['type']")"
r=$(req pro2 GET /api/me/applications); check "pro2 B rejected" rejected "$(body "$r" | python -X utf8 -c "import sys,json; d=json.load(sys.stdin); print([a['status'] for a in d['data']['applications'] if a['project']['id']=='$PB'][0])")"

echo "== 알림 읽음 (B-25, B-26)"
NID=$(req pro2 GET /api/notifications | sed '$d' | jget "['data']['notifications'][0]['id']")
r=$(req pro2 POST /api/notifications "{\"id\":\"$NID\"}"); check "read one" 1 "$(body "$r" | jget "['data']['updated']")"
r=$(req pro2 GET "/api/notifications/$NID/open"); check "open → redirect" 307 "$(code "$r")"
r=$(req pro2 POST /api/notifications '{"all":true}'); check "read all → unread 0" 0 "$(body "$r" | jget "['data']['unreadCount']")"
r=$(req owner GET "/api/notifications/$NID/open"); check "open other's → 307 to list" 307 "$(code "$r")"

echo "== 북마크 (B-27)"
r=$(req pro1 POST /api/projects/$PC/bookmark); check "bookmark on" True "$(body "$r" | jget "['data']['bookmarked']")"
r=$(req pro1 GET /api/me/bookmarks); check "bookmarks 1" 1 "$(body "$r" | jget "['data']['bookmarks'].__len__()")"
r=$(req pro1 POST /api/projects/$PC/bookmark); check "bookmark off" False "$(body "$r" | jget "['data']['bookmarked']")"
r=$(req owner POST /api/projects/$PC/bookmark); check "owner bookmark" 403 "$(code "$r")"

echo "== 취소·삭제 (B-32, B-09): A(계약 대기) 취소 가능, 취소 후 삭제 가능. C 바로 삭제 → pro2 알림"
r=$(req owner DELETE /api/projects/$PA); check "delete A in deal" 409 "$(code "$r")"
r=$(req owner POST /api/projects/$PA/cancel); check "cancel A" 200 "$(code "$r")"
r=$(req owner POST /api/projects/$PA/cancel); check "cancel A again" 409 "$(code "$r")"
r=$(req pro1 GET /api/notifications); check "pro1 cancelled notif" project_cancelled "$(body "$r" | jget "['data']['notifications'][0]['type']")"
r=$(req owner DELETE /api/projects/$PA); check "delete A after cancel" 200 "$(code "$r")"
r=$(req owner DELETE /api/projects/$PC); check "delete C" 200 "$(code "$r")"
r=$(req pro2 GET /api/notifications); check "pro2 cancelled notif (C)" project_cancelled "$(body "$r" | jget "['data']['notifications'][0]['type']")"
r=$(req pro2 GET /api/me/applications); check "pro2 C rejected" rejected "$(body "$r" | python -X utf8 -c "import sys,json; d=json.load(sys.stdin); print([a['status'] for a in d['data']['applications'] if a['project']['id']=='$PC'][0])")"
r=$(req owner GET /api/projects/$PA); check "deleted A hidden" 404 "$(code "$r")"
r=$(req owner DELETE /api/projects/$PB); check "delete B" 200 "$(code "$r")"

echo "== 목록 필터 (B-11~14) 깨지지 않는지"
r=$(req pro1 GET "/api/projects?q=%EB%88%84%EC%88%98&category=%EB%88%84%EC%88%98%C2%B7%EB%B0%A9%EC%88%98&status=open&sort=budget&page=1"); check "list filtered" 200 "$(code "$r")"
r=$(req pro1 GET "/api/projects?sort=bogus"); check "list bad sort" 400 "$(code "$r")"

echo "== 화면 라우트 200 (로그인 상태)"
for p in /projects "/projects?q=%EB%88%84%EC%88%98" /me/applications /me/bookmarks /notifications; do r=$(req pro1 GET "$p"); check "GET $p" 200 "$(code "$r")"; done
for p in /me/projects /projects/new; do r=$(req owner GET "$p"); check "GET $p" 200 "$(code "$r")"; done

echo
echo "PASS=$PASS FAIL=$FAIL"
rm -rf "$J"
[ "$FAIL" = 0 ]
