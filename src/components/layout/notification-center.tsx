"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Notification = { id: string; type: string; title: string; message: string; createdAt: string; readAt: string | null; leadId: string | null };
type NotificationResponse = { unreadCount: number; notifications: Notification[] };

async function request<T>(url: string, init?: RequestInit) {
  const response = await fetch(url, { ...init, headers: { "Content-Type": "application/json" } });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error?.message ?? "Unable to load notifications.");
  return body.data as T;
}

export function NotificationCenter() {
  const [open, setOpen] = useState(false); const [data, setData] = useState<NotificationResponse>({ unreadCount: 0, notifications: [] }); const [error, setError] = useState(""); const container = useRef<HTMLDivElement>(null); const router = useRouter();
  const load = useCallback(async () => { try { setData(await request<NotificationResponse>("/api/notifications")); setError(""); } catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Unable to load notifications."); } }, []);
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); const refresh = window.setInterval(() => void load(), 60_000); return () => { window.clearTimeout(timer); window.clearInterval(refresh); }; }, [load]);
  useEffect(() => { function outside(event: MouseEvent) { if (!container.current?.contains(event.target as Node)) setOpen(false); } document.addEventListener("mousedown", outside); return () => document.removeEventListener("mousedown", outside); }, []);
  async function markAll() { await request("/api/notifications", { method: "PATCH" }); await load(); }
  async function select(notification: Notification) { if (!notification.readAt) await request(`/api/notifications/${notification.id}`, { method: "PATCH" }); setOpen(false); await load(); if (notification.leadId) router.push(`/leads?leadId=${encodeURIComponent(notification.leadId)}`); }
  return <div className="notification-center" ref={container}><button className="icon-button notification-trigger" type="button" aria-label={`Notifications${data.unreadCount ? `, ${data.unreadCount} unread` : ""}`} aria-expanded={open} onClick={() => setOpen((value) => !value)}>♢{data.unreadCount > 0 && <b>{data.unreadCount > 99 ? "99+" : data.unreadCount}</b>}</button>{open && <section className="notification-popover"><header><div><strong>Notifications</strong><small>{data.unreadCount} unread</small></div>{data.unreadCount > 0 && <button type="button" onClick={() => void markAll()}>Mark all read</button>}</header>{error ? <p className="notification-error">{error}</p> : data.notifications.length ? <div className="notification-list">{data.notifications.map((notification) => <button type="button" className={notification.readAt ? "" : "unread"} key={notification.id} onClick={() => void select(notification)}><span>{notification.type === "EMAIL_REPLIED" ? "↩" : notification.type === "MEETING_BOOKED" ? "◷" : notification.type === "CRM_SYNC_FAILED" ? "!" : "✦"}</span><div><strong>{notification.title}</strong><p>{notification.message}</p><small>{new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(notification.createdAt))}</small></div></button>)}</div> : <p className="notification-empty">No notifications yet.</p>}</section>}</div>;
}
