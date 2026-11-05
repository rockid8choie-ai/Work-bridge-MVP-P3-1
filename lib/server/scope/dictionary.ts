/**
 * 공정 사전 (docs/06 2장) — AI가 공정 이름을 자유롭게 짓지 못하게 가두는 울타리.
 * 카테고리별 흔한 소액 보수 공정. 단가는 점 추정이 아니라 "이 구간 밖이면 이상하다"를 거르는 범위다.
 * 출처: 표준시장단가·표준품셈의 노무·재료 구성을 참고하고 소액 보수 체감가로 보정. 코드로 두고 git 으로 버전 관리한다.
 *
 * keywords 는 규칙 기반 폴백(fallback.ts)이 설명문에서 공정을 고를 때 쓴다.
 */

export type DictItem = {
  code: string;
  name: string;
  unit: string;
  low: number;
  high: number;
  /** 기본 수량 가정 (수량을 알 수 없을 때) */
  qty: number;
  note?: string;
  /** 원인 미확정 시 선행되는 진단 공정이면 true */
  diagnostic?: boolean;
  /** 설명문에 이 단어가 있으면 폴백이 이 공정을 고른다 */
  keywords?: string[];
};

export type DictCategory = { category: string; items: DictItem[] };

const 누수방수: DictItem[] = [
  { code: "WP-01", name: "누수 원인 진단", unit: "회", low: 100_000, high: 300_000, qty: 1, diagnostic: true, note: "육안·청음·열화상. 결과에 따라 후속 공정 확정", keywords: ["누수", "물이 새", "샌다", "얼룩", "번짐", "곰팡이"] },
  { code: "WP-02", name: "실리콘·코킹 재시공", unit: "m", low: 8_000, high: 15_000, qty: 20, keywords: ["실리콘", "코킹", "창틀", "창호 틈"] },
  { code: "WP-03", name: "우레탄 방수 재시공", unit: "㎡", low: 35_000, high: 60_000, qty: 30, keywords: ["우레탄", "옥상", "방수층", "들떠", "균열"] },
  { code: "WP-04", name: "배관 교체(급수·배수)", unit: "식", low: 400_000, high: 1_200_000, qty: 1, keywords: ["배관", "파이프", "급수", "배수", "하수"] },
  { code: "WP-05", name: "천장·벽체 마감 복구", unit: "㎡", low: 50_000, high: 120_000, qty: 6, keywords: ["천장", "벽체", "석고", "마감", "얼룩"] },
  { code: "WP-06", name: "타일 철거·재시공", unit: "㎡", low: 80_000, high: 150_000, qty: 5, keywords: ["타일", "화장실", "욕실"] },
  { code: "WP-07", name: "폐기물 처리", unit: "식", low: 100_000, high: 300_000, qty: 1, keywords: ["철거", "폐기"] },
  { code: "WP-08", name: "외벽 크랙 보수(에폭시 주입)", unit: "m", low: 25_000, high: 50_000, qty: 10, keywords: ["외벽", "크랙", "균열", "벽면"] },
  { code: "WP-09", name: "배수구·드레인 정비", unit: "개소", low: 80_000, high: 200_000, qty: 2, keywords: ["배수구", "드레인", "역류", "막힘"] },
  { code: "WP-10", name: "지하 결로·누수 방수(침투식)", unit: "㎡", low: 40_000, high: 90_000, qty: 20, keywords: ["지하", "결로", "습기"] },
];

const 전기조명: DictItem[] = [
  { code: "EL-01", name: "전기 설비 점검·진단", unit: "회", low: 80_000, high: 200_000, qty: 1, diagnostic: true, keywords: ["차단기", "정전", "누전", "스파크", "타는 냄새", "깜빡"] },
  { code: "EL-02", name: "분전반·차단기 교체", unit: "개", low: 150_000, high: 450_000, qty: 1, keywords: ["분전반", "차단기", "누전"] },
  { code: "EL-03", name: "조명 기구 교체(LED)", unit: "개", low: 40_000, high: 120_000, qty: 10, keywords: ["조명", "형광등", "LED", "등기구", "전등"] },
  { code: "EL-04", name: "콘센트·스위치 교체", unit: "개", low: 20_000, high: 50_000, qty: 6, keywords: ["콘센트", "스위치"] },
  { code: "EL-05", name: "배선 교체·증설", unit: "m", low: 15_000, high: 35_000, qty: 30, keywords: ["배선", "전선", "증설", "노후"] },
  { code: "EL-06", name: "간판·외부 조명 배선 보수", unit: "식", low: 150_000, high: 500_000, qty: 1, keywords: ["간판", "외부 조명", "야간"] },
  { code: "EL-07", name: "접지 공사", unit: "식", low: 200_000, high: 600_000, qty: 1, keywords: ["접지"] },
  { code: "EL-08", name: "전열·전기온수기 전용 회로 설치", unit: "식", low: 150_000, high: 400_000, qty: 1, keywords: ["온수기", "전용 회로", "용량"] },
];

