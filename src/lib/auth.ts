import { cache } from "react";
import { redirect } from "next/navigation";
import { getDatabase } from "@/lib/database";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import type { WorkspaceRole } from "@/generated/prisma/enums";

export const getCurrentUser = cache(async () => {
  if (!isSupabaseConfigured()) return null;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  const email = data.user?.email;
  if (error || !data.user || !email) return null;

  const authUser = data.user;
  const database = getDatabase();
  const name =
    (typeof authUser.user_metadata.full_name === "string" && authUser.user_metadata.full_name) ||
    (typeof authUser.user_metadata.name === "string" && authUser.user_metadata.name) ||
    email.split("@")[0];
  const imageUrl =
    typeof authUser.user_metadata.avatar_url === "string" ? authUser.user_metadata.avatar_url : null;

  const existingIdentity = await database.user.findUnique({
    where: { supabaseUserId: authUser.id },
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
      data: { supabaseUserId: authUser.id, name, imageUrl },
    });
  }

  return database.user.create({
    data: { supabaseUserId: authUser.id, email, name, imageUrl },
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
