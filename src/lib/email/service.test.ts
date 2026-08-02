import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@/generated/prisma/client";
import { EmailEventType, LeadSourceType, LeadStatus, SuppressionReason, WorkspaceRole } from "@/generated/prisma/enums";
import type { EmailProvider } from "@/lib/email/provider";
import { ingestEmailWebhook, sendLeadEmail } from "@/lib/email/service";
import type { LeadServiceContext } from "@/lib/leads/service";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required for database integration tests.");
const pool = new Pool({ connectionString });
const database = new PrismaClient({ adapter: new PrismaPg(pool) });
const runId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
let owner: LeadServiceContext;
let viewer: LeadServiceContext;
let workspaceId: string;
const provider: EmailProvider = { name: "mock", async send(message) { return { provider: "mock", messageId: `mock-${message.idempotencyKey}`, acceptedAt: new Date() }; } };

beforeAll(async () => {
  const workspace = await database.workspace.create({ data: { name: "Email test", slug: `email-${runId}` } });
  const [ownerUser, viewerUser] = await Promise.all([
    database.user.create({ data: { email: `email-owner-${runId}@example.test`, name: "Email Owner" } }),
    database.user.create({ data: { email: `email-viewer-${runId}@example.test` } }),
  ]);
  await database.workspaceMember.createMany({ data: [
    { workspaceId: workspace.id, userId: ownerUser.id, role: WorkspaceRole.OWNER },
    { workspaceId: workspace.id, userId: viewerUser.id, role: WorkspaceRole.VIEWER },
  ] });
  workspaceId = workspace.id;
  owner = { workspaceId, userId: ownerUser.id, role: WorkspaceRole.OWNER };
  viewer = { workspaceId, userId: viewerUser.id, role: WorkspaceRole.VIEWER };
});

afterAll(async () => {
  await database.workspace.deleteMany({ where: { id: workspaceId } });
  await database.user.deleteMany({ where: { email: { contains: runId } } });
  await database.$disconnect(); await pool.end();
});

async function lead(email: string, consent = true) {
  return database.lead.create({ data: { workspaceId, email, status: LeadStatus.NEW, source: LeadSourceType.MANUAL, consentAt: consent ? new Date() : null } });
}

describe("email delivery foundation", () => {
  it("persists a consented mock attempt and an attributed activity", async () => {
    const target = await lead(`consented-${runId}@example.test`);
    const result = await sendLeadEmail(database, provider, owner, { leadId: target.id, subject: "Welcome", text: "Hello" });
    expect(result).toMatchObject({ status: EmailEventType.SENT, simulated: true });
    const events = await database.emailEvent.findMany({ where: { leadId: target.id }, orderBy: { occurredAt: "asc" } });
    expect(events.map((event) => event.type)).toEqual([EmailEventType.QUEUED, EmailEventType.SENT]);
    expect(await database.leadActivity.findFirst({ where: { leadId: target.id, type: "EMAIL_SENT" } })).not.toBeNull();
  });

  it("rejects missing consent, suppression, and viewers", async () => {
    const noConsent = await lead(`no-consent-${runId}@example.test`, false);
    await expect(sendLeadEmail(database, provider, owner, { leadId: noConsent.id, subject: "No", text: "No" })).rejects.toMatchObject({ code: "EMAIL_CONSENT_REQUIRED" });
    const suppressed = await lead(`suppressed-${runId}@example.test`);
    await database.suppressionEntry.create({ data: { workspaceId, email: suppressed.email!, reason: SuppressionReason.MANUAL } });
    await expect(sendLeadEmail(database, provider, owner, { leadId: suppressed.id, subject: "No", text: "No" })).rejects.toMatchObject({ code: "EMAIL_SUPPRESSED" });
    await expect(sendLeadEmail(database, provider, viewer, { leadId: suppressed.id, subject: "No", text: "No" })).rejects.toMatchObject({ status: 403 });
  });

  it("ingests provider events idempotently", async () => {
    const target = await lead(`webhook-${runId}@example.test`);
    const sent = await sendLeadEmail(database, provider, owner, { leadId: target.id, subject: "Webhook", text: "Test" });
    const input = { eventId: `evt-${runId}`, messageId: sent.providerMessageId, type: EmailEventType.DELIVERED, occurredAt: new Date().toISOString(), metadata: { response: "250 OK" } };
    expect((await ingestEmailWebhook(database, "mock", input)).duplicate).toBe(false);
    expect((await ingestEmailWebhook(database, "mock", input)).duplicate).toBe(true);
    expect(await database.emailEvent.count({ where: { providerEventId: input.eventId } })).toBe(1);
  });

  it("suppresses a recipient after a bounce webhook", async () => {
    const target = await lead(`bounce-${runId}@example.test`);
    const sent = await sendLeadEmail(database, provider, owner, { leadId: target.id, subject: "Bounce", text: "Test" });
    const input = { eventId: `bounce-event-${runId}`, messageId: sent.providerMessageId, type: EmailEventType.BOUNCED, occurredAt: new Date().toISOString(), metadata: { reason: "mailbox unavailable" } };
    await ingestEmailWebhook(database, "mock", input);
    await ingestEmailWebhook(database, "mock", input);
    expect(await database.suppressionEntry.findUnique({ where: { workspaceId_email: { workspaceId, email: target.email! } } })).toMatchObject({ reason: SuppressionReason.BOUNCED });
    expect(await database.leadActivity.count({ where: { leadId: target.id, type: "EMAIL_BOUNCED" } })).toBe(1);
    await expect(sendLeadEmail(database, provider, owner, { leadId: target.id, subject: "Blocked", text: "No" })).rejects.toMatchObject({ code: "EMAIL_SUPPRESSED" });
  });
});
