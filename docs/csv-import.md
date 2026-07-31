# CSV lead import

CSV import moves an existing spreadsheet or CRM export into the authenticated LeadFlow workspace.

## Workflow

1. Open `/leads/import` and select a `.csv` file.
2. Review the first five parsed rows.
3. Map CSV headers to LeadFlow fields. Email is mandatory.
4. Choose whether existing workspace emails should be skipped or updated.
5. Run the import and review created, updated, skipped, failed, and row-error counts.

The importer supports email, first name, last name, phone, job title, company, company website/domain, score, and status. Status values use `NEW`, `QUALIFIED`, `CONTACTED`, `DISQUALIFIED`, `CONVERTED`, or `ARCHIVED`; score is a whole number from 0 to 100.

## Limits and privacy

- Maximum file size: 5 MB.
- Maximum rows per request: 1,000.
- The raw file is parsed in the browser and is not uploaded or retained.
- Only mapped row values are sent to the authorized API.
- Row values and header names are length-bounded on the server.
- Imported leads use source `CSV_IMPORT` and receive an activity record.

CSV import does not imply consent to outreach. Imported consent timestamps are not fabricated, and later email delivery must still check consent and suppression rules.
