#!/usr/bin/env bash
# 스프린트 2 E2E — 거래 전 구간: AI 분해 → 예산 반영 → 지원·수락 → 전문가 범위 수정 → 금액 제시 → 동의 → 계약서 → 양측 서명
#   → 에스크로 결제(시뮬레이션) → 납품 요청 → 완료 승인(수수료 10%) → 완료 → 상호 리뷰 → 프로필 평점. 거부 경로(A-04)도 검사.
# 사용: ALLOW_PAYMENT_SIMULATION=1 로 띄운 서버에  bash scripts/e2e-sprint2.sh http://localhost:3000
#       배포본(시뮬레이션 없음)에는  SKIP_PAYMENT=1 bash scripts/e2e-sprint2.sh https://…  → 결제 전까지만 검사한다.
# 끝나면 npx tsx scripts/cleanup-test-data.ts 로 e2e-*@wb.local 계정 정리.
set -u
BASE="$1"; shift
EXTRA=("$@")
J="$(cygpath -m "$(mktemp -d)")"
PASS=0; FAIL=0

req() { # req <jar> <method> <path> [json]
  local jar="$1" m="$2" p="$3" body="${4:-}"
  local args=(-s -b "$J/$jar" -c "$J/$jar" -X "$m" -w '\n%{http_code}')
  if [ -n "$body" ]; then printf '%s' "$body" > "$J/body.json"; args+=(-H "Content-Type: application/json" --data-binary "@$J/body.json"); fi
  curl "${EXTRA[@]}" "${args[@]}" "$BASE$p"
}
code() { tail -n1 <<<"$1"; }
body() { sed '$d' <<<"$1"; }
jget() { python -X utf8 -c "import sys,json; d=json.load(sys.stdin); print(eval('d'+sys.argv[1]))" "$1" 2>/dev/null; }
check() { if [ "$2" = "$3" ]; then PASS=$((PASS+1)); echo "  ok   $1 ($3)"; else FAIL=$((FAIL+1)); echo "  FAIL $1 expected=$2 actual=$3"; fi; }

echo "== 가입·프로필 (건물주 1, 전문가 2)"
r=$(req owner POST /api/auth/signup '{"name":"E2E건물주","email":"e2e-owner@wb.local","password":"test1234","role":"client"}'); check "owner signup" 201 "$(code "$r")"
r=$(req pro1 POST /api/auth/signup '{"name":"E2E전문가1","email":"e2e-pro1@wb.local","password":"test1234","role":"freelancer"}'); check "pro1 signup" 201 "$(code "$r")"
r=$(req pro2 POST /api/auth/signup '{"name":"E2E전문가2","email":"e2e-pro2@wb.local","password":"test1234","role":"freelancer"}'); check "pro2 signup" 201 "$(code "$r")"
SKILLS=$(req owner GET /api/skills); SKILL1=$(body "$SKILLS" | jget "['data']['skills'][0]['id']")
r=$(req owner PUT /api/profile '{"buildingName":"E2E빌딩","buildingType":"상가","region":"서울 마포구"}'); check "owner profile" 200 "$(code "$r")"
r=$(req pro1 PUT /api/profile "{\"mainCategory\":\"방수·도장\",\"years\":10,\"hourlyRate\":50000,\"skills\":[\"$SKILL1\"]}"); check "pro1 profile" 200 "$(code "$r")"
r=$(req pro2 PUT /api/profile "{\"mainCategory\":\"설비·배관\",\"years\":5,\"hourlyRate\":45000,\"skills\":[\"$SKILL1\"]}"); check "pro2 profile" 200 "$(code "$r")"
DEADLINE=$(python -c "import datetime;print((datetime.datetime.utcnow()+datetime.timedelta(days=10)).strftime('%Y-%m-%dT00:00:00.000Z'))")
mk() { req owner POST /api/projects "{\"title\":\"$1\",\"description\":\"3층 화장실 천장에서 물이 새고 아래층 사무실 천장까지 얼룩이 번졌습니다. 배관 쪽 문제로 보이며 타일 일부도 들떠 있습니다.\",\"category\":\"누수·방수\",\"deadlineAt\":\"$DEADLINE\",\"budget\":null,\"skills\":[\"$SKILL1\"]}"; }

