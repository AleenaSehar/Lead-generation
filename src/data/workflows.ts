import type { Workflow } from "@/types/workflow";

export const initialWorkflows: Workflow[] = [
  { icon: "✉", tone: "email", name: "Welcome sequence", description: "Send a three-step personalized introduction after a lead is captured.", processed: "128", performanceLabel: "Success rate", performance: "46.2%", active: true },
  { icon: "✦", tone: "score", name: "Smart lead scoring", description: "Score leads using profile fit, source, and engagement signals.", processed: "1,284", performanceLabel: "Success rate", performance: "30.1%", active: true },
  { icon: "♢", tone: "notify", name: "Hot lead alert", description: "Notify your sales team when a lead's score reaches 80 or higher.", processed: "16", performanceLabel: "Avg. response", performance: "8 min", active: true },
  { icon: "↻", tone: "email", name: "Re-engagement", description: "Reconnect with qualified leads who have been quiet for seven days.", processed: "34", performanceLabel: "Success rate", performance: "21.4%", active: false },
];
