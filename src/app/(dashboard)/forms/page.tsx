import { FormManager } from "@/components/capture-forms/form-manager";
import { PageHeading } from "@/components/shared/page-heading";
import { requireWorkspace } from "@/lib/auth";

export const metadata = { title: "Capture forms" };

export default async function FormsPage() {
  const { membership } = await requireWorkspace();
  return (
    <section className="page">
      <PageHeading eyebrow="CAPTURE" title="Lead capture forms" description="Publish a form and send every submission into your workspace pipeline." />
      <FormManager canManage={membership.role === "OWNER" || membership.role === "ADMIN"} />
    </section>
  );
}
