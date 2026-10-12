import { z } from "zod";

/** 프로젝트 등록 3단계 퍼널 (AC B-07) — 단계별로 쪼개 두고 제출 시 합쳐서 검증한다. */

export const projectStep1 = z.object({
  title: z.string().trim().min(5, "제목을 5자 이상 입력해 주세요").max(80),
  description: z.string().trim().min(20, "어떤 공사인지 20자 이상 적어 주세요").max(4000),
  category: z.string().trim().min(1, "카테고리를 선택해 주세요"),
});

export const projectStep2 = z.object({
  recruitStartAt: z.iso.datetime().nullable().optional(),
  deadlineAt: z.iso.datetime("마감일을 선택해 주세요"),
  budget: z.coerce.number().int().min(0).nullable().optional(),
});

export const projectStep3 = z.object({
  skills: z.array(z.string().trim().min(1)).min(1, "필요한 전문분야를 하나 이상 골라 주세요"),
});

export const createProjectSchema = projectStep1.extend(projectStep2.shape).extend(projectStep3.shape);

export const updateProjectSchema = createProjectSchema.partial();

/** 목록 질의 — 검색·필터·정렬·페이지네이션 (AC B-11 ~ B-14) */
export const projectQuerySchema = z.object({
  q: z.string().trim().max(60).optional(),
  category: z.string().trim().optional(),
  skill: z.string().trim().optional(),
  budgetMin: z.coerce.number().int().min(0).optional(),
  budgetMax: z.coerce.number().int().min(0).optional(),
  deadlineBefore: z.iso.datetime().optional(),
  status: z.enum(["scheduled", "open", "closed"]).optional(),
  sort: z.enum(["latest", "deadline", "budget"]).default("latest"),
  page: z.coerce.number().int().min(1).default(1),
});

export const PROJECT_CATEGORIES = [
  "누수·방수",
  "전기·조명",
  "설비·배관",
  "외벽·도장",
  "인테리어·목공",
  "소방·안전",
  "공조·환기",
  "기타",
] as const;

export const PAGE_SIZE = 10; // AC B-14
