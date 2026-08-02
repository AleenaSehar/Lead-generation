import { BookingManager } from "@/components/bookings/booking-manager";
import { requireWorkspace } from "@/lib/auth";
export default async function BookingsPage() { const { membership } = await requireWorkspace(); return <BookingManager canManage={["OWNER", "ADMIN"].includes(membership.role)} />; }
