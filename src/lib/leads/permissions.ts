import { WorkspaceRole } from "@/generated/prisma/enums";
import { ApiError } from "@/lib/api/errors";

export type LeadAction = "read" | "create" | "update" | "archive";

const permissions: Record<LeadAction, WorkspaceRole[]> = {
  read: [WorkspaceRole.OWNER, WorkspaceRole.ADMIN, WorkspaceRole.MEMBER, WorkspaceRole.VIEWER],
  create: [WorkspaceRole.OWNER, WorkspaceRole.ADMIN, WorkspaceRole.MEMBER],
  update: [WorkspaceRole.OWNER, WorkspaceRole.ADMIN, WorkspaceRole.MEMBER],
  archive: [WorkspaceRole.OWNER, WorkspaceRole.ADMIN],
};

export function assertLeadPermission(role: WorkspaceRole, action: LeadAction) {
  if (!permissions[action].includes(role)) {
    throw new ApiError(403, "INSUFFICIENT_ROLE", `Your workspace role cannot ${action} leads.`);
  }
}
