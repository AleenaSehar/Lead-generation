export interface LeadInsightContext {
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  jobTitle: string | null;
  companyName: string | null;
  companyDomain: string | null;
  status: string;
  source: string;
  score: number;
  scoreDetails: unknown;
  consentAt: Date | null;
  lastActivityAt: Date | null;
}

export interface LeadInsight {
  fitScore: number;
  summary: string;
  reasons: string[];
  nextAction: string;
}

export interface LeadInsightProvider {
  readonly name: string;
  generateInsight(context: LeadInsightContext): Promise<LeadInsight>;
}
