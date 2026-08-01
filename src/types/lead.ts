export type LeadStatus =
  | "NEW"
  | "QUALIFIED"
  | "CONTACTED"
  | "DISQUALIFIED"
  | "CONVERTED"
  | "ARCHIVED";
export type LeadSource =
  | "WEBSITE"
  | "LINKEDIN"
  | "REFERRAL"
  | "CSV_IMPORT"
  | "MANUAL"
  | "API"
  | "OTHER";

export interface Lead {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  jobTitle: string | null;
  companyName: string | null;
  companyDomain: string | null;
  score: number;
  scoreDetails: { version?: number; rawScore?: number; matchedRules?: { id: string; name: string; points: number }[] } | null;
  status: LeadStatus;
  source: LeadSource;
  consentAt: string | null;
  consentSource: string | null;
  customFields: Record<string, unknown> | null;
  lastActivityAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NewLead {
  email: string;
  firstName?: string;
  lastName?: string;
  companyName?: string;
  source: LeadSource;
}

export interface LeadPagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface LeadSummary {
  total: number;
  qualified: number;
  converted: number;
  byStatus: Partial<Record<LeadStatus, number>>;
  bySource: Partial<Record<LeadSource, number>>;
}
