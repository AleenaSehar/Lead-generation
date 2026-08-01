# Public lead-capture forms

Capture forms let a workspace collect permission-aware prospects without requiring visitors to create LeadFlow accounts.

## Create and publish

Owners and admins open `/forms`, choose the internal name and public copy, and create an active form. Members and viewers can inspect forms but cannot create, pause, or archive them.

Each form provides:

- a hosted `/f/:publicId` page;
- a copyable public link;
- iframe embed markup for an external website;
- active or inactive state;
- submission count.

Email is always required. Form owners can independently enable first name, last name, company, job title, company website, phone, and message fields, plus explicit consent. Never embed private workspace or user identifiers; the opaque public form ID is the only routing identifier.

## Submission behavior

An accepted submission:

1. resolves the active form and workspace;
2. validates fields and required consent;
3. checks a honeypot and a five-per-ten-minute client fingerprint limit;
4. creates a new website lead or updates the existing workspace lead with that email;
5. records consent source and timestamp;
6. creates `CaptureSubmission` and `FORM_SUBMITTED` activity records in the same transaction.

Pausing a form immediately makes both its hosted page and public API unavailable. Archiving preserves prior submission and lead history until the form itself is removed by workspace retention policy.

## Responsible use

Consent wording must accurately describe the follow-up a visitor will receive. A new form submission does not remove an existing suppression entry or authorize unrelated bulk outreach. Future email phases must check suppression status before delivery.