const 설비배관: DictItem[] = [
  { code: "PL-01", name: "설비·배관 진단", unit: "회", low: 80_000, high: 250_000, qty: 1, diagnostic: true, keywords: ["막힘", "역류", "냄새", "수압", "소음"] },
  { code: "PL-02", name: "배관 고압 세척·뚫음", unit: "개소", low: 80_000, high: 250_000, qty: 2, keywords: ["막힘", "뚫", "하수", "역류"] },
  { code: "PL-03", name: "급수관 교체", unit: "m", low: 40_000, high: 90_000, qty: 10, keywords: ["급수", "수압", "녹물", "동파"] },
  { code: "PL-04", name: "배수관 교체", unit: "m", low: 45_000, high: 100_000, qty: 10, keywords: ["배수", "하수", "오수"] },
  { code: "PL-05", name: "수전·양변기·세면기 교체", unit: "개", low: 120_000, high: 400_000, qty: 2, keywords: ["수전", "변기", "세면기", "화장실"] },
  { code: "PL-06", name: "보일러·온수기 점검·교체", unit: "대", low: 150_000, high: 1_500_000, qty: 1, keywords: ["보일러", "온수", "난방"] },
  { code: "PL-07", name: "정화조·그리스트랩 청소", unit: "회", low: 150_000, high: 500_000, qty: 1, keywords: ["정화조", "그리스", "냄새"] },
  { code: "PL-08", name: "배관 보온·동파 방지", unit: "m", low: 10_000, high: 25_000, qty: 20, keywords: ["동파", "보온", "겨울"] },
];

const 외벽도장: DictItem[] = [
  { code: "PT-01", name: "외벽 상태 진단", unit: "회", low: 100_000, high: 300_000, qty: 1, diagnostic: true, keywords: ["외벽", "벗겨", "들뜸", "탈락", "오염"] },
  { code: "PT-02", name: "고소 작업 장비(비계·곤돌라)", unit: "식", low: 300_000, high: 1_500_000, qty: 1, keywords: ["외벽", "고층", "옥상", "3층", "4층", "5층"] },
  { code: "PT-03", name: "기존 도막 제거·면 정리", unit: "㎡", low: 8_000, high: 20_000, qty: 50, keywords: ["벗겨", "들뜸", "도막"] },
  { code: "PT-04", name: "크랙 보수·퍼티", unit: "m", low: 15_000, high: 35_000, qty: 20, keywords: ["크랙", "균열", "틈"] },
  { code: "PT-05", name: "외벽 수성 도장(2회)", unit: "㎡", low: 15_000, high: 30_000, qty: 50, keywords: ["도장", "페인트", "칠", "색"] },
  { code: "PT-06", name: "내부 벽·천장 도장", unit: "㎡", low: 10_000, high: 22_000, qty: 60, keywords: ["내부", "사무실", "벽면", "천장 칠"] },
  { code: "PT-07", name: "발수 코팅", unit: "㎡", low: 8_000, high: 18_000, qty: 50, keywords: ["발수", "코팅", "빗물"] },
  { code: "PT-08", name: "폐기물 처리", unit: "식", low: 100_000, high: 300_000, qty: 1, keywords: ["철거", "폐기"] },
];

const 인테리어목공: DictItem[] = [
  { code: "IN-01", name: "현장 실측·진단", unit: "회", low: 80_000, high: 200_000, qty: 1, diagnostic: true, keywords: ["실측", "견적", "상태"] },
  { code: "IN-02", name: "철거·폐기", unit: "식", low: 200_000, high: 800_000, qty: 1, keywords: ["철거", "폐기", "뜯"] },
  { code: "IN-03", name: "석고보드 벽체·천장", unit: "㎡", low: 45_000, high: 90_000, qty: 20, keywords: ["석고", "벽체", "칸막이", "천장"] },
  { code: "IN-04", name: "문·문틀 교체", unit: "개", low: 250_000, high: 600_000, qty: 1, keywords: ["문", "문틀", "도어"] },
  { code: "IN-05", name: "바닥재 시공(장판·데코타일)", unit: "㎡", low: 25_000, high: 60_000, qty: 30, keywords: ["바닥", "장판", "타일", "마루"] },
  { code: "IN-06", name: "몰딩·걸레받이", unit: "m", low: 8_000, high: 18_000, qty: 30, keywords: ["몰딩", "걸레받이"] },
  { code: "IN-07", name: "도배", unit: "㎡", low: 10_000, high: 20_000, qty: 60, keywords: ["도배", "벽지"] },
  { code: "IN-08", name: "붙박이·선반·카운터 제작", unit: "식", low: 300_000, high: 1_500_000, qty: 1, keywords: ["선반", "카운터", "붙박이", "가구"] },
  { code: "IN-09", name: "창호·유리 교체", unit: "개", low: 200_000, high: 800_000, qty: 1, keywords: ["창호", "유리", "샷시", "새시"] },
];

