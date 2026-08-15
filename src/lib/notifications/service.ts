import type { PrismaClient } from "@/generated/prisma/client";
import { Prisma } from "@/generated/prisma/client";
import type { NotificationType } from "@/generated/prisma/enums";
import { ApiError } from "@/lib/api/errors";
import type { LeadServiceContext } from "@/lib/leads/service";

type Database = PrismaClient | Prisma.TransactionClient;
type NotificationInput = { workspaceId: string; leadId?: string; type: NotificationType; title: string; message: string; dedupeKey: string; metadata?: Prisma.InputJsonValue };

export const HIGH_SCORE_THRESHOLD = 70;

export async function createNotification(database: Database, input: NotificationInput) {
  return database.notification.upsert({ where: { dedupeKey: input.dedupeKey }, create: input, update: {} });
}

export async function listNotifications(database: PrismaClient, context: LeadServiceContext) {
  const [notifications, unreadCount] = await Promise.all([
    database.notification.findMany({ where: { workspaceId: context.workspaceId }, include: { reads: { where: { userId: context.userId }, select: { readAt: true } }, lead: { select: { id: true, firstName: true, lastName: true, email: true } } }, orderBy: { createdAt: "desc" }, take: 50 }),
    database.notification.count({ where: { workspaceId: context.workspaceId, reads: { none: { userId: context.userId } } } }),
  ]);
  return { unreadCount, notifications: notifications.map(({ reads, ...notification }) => ({ ...notification, readAt: reads[0]?.readAt ?? null })) };
}

export async function markNotificationRead(database: PrismaClient, context: LeadServiceContext, notificationId: string) {
  const notification = await database.notification.findFirst({ where: { id: notificationId, workspaceId: context.workspaceId }, select: { id: true } });
  if (!notification) throw new ApiError(404, "NOTIFICATION_NOT_FOUND", "Notification was not found.");
  return database.notificationRead.upsert({ where: { notificationId_userId: { notificationId, userId: context.userId } }, create: { notificationId, userId: context.userId }, update: { readAt: new Date() } });
}

export async function markAllNotificationsRead(database: PrismaClient, context: LeadServiceContext) {
  const unread = await database.notification.findMany({ where: { workspaceId: context.workspaceId, reads: { none: { userId: context.userId } } }, select: { id: true } });
  if (unread.length) await database.notificationRead.createMany({ data: unread.map(({ id }) => ({ notificationId: id, userId: context.userId })), skipDuplicates: true });
  return { marked: unread.length };
}
