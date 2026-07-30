import { getCurrentUser, getCurrentWorkspace } from "@/lib/auth";
import { ApiError } from "@/lib/api/errors";

export async function requireApiWorkspace() {
  const user = await getCurrentUser();
  if (!user) throw new ApiError(401, "UNAUTHENTICATED", "Authentication is required.");

  const membership = await getCurrentWorkspace();
  if (!membership) throw new ApiError(403, "WORKSPACE_REQUIRED", "A workspace membership is required.");

  return {
    userId: user.id,
    workspaceId: membership.workspaceId,
    role: membership.role,
  };
}
