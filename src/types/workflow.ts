export type WorkflowTone = "email" | "score" | "notify";

export interface Workflow {
  icon: string;
  tone: WorkflowTone;
  name: string;
  description: string;
  processed: string;
  performanceLabel: string;
  performance: string;
  active: boolean;
}
