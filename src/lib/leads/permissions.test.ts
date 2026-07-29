import { describe, expect, it } from "vitest";
import { WorkspaceRole } from "@/generated/prisma/enums";
import { ApiError } from "@/lib/api/errors";
import { assertLeadPermission, type LeadAction } from "./permissions";

describe("lead permissions", () => {
  it.each([
    [WorkspaceRole.OWNER, "archive"],
    [WorkspaceRole.ADMIN, "archive"],
    [WorkspaceRole.MEMBER, "update"],
    [WorkspaceRole.VIEWER, "read"],
  ] as [WorkspaceRole, LeadAction][])("allows %s to %s", (role, action) => {
    expect(() => assertLeadPermission(role, action)).not.toThrow();
  });

  it.each([
    [WorkspaceRole.MEMBER, "archive"],
    [WorkspaceRole.VIEWER, "create"],
    [WorkspaceRole.VIEWER, "update"],
    [WorkspaceRole.VIEWER, "archive"],
  ] as [WorkspaceRole, LeadAction][])("denies %s permission to %s", (role, action) => {
    expect(() => assertLeadPermission(role, action)).toThrowError(ApiError);
  });
});
