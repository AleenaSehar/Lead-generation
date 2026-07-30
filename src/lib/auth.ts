import { cache } from "react";
import { redirect } from "next/navigation";
import { getDatabase } from "@/lib/database";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import type { WorkspaceRole } from "@/generated/prisma/enums";

export const getCurrentUser = cache(async () => {
  if (!isSupabaseConfigured()) return null;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const claims = data?.claims;
  const email = typeof claims?.email === "string" ? claims.email : null;
  const supabaseUserId = typeof claims?.sub === "string" ? claims.sub : null;
  if (error || !claims || !email || !supabaseUserId) return null;

  const database = getDatabase();
  const metadata =
    claims.user_metadata && typeof claims.user_metadata === "object"
      ? (claims.user_metadata as Record<string, unknown>)
      : {};
  const name =
    (typeof metadata.full_name === "string" && metadata.full_name) ||
    (typeof metadata.name === "string" && metadata.name) ||
    email.split("@")[0];
  const imageUrl =
    typeof metadata.avatar_url === "string" ? metadata.avatar_url : null;

  const existingIdentity = await database.user.findUnique({
    where: { supabaseUserId },
  });

  if (existingIdentity) {
    return database.user.update({
      where: { id: existingIdentity.id },
      data: { email, name, imageUrl },
    });
  }

  const existingEmail = await database.user.findUnique({ where: { email } });
  if (existingEmail) {
    return database.user.update({
      where: { id: existingEmail.id },
      data: { supabaseUserId, name, imageUrl },
    });
  }

  return database.user.create({
    data: { supabaseUserId, email, name, imageUrl },
  });
});

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  return user;
}

export const getCurrentWorkspace = cache(async () => {
  const user = await getCurrentUser();
  if (!user) return null;

  return getDatabase().workspaceMember.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: "asc" },
    include: { workspace: true },
  });
});

export async function requireWorkspace() {
  const user = await requireUser();
  const membership = await getCurrentWorkspace();
  if (!membership) redirect("/onboarding");
  return { user, membership, workspace: membership.workspace };
}

export async function requireWorkspaceRole(allowedRoles: WorkspaceRole[]) {
  const context = await requireWorkspace();
  if (!allowedRoles.includes(context.membership.role)) redirect("/");
  return context;
}
