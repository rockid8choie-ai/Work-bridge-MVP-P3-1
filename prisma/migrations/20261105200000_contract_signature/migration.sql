-- AlterTable: 전자 서명 증적 (서명 이미지 · 서명자 이름 · 문서 해시)
ALTER TABLE "Contract" ADD COLUMN     "documentHash" TEXT,
ADD COLUMN     "clientSignName" TEXT,
ADD COLUMN     "clientSignature" TEXT,
ADD COLUMN     "freelancerSignName" TEXT,
ADD COLUMN     "freelancerSignature" TEXT;
