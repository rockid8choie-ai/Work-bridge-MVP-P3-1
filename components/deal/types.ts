/** 거래 화면이 서버에서 클라이언트 컴포넌트로 넘기는 평탄한 모양. Date 는 ISO 문자열. */

export type ScopeItemView = {
  id: string;
  sortOrder: number;
  name: string;
  description: string;
  estimate: number;
  rationale: string;
  quantity: number | null;
  unit: string | null;
  conditional: boolean;
  editedBy: string | null;
};

export type AnalysisView = {
  id: string;
  totalEstimate: number;
  model: string;
  assumptions: string[];
  missingInfo: string[];
  confidence: string | null;
  createdAt: string;
  items: ScopeItemView[];
};

export type OfferView = {
  amount: number | null;
  days: number | null;
  message: string | null;
  status: "pending" | "agreed" | "declined" | null;
  offeredAt: string | null;
};

export type SnapshotItemView = {
  sortOrder: number;
  name: string;
  description: string;
  estimate: number;
  rationale: string;
  quantity: number | null;
  unit: string | null;
  conditional: boolean;
};

export type MilestoneView = {
  id: string;
  sortOrder: number;
  title: string;
  amount: number;
  status: "todo" | "in_progress" | "submitted" | "approved";
  fee: number | null;
  net: number | null;
  submittedAt: string | null;
  approvedAt: string | null;
  note: string | null;
};

export type PaymentView = {
  id: string;
  pgOrderId: string;
  amount: number;
  status: "pending" | "paid" | "partially_settled" | "settled" | "refunded";
  method: string | null;
  receiptUrl: string | null;
  paidAt: string | null;
};

export type ContractView = {
  id: string;
  agreedAmount: number;
  durationDays: number;
  documentHash: string | null;
  clientSignedAt: string | null;
  clientSignName: string | null;
  clientSignature: string | null;
  freelancerSignedAt: string | null;
  freelancerSignName: string | null;
  freelancerSignature: string | null;
  signedAt: string | null;
  createdAt: string;
  scopeSnapshot: SnapshotItemView[];
  milestones: MilestoneView[];
  payments: PaymentView[];
};

export type ReviewView = {
  id: string;
  direction: "client_to_freelancer" | "freelancer_to_client";
  authorId: string;
  rating: number;
  comment: string | null;
  tags: string[];
  createdAt: string;
};

export type DealView = {
  projectId: string;
  title: string;
  category: string;
  description: string;
  budget: number | null;
  dealStatus: "awaiting_contract" | "awaiting_payment" | "in_progress" | "completed" | "cancelled" | null;
  client: { id: string; name: string; building: string | null; region: string | null };
  freelancer: { id: string; name: string; mainCategory: string | null } | null;
  application: { id: string; proposedAmount: number; proposedDays: number } | null;
  offer: OfferView;
  analysis: AnalysisView | null;
  contract: ContractView | null;
  reviews: ReviewView[];
  me: { id: string; isClient: boolean; isFreelancer: boolean };
};
