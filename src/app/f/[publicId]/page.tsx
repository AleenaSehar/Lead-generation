import { notFound } from "next/navigation";
import { PublicCaptureForm } from "@/components/capture-forms/public-capture-form";
import { ApiError } from "@/lib/api/errors";
import { getPublicForm } from "@/lib/capture-forms/service";
import { getDatabase } from "@/lib/database";

export const dynamic = "force-dynamic";

export default async function PublicFormPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const { publicId } = await params;
  let form;
  try {
    form = await getPublicForm(getDatabase(), publicId);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }

  return (
    <main className="capture-page">
      <section className="capture-card">
        <div className="capture-brand"><span className="brand-mark"><i /><i /><i /></span>LeadFlow</div>
        <h1>{form.title}</h1>
        {form.description && <p>{form.description}</p>}
        <PublicCaptureForm form={form} />
      </section>
    </main>
  );
}