echo "== A-01/A-02 AI 분해 → 예산 반영 (지원자 없을 때)"
r=$(mk "E2E 거래 전체 흐름"); check "create P" 201 "$(code "$r")"; P=$(body "$r" | jget "['data']['project']['id']")
r=$(req pro1 POST /api/projects/$P/analyze); check "pro analyze → 403" 403 "$(code "$r")"
r=$(req owner POST /api/projects/$P/analyze '{}'); check "analyze" 201 "$(code "$r")"
N_ITEMS=$(body "$r" | jget "['data']['analysis']['items'].__len__()"); TOTAL=$(body "$r" | jget "['data']['analysis']['totalEstimate']")
check "items >= 2" True "$(python -c "print($N_ITEMS>=2)")"
check "first item is diagnostic" "누수 원인 진단" "$(body "$r" | jget "['data']['analysis']['items'][0]['name']")"
check "rationale present" True "$(body "$r" | python -X utf8 -c "import sys,json; d=json.load(sys.stdin); print(all(len(i['rationale'])>=10 for i in d['data']['analysis']['items']))")"
r=$(req owner PATCH /api/projects/$P/analyze); check "apply budget" 200 "$(code "$r")"; check "budget = total" "$TOTAL" "$(body "$r" | jget "['data']['budget']")"
r=$(req owner GET /api/projects/$P/analyze); check "owner reads report" 200 "$(code "$r")"
r=$(req pro1 GET /api/projects/$P/analyze); check "stranger reads report → 403" 403 "$(code "$r")"

echo "== 지원 2명 → pro1 수락 → 범위표는 선정 전문가만 열람·수정"
r=$(req pro1 POST /api/projects/$P/applications '{"coverLetter":"누수 진단 후 배관 교체, 방수 재시공 순으로 진행하겠습니다.","proposedAmount":2800000,"proposedDays":7}'); check "pro1 apply" 201 "$(code "$r")"; APP1=$(body "$r" | jget "['data']['application']['id']")
r=$(req pro2 POST /api/projects/$P/applications '{"coverLetter":"열화상 진단 장비로 원인 확인 후 최소 범위로 보수하겠습니다.","proposedAmount":2500000,"proposedDays":5}'); check "pro2 apply" 201 "$(code "$r")"
r=$(req owner PATCH /api/projects/$P/analyze); check "apply budget w/ applicants → 409" 409 "$(code "$r")"
r=$(req owner PATCH /api/applications/$APP1 '{"action":"accept"}'); check "accept pro1" 200 "$(code "$r")"
r=$(req pro1 GET /api/projects/$P/deal); check "pro1 deal view" 200 "$(code "$r")"; check "isFreelancer" True "$(body "$r" | jget "['data']['isFreelancer']")"
r=$(req pro2 GET /api/projects/$P/deal); check "pro2 deal view → 403" 403 "$(code "$r")"
ITEMS=$(req pro1 GET /api/projects/$P/analyze | sed '$d' | python -X utf8 -c "import sys,json; d=json.load(sys.stdin); it=d['data']['analysis']['items']; print(json.dumps([{'id':i['id'],'name':i['name'],'description':i['description'],'estimate':i['estimate']} for i in it[:2]] + [{'name':'폐기물 처리','description':'철거 자재 반출 및 처리','estimate':150000,'reason':'현장 확인 결과 타일 철거 필요'}], ensure_ascii=False))")
r=$(req pro1 PATCH /api/projects/$P/scope "{\"items\":$ITEMS}"); check "pro1 edits scope" 200 "$(code "$r")"
check "scope now 3 items" 3 "$(body "$r" | jget "['data']['analysis']['items'].__len__()")"
check "added row marked" True "$(body "$r" | python -X utf8 -c "import sys,json; d=json.load(sys.stdin); it=d['data']['analysis']['items'][2]; print(it['editedBy'] is not None and it['rationale'].startswith('[전문가 수정]'))")"
SCOPE_TOTAL=$(body "$r" | jget "['data']['analysis']['totalEstimate']")
r=$(req pro2 PATCH /api/projects/$P/scope "{\"items\":$ITEMS}"); check "pro2 edits scope → 403" 403 "$(code "$r")"

