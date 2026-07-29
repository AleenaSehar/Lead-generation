"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { getDatabase } from "@/lib/database";
import { Prisma } from "@/generated/prisma/client";
import { WorkspaceRole } from "@/generated/prisma/enums";

export interface WorkspaceActionState {
  error?: string;
}

const workspaceSchema = z.object({
  name: z.string().trim().min(2, "Workspace name is too short.").max(80, "Workspace name is too long."),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(3, "Workspace URL must be at least 3 characters.")
    .max(48, "Workspace URL is too long.")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers, and single hyphens."),
});

export async function createWorkspace(
  _: WorkspaceActionState,
  formData: FormData,
): Promise<WorkspaceActionState> {
  const user = await requireUser();
  const parsed = workspaceSchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const database = getDatabase();
  const existingMembership = await database.workspaceMember.findFirst({ where: { userId: user.id } });
  if (existingMembership) redirect("/");

  const existingSlug = await database.workspace.findUnique({ where: { slug: parsed.data.slug } });
  if (existingSlug) return { error: "That workspace URL is already taken." };

  try {
    await database.$transaction(async (transaction) => {
      const workspace = await transaction.workspace.create({ data: parsed.data });
      await transaction.workspaceMember.create({
        data: {
          workspaceId: workspace.id,
          userId: user.id,
          role: WorkspaceRole.OWNER,
        },
      });
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { error: "That workspace URL is already taken." };
    }
    return { error: "We could not create the workspace. Please try again." };
  }

  redirect("/");
}
