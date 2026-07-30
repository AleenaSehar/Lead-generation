import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "../src/generated/prisma/client";
import {
  CampaignStatus,
  LeadActivityType,
  LeadSourceType,
  LeadStatus,
  WorkspaceRole,
  WorkflowStatus,
} from "../src/generated/prisma/enums";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required to seed the database.");

const pool = new Pool({ connectionString });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  const user = await prisma.user.upsert({
    where: { email: "demo@leadflow.local" },
    update: { name: "Demo Owner" },
    create: { email: "demo@leadflow.local", name: "Demo Owner" },
  });

  const workspace = await prisma.workspace.upsert({
    where: { slug: "demo-workspace" },
    update: { name: "LeadFlow Demo" },
    create: { name: "LeadFlow Demo", slug: "demo-workspace" },
  });

  await prisma.workspaceMember.upsert({
    where: { workspaceId_userId: { workspaceId: workspace.id, userId: user.id } },
    update: { role: WorkspaceRole.OWNER },
    create: { workspaceId: workspace.id, userId: user.id, role: WorkspaceRole.OWNER },
  });

  const campaign = await prisma.campaign.upsert({
    where: { id: "demo-campaign" },
    update: { name: "Website inbound", status: CampaignStatus.ACTIVE },
    create: {
      id: "demo-campaign",
      workspaceId: workspace.id,
      createdById: user.id,
      name: "Website inbound",
      description: "Development campaign for validating the lead pipeline.",
      status: CampaignStatus.ACTIVE,
    },
  });

  const lead = await prisma.lead.upsert({
    where: {
      workspaceId_email: {
        workspaceId: workspace.id,
        email: "maya@northstar.example",
      },
    },
    update: {
      firstName: "Maya",
      lastName: "Chen",
      score: 92,
      status: LeadStatus.QUALIFIED,
    },
    create: {
      workspaceId: workspace.id,
      ownerId: user.id,
      campaignId: campaign.id,
      firstName: "Maya",
      lastName: "Chen",
      email: "maya@northstar.example",
      jobTitle: "Head of Growth",
      companyName: "Northstar Labs",
      companyDomain: "northstar.example",
      source: LeadSourceType.WEBSITE,
      status: LeadStatus.QUALIFIED,
      score: 92,
      scoreDetails: { companyFit: 30, roleFit: 25, intent: 37 },
      consentAt: new Date(),
      consentSource: "Development seed",
    },
  });

  const existingActivity = await prisma.leadActivity.findFirst({
    where: { leadId: lead.id, type: LeadActivityType.CREATED },
  });
  if (!existingActivity) {
    await prisma.leadActivity.create({
      data: {
        workspaceId: workspace.id,
        leadId: lead.id,
        actorId: user.id,
        type: LeadActivityType.CREATED,
        summary: "Lead created by the development seed.",
      },
    });
  }

  const existingWorkflow = await prisma.workflow.findFirst({
    where: { workspaceId: workspace.id, name: "Welcome sequence" },
  });
  if (!existingWorkflow) {
    await prisma.workflow.create({
      data: {
        workspaceId: workspace.id,
        campaignId: campaign.id,
        name: "Welcome sequence",
        description: "Development workflow; it does not send real email.",
        status: WorkflowStatus.DRAFT,
        triggerType: "LEAD_CREATED",
        triggerConfig: { sources: ["WEBSITE"] },
      },
    });
  }

  console.log(`Seeded workspace ${workspace.slug} with lead ${lead.email}.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