echo "== A-03 금액 제시 → 동의 → 계약서 자동 생성 (A-05)"
r=$(req pro1 PATCH /api/projects/$P/offer '{"decision":"agree"}'); check "agree w/o offer → 409" 409 "$(code "$r")"
r=$(req owner POST /api/projects/$P/offer "{\"amount\":$SCOPE_TOTAL,\"days\":10,\"message\":\"주말 작업 부탁드립니다\"}"); check "owner offers" 201 "$(code "$r")"
r=$(req owner POST /api/projects/$P/offer "{\"amount\":1000000,\"days\":3}"); check "second offer while pending → 409" 409 "$(code "$r")"
r=$(req pro1 GET /api/notifications); check "pro1 offer notif" offer_made "$(body "$r" | jget "['data']['notifications'][0]['type']")"
r=$(req pro1 PATCH /api/projects/$P/scope "{\"items\":$ITEMS}"); check "edit scope while offer pending → 409" 409 "$(code "$r")"
r=$(req pro1 PATCH /api/projects/$P/offer '{"decision":"agree"}'); check "pro1 agrees" 200 "$(code "$r")"; CID=$(body "$r" | jget "['data']['contractId']")
check "contract created" True "$(python -c "print(len('$CID')>5)")"
r=$(req owner GET /api/notifications); check "owner agreed notif" offer_agreed "$(body "$r" | jget "['data']['notifications'][0]['type']")"
r=$(req owner POST /api/projects/$P/analyze '{}'); check "re-analyze after contract → 409" 409 "$(code "$r")"
r=$(req owner GET /contracts/$CID); check "GET contract page (owner)" 200 "$(code "$r")"
r=$(req pro2 GET /contracts/$CID); check "GET contract page (stranger) → redirect" 307 "$(code "$r")"

echo "== A-06 양측 서명 → 체결 → 마일스톤 생성 + awaiting_payment"
r=$(req owner POST /api/projects/$P/payments); check "pay before seal → 409" 409 "$(code "$r")"
r=$(req owner POST /api/projects/$P/contract/sign); check "owner signs" 200 "$(code "$r")"; check "not sealed yet" False "$(body "$r" | jget "['data']['sealed']")"
r=$(req owner POST /api/projects/$P/contract/sign); check "owner signs twice → 409" 409 "$(code "$r")"
r=$(req pro2 POST /api/projects/$P/contract/sign); check "stranger signs → 403" 403 "$(code "$r")"
r=$(req pro1 POST /api/projects/$P/contract/sign); check "pro1 signs" 200 "$(code "$r")"; check "sealed" True "$(body "$r" | jget "['data']['sealed']")"
r=$(req owner GET /api/projects/$P/deal); check "dealStatus awaiting_payment" awaiting_payment "$(body "$r" | jget "['data']['project']['dealStatus']")"
check "milestones = scope rows" 3 "$(body "$r" | jget "['data']['project']['contract']['milestones'].__len__()")"
check "snapshot sum = agreed" True "$(body "$r" | python -X utf8 -c "import sys,json; d=json.load(sys.stdin); c=d['data']['project']['contract']; print(sum(i['estimate'] for i in c['scopeSnapshot'])==c['agreedAmount'])")"
r=$(req owner POST /api/projects/$P/cancel); check "cancel after seal → 409" 409 "$(code "$r")"

if [ "${SKIP_PAYMENT:-0}" = 1 ]; then
  echo "== SKIP_PAYMENT=1 — 결제 이후 구간은 브라우저로 확인"
