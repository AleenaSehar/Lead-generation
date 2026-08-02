import { notFound } from "next/navigation";
import { PublicBookingForm } from "@/components/bookings/public-booking-form";
import { ApiError } from "@/lib/api/errors";
import { getPublicBookingPage } from "@/lib/bookings/service";
import { getDatabase } from "@/lib/database";

export const dynamic = "force-dynamic";
export default async function PublicBookingPage({ params }: { params: Promise<{ publicId: string }> }) {
  const { publicId } = await params;
  let page;
  try { page = await getPublicBookingPage(getDatabase(), publicId); }
  catch (error) { if (error instanceof ApiError && error.status === 404) notFound(); throw error; }
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const maxDate = new Date(now.getTime() + page.maximumAdvanceDays * 86_400_000).toISOString().slice(0, 10);
  return <main className="public-booking-page"><PublicBookingForm page={page} today={today} maxDate={maxDate} /></main>;
}
