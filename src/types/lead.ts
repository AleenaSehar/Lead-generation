export type LeadStatus = "New" | "Qualified" | "Contacted";
export type LeadSource = "Website" | "LinkedIn" | "Referral" | "Other";

export interface Lead {
  name: string;
  email: string;
  company: string;
  score: number;
  status: LeadStatus;
  source: LeadSource;
  time: string;
  color: string;
}

export interface NewLead {
  name: string;
  email: string;
  company: string;
  source: LeadSource;
}