else
  echo "== A-07/A-09 결제 주문 → 승인(시뮬레이션) → in_progress"
  r=$(req pro1 POST /api/projects/$P/payments); check "pro creates order → 403" 403 "$(code "$r")"
  r=$(req owner POST /api/projects/$P/payments); check "create order" 201 "$(code "$r")"; OID=$(body "$r" | jget "['data']['order']['orderId']"); AMT=$(body "$r" | jget "['data']['order']['amount']")
  check "order amount = agreed" "$SCOPE_TOTAL" "$AMT"
  r=$(req owner POST /api/projects/$P/payments); check "order reused" "$OID" "$(body "$r" | jget "['data']['order']['orderId']")"
  r=$(req owner POST /api/payments/confirm "{\"paymentKey\":\"simulated_$OID\",\"orderId\":\"$OID\",\"amount\":1}"); check "amount tamper → 400" 400 "$(code "$r")"
  r=$(req pro1 POST /api/payments/confirm "{\"paymentKey\":\"simulated_$OID\",\"orderId\":\"$OID\",\"amount\":$AMT}"); check "pro confirms → 403" 403 "$(code "$r")"
  r=$(req owner POST /api/payments/confirm "{\"paymentKey\":\"simulated_$OID\",\"orderId\":\"$OID\",\"amount\":$AMT}"); check "confirm" 200 "$(code "$r")"
  r=$(req owner POST /api/payments/confirm "{\"paymentKey\":\"simulated_$OID\",\"orderId\":\"$OID\",\"amount\":$AMT}"); check "confirm idempotent" True "$(body "$r" | jget "['data']['alreadyPaid']")"
  r=$(req owner GET /api/projects/$P/deal); check "dealStatus in_progress" in_progress "$(body "$r" | jget "['data']['project']['dealStatus']")"
  r=$(req pro1 GET /api/notifications); check "pro1 paid notif" payment_paid "$(body "$r" | jget "['data']['notifications'][0]['type']")"
  r=$(req owner GET /api/me/payments); check "owner payments 1" 1 "$(body "$r" | jget "['data']['payments'].__len__()")"; check "status paid" paid "$(body "$r" | jget "['data']['payments'][0]['status']")"
  r=$(req pro1 GET /api/me/payments); check "pro1 payments 1" 1 "$(body "$r" | jget "['data']['payments'].__len__()")"

  echo "== A-10/A-11 납품 요청 → 승인 → 수수료 10% → 전부 승인 시 completed"
  MS=$(req owner GET /api/projects/$P/deal | sed '$d' | python -X utf8 -c "import sys,json; d=json.load(sys.stdin); print(' '.join(m['id'] for m in d['data']['project']['contract']['milestones']))")
  set -- $MS; M1=$1; M2=$2; M3=$3
  r=$(req owner POST /api/milestones/$M1/approve); check "approve before submit → 409" 409 "$(code "$r")"
  r=$(req owner POST /api/milestones/$M1/submit); check "owner submits → 403" 403 "$(code "$r")"
  r=$(req pro1 POST /api/milestones/$M1/submit '{"note":"열화상 진단 완료, 배관 이음부 누수 확인"}'); check "pro1 submits M1" 200 "$(code "$r")"
  r=$(req pro1 POST /api/milestones/$M1/submit); check "submit twice → 409" 409 "$(code "$r")"
  r=$(req owner GET /api/notifications); check "owner submitted notif" milestone_submitted "$(body "$r" | jget "['data']['notifications'][0]['type']")"
  r=$(req owner POST /api/milestones/$M1/approve); check "approve M1" 200 "$(code "$r")"
  M1_AMT=$(req owner GET /api/projects/$P/deal | sed '$d' | jget "['data']['project']['contract']['milestones'][0]['amount']")
  check "fee = 10%" "$(python -c "print(round($M1_AMT*0.10))")" "$(body "$r" | jget "['data']['fee']")"
  check "net = 90%" "$(python -c "print($M1_AMT-round($M1_AMT*0.10))")" "$(body "$r" | jget "['data']['net']")"
  check "not completed yet" False "$(body "$r" | jget "['data']['completed']")"
  r=$(req pro1 GET /api/notifications); check "pro1 approved notif" milestone_approved "$(body "$r" | jget "['data']['notifications'][0]['type']")"
  r=$(req owner GET /api/me/payments); check "payment partially_settled" partially_settled "$(body "$r" | jget "['data']['payments'][0]['status']")"
  r=$(req owner POST /api/projects/$P/reviews '{"rating":5}'); check "review before completed → 409" 409 "$(code "$r")"
  r=$(req pro1 POST /api/milestones/$M2/submit); check "submit M2" 200 "$(code "$r")"; r=$(req owner POST /api/milestones/$M2/approve); check "approve M2" 200 "$(code "$r")"
  r=$(req pro1 POST /api/milestones/$M3/submit); check "submit M3" 200 "$(code "$r")"; r=$(req owner POST /api/milestones/$M3/approve); check "approve M3" 200 "$(code "$r")"; check "completed" True "$(body "$r" | jget "['data']['completed']")"
  r=$(req owner GET /api/projects/$P/deal); check "dealStatus completed" completed "$(body "$r" | jget "['data']['project']['dealStatus']")"
  r=$(req owner GET /api/me/payments); check "payment settled" settled "$(body "$r" | jget "['data']['payments'][0]['status']")"
  r=$(req pro1 GET /api/notifications); check "pro1 completed notif" project_completed "$(body "$r" | jget "['data']['notifications'][0]['type']")"

  echo "== A-12/A-13 상호 리뷰 1회 · 수정 불가 · 프로필 평점"
  r=$(req owner POST /api/projects/$P/reviews '{"rating":5,"tags":["책임감","기술력"],"comment":"진단부터 마감까지 깔끔했습니다."}'); check "owner reviews" 201 "$(code "$r")"
  r=$(req owner POST /api/projects/$P/reviews '{"rating":1}'); check "owner reviews twice → 409" 409 "$(code "$r")"
  r=$(req owner POST /api/projects/$P/reviews '{"rating":5,"tags":["명확한 요구사항"]}'); check "wrong-direction tag → 400/409" True "$(python -c "print('$(code "$r")' in ('400','409'))")"
  r=$(req pro2 POST /api/projects/$P/reviews '{"rating":5}'); check "stranger reviews → 403" 403 "$(code "$r")"
  r=$(req pro1 POST /api/projects/$P/reviews '{"rating":4,"tags":["신속한 피드백"],"comment":"결제가 빨라서 좋았습니다."}'); check "pro1 reviews" 201 "$(code "$r")"
  r=$(req pro1 GET /api/notifications); check "pro1 review notif" review_received "$(body "$r" | python -X utf8 -c "import sys,json; d=json.load(sys.stdin); print([n['type'] for n in d['data']['notifications'] if n['type']=='review_received'][0])")"
  PRO1_ID=$(req pro1 GET /api/auth/me | sed '$d' | jget "['data']['user']['id']")
  r=$(req owner GET /users/$PRO1_ID); check "pro1 profile page" 200 "$(code "$r")"; check "profile shows rating" True "$(body "$r" | python -X utf8 -c "import sys; print('깔끔했습니다' in sys.stdin.read())")"
