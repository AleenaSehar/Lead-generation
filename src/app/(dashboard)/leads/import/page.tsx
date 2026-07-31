import { CsvImporter } from "@/components/leads/csv-importer";
import { PageHeading } from "@/components/shared/page-heading";

export const metadata = { title: "Import leads" };

export default function ImportLeadsPage() {
  return <section className="page"><PageHeading eyebrow="IMPORT" title="Import leads from CSV" description="Map spreadsheet columns into your workspace without creating duplicate contacts." /><CsvImporter /></section>;
}
