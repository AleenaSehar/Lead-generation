import { UnsubscribeForm } from "@/components/email/unsubscribe-form";
import { getDatabase } from "@/lib/database";
import { getUnsubscribeStatus } from "@/lib/suppressions/service";

export const dynamic = "force-dynamic";
export default async function UnsubscribePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const status = await getUnsubscribeStatus(getDatabase(), token);
  return <main className="unsubscribe-page"><UnsubscribeForm token={token} email={status.email} initiallyUnsubscribed={status.unsubscribed} /></main>;
}