const 소방안전: DictItem[] = [
  { code: "FS-01", name: "소방시설 점검", unit: "회", low: 100_000, high: 300_000, qty: 1, diagnostic: true, keywords: ["소방", "점검", "지적", "소방서"] },
  { code: "FS-02", name: "소화기 교체·충약", unit: "개", low: 20_000, high: 60_000, qty: 5, keywords: ["소화기", "충약"] },
  { code: "FS-03", name: "감지기·경보기 교체", unit: "개", low: 40_000, high: 120_000, qty: 5, keywords: ["감지기", "경보", "화재 경보", "오작동"] },
  { code: "FS-04", name: "유도등·비상조명 교체", unit: "개", low: 50_000, high: 150_000, qty: 4, keywords: ["유도등", "비상등", "비상조명"] },
  { code: "FS-05", name: "스프링클러 헤드·배관 보수", unit: "개소", low: 100_000, high: 400_000, qty: 2, keywords: ["스프링클러", "헤드"] },
  { code: "FS-06", name: "방화문 보수·교체", unit: "개", low: 200_000, high: 900_000, qty: 1, keywords: ["방화문", "도어클로저", "닫힘"] },
  { code: "FS-07", name: "피난 안내도·표지 정비", unit: "식", low: 50_000, high: 200_000, qty: 1, keywords: ["피난", "안내도", "표지"] },
];

const 공조환기: DictItem[] = [
  { code: "HV-01", name: "공조·환기 설비 진단", unit: "회", low: 80_000, high: 250_000, qty: 1, diagnostic: true, keywords: ["에어컨", "냉방", "난방", "환기", "냄새", "소음", "안 시원"] },
  { code: "HV-02", name: "에어컨 세척(실내기)", unit: "대", low: 80_000, high: 200_000, qty: 2, keywords: ["에어컨", "세척", "냄새", "곰팡이"] },
  { code: "HV-03", name: "냉매 충전·누설 점검", unit: "대", low: 100_000, high: 300_000, qty: 1, keywords: ["냉매", "가스", "안 시원", "냉방"] },
  { code: "HV-04", name: "실외기 이전·받침 보수", unit: "대", low: 150_000, high: 500_000, qty: 1, keywords: ["실외기", "소음", "진동"] },
  { code: "HV-05", name: "환풍기·덕트 교체", unit: "개소", low: 100_000, high: 400_000, qty: 2, keywords: ["환풍기", "덕트", "환기", "배기"] },
  { code: "HV-06", name: "덕트 청소", unit: "m", low: 15_000, high: 40_000, qty: 20, keywords: ["덕트", "먼지", "청소"] },
  { code: "HV-07", name: "에어컨 신규 설치", unit: "대", low: 150_000, high: 400_000, qty: 1, note: "기기 가격 별도", keywords: ["설치", "신규", "추가"] },
];

const 기타: DictItem[] = [
  { code: "ET-01", name: "현장 점검·진단", unit: "회", low: 80_000, high: 250_000, qty: 1, diagnostic: true, keywords: [] },
  { code: "ET-02", name: "보수 작업(인력)", unit: "인·일", low: 180_000, high: 300_000, qty: 2, keywords: [] },
  { code: "ET-03", name: "자재비", unit: "식", low: 100_000, high: 1_000_000, qty: 1, keywords: [] },
  { code: "ET-04", name: "폐기물 처리", unit: "식", low: 100_000, high: 300_000, qty: 1, keywords: ["철거", "폐기"] },
];

export const DICTIONARY: DictCategory[] = [
  { category: "누수·방수", items: 누수방수 },
  { category: "전기·조명", items: 전기조명 },
  { category: "설비·배관", items: 설비배관 },
  { category: "외벽·도장", items: 외벽도장 },
  { category: "인테리어·목공", items: 인테리어목공 },
  { category: "소방·안전", items: 소방안전 },
  { category: "공조·환기", items: 공조환기 },
  { category: "기타", items: 기타 },
];

export function dictionaryFor(category: string): DictItem[] {
  return DICTIONARY.find((d) => d.category === category)?.items ?? 기타;
}

export function findDictItem(category: string, code: string) {
  return dictionaryFor(category).find((i) => i.code === code) ?? null;
}
