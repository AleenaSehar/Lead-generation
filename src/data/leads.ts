import type { Lead } from "@/types/lead";

export const seedLeads: Lead[] = [
  { name: "Maya Chen", email: "maya@northstar.io", company: "Northstar Labs", score: 92, status: "Qualified", source: "Website", time: "2 min ago", color: "#dce8ff" },
  { name: "Oliver Brooks", email: "oliver@arcstone.co", company: "Arcstone", score: 84, status: "Qualified", source: "LinkedIn", time: "18 min ago", color: "#ffe5d7" },
  { name: "Sophia Patel", email: "sophia@lumenhq.com", company: "Lumen HQ", score: 76, status: "Contacted", source: "Referral", time: "43 min ago", color: "#dff5e8" },
  { name: "Noah Williams", email: "noah@verve.ai", company: "Verve AI", score: 68, status: "New", source: "Website", time: "1 hr ago", color: "#f1e1ff" },
  { name: "Emma Wilson", email: "emma@orbitworks.com", company: "Orbit Works", score: 88, status: "Qualified", source: "LinkedIn", time: "3 hrs ago", color: "#ffe3ee" },
  { name: "Liam Garcia", email: "liam@clearpath.dev", company: "Clearpath", score: 72, status: "Contacted", source: "Other", time: "Yesterday", color: "#e0f2f5" },
  { name: "Ava Martinez", email: "ava@daybreak.co", company: "Daybreak", score: 61, status: "New", source: "Referral", time: "Yesterday", color: "#fff0d7" },
  { name: "Ethan Kim", email: "ethan@basecamp.studio", company: "Basecamp Studio", score: 81, status: "Qualified", source: "Website", time: "2 days ago", color: "#e7e2ff" },
];
