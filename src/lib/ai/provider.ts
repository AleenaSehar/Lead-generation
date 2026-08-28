export interface LeadInsightInput {
  firstName: string | null;
  lastName: string | null;
  jobTitle: string | null;
  companyName: string | null;
  companyDomain: string | null;
  source: string;
  status: string;
  ruleScore: number;
  hasConsent: boolean;
}

export interface LeadInsightResult {
  fitScore: number;
  summary: string;
  reasons: string[];
  nextAction: string;
}

export interface LeadInsightProvider {
  readonly name: string;
  generate(input: LeadInsightInput): Promise<LeadInsightResult>;
}