fi

echo "== A-04 거부 경로: 새 프로젝트 → 수락 → 제시 → 거부 → 지원 rejected + 모집 open"
r=$(mk "E2E 거부 흐름"); check "create Q" 201 "$(code "$r")"; Q=$(body "$r" | jget "['data']['project']['id']")
r=$(req pro2 POST /api/projects/$Q/applications '{"coverLetter":"거부 경로 테스트 지원입니다. 스무 자 이상 채웁니다.","proposedAmount":2000000,"proposedDays":5}'); APPQ=$(body "$r" | jget "['data']['application']['id']")
r=$(req owner PATCH /api/applications/$APPQ '{"action":"accept"}'); check "accept pro2 on Q" 200 "$(code "$r")"
r=$(req owner POST /api/projects/$Q/offer '{"amount":1500000,"days":5}'); check "offer on Q (no analysis)" 201 "$(code "$r")"
r=$(req pro2 PATCH /api/projects/$Q/offer '{"decision":"decline"}'); check "pro2 declines" 200 "$(code "$r")"
r=$(req owner GET /api/me/projects); Q_STATE=$(body "$r" | python -X utf8 -c "import sys,json; d=json.load(sys.stdin); p=[x for x in d['data']['projects'] if x['id']=='$Q'][0]; print(p['recruitStatus'], p['dealStatus'])")
check "Q back to recruiting" "open None" "$Q_STATE"
r=$(req pro2 GET /api/me/applications); check "pro2 Q rejected" rejected "$(body "$r" | python -X utf8 -c "import sys,json; d=json.load(sys.stdin); print([a['status'] for a in d['data']['applications'] if a['project']['id']=='$Q'][0])")"
r=$(req owner GET /api/notifications); check "owner declined notif" offer_declined "$(body "$r" | jget "['data']['notifications'][0]['type']")"
r=$(req pro1 POST /api/projects/$Q/applications '{"coverLetter":"다시 모집 중인 공사에 지원합니다. 스무 자 이상.","proposedAmount":1800000,"proposedDays":6}'); check "pro1 can apply to Q again" 201 "$(code "$r")"

echo "== 화면 라우트 200"
for p in /projects/$P/deal /me/payments /pay/fail; do r=$(req owner GET "$p"); check "GET $p (owner)" 200 "$(code "$r")"; done
r=$(req pro1 GET /projects/$P/deal); check "GET deal (pro1)" 200 "$(code "$r")"
r=$(req pro2 GET /projects/$P/deal); check "GET deal (stranger) → redirect" 307 "$(code "$r")"

echo
echo "PASS=$PASS FAIL=$FAIL"
rm -rf "$J"
[ "$FAIL" = 0 ]
