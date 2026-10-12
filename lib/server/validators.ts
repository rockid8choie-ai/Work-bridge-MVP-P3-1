import { z } from "zod";

/** 요청 본문 검증 — 라우트에서 수동 if 문을 쓰지 않기 위해 한 곳에 모은다. */

export const signupSchema = z.object({
  name: z.string().trim().min(1, "이름을 입력해 주세요").max(40),
  email: z.email("이메일 형식이 올바르지 않습니다").trim().toLowerCase(),
  password: z
    .string()
    .min(8, "비밀번호는 8자 이상이어야 합니다")
    .max(72, "비밀번호가 너무 깁니다"), // bcrypt 입력 상한
  role: z.enum(["client", "freelancer"]),
});

export const loginSchema = z.object({
  email: z.email().trim().toLowerCase(),
  password: z.string().min(1, "비밀번호를 입력해 주세요"),
});

export const clientProfileSchema = z.object({
  buildingName: z.string().trim().min(1, "건물명을 입력해 주세요").max(60),
  buildingType: z.enum(["상가", "오피스", "다세대", "기타"]),
  region: z.string().trim().min(1, "지역을 입력해 주세요").max(40),
  website: z.url().or(z.literal("")).optional(),
});

export const vendorProfileSchema = z.object({
  mainCategory: z.string().trim().min(1, "주요 분야를 선택해 주세요"),
  years: z.coerce.number().int().min(0).max(70),
  hourlyRate: z.coerce.number().int().min(0),
  portfolioUrl: z.url().or(z.literal("")).optional(),
  skills: z.array(z.string().trim().min(1)).min(1, "전문분야를 하나 이상 선택해 주세요"),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
