import { Overview } from "@/components/dashboard/overview";
import { listMeetings } from "@/lib/bookings/service";
import { getDatabase } from "@/lib/database";
import { requireWorkspace } from "@/lib/auth";

export default async function OverviewPage() {
  const { user, membership } = await requireWorkspace();
  const meetings = await listMeetings(getDatabase(), { workspaceId: membership.workspaceId, userId: user.id, role: membership.role });
  return <Overview upcomingMeetings={meetings.slice(0, 3).map((meeting) => ({ id: meeting.id, startAt: meeting.startAt.toISOString(), attendeeName: meeting.attendeeName, attendeeEmail: meeting.attendeeEmail }))} />;
}
