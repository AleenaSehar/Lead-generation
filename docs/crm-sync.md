# CRM synchronization foundation

LeadFlow provides a provider-independent CRM boundary with a development-safe mock implementation. It proves configuration, field mapping, contact linking, idempotency, retry, permissions, and audit behavior without transferring lead data externally.

## Configuration

Owners and admins configure the mock connection at `/integrations`. A workspace has at most one active connection. Field mapping translates LeadFlow contact attributes into provider property names for email, names, phone, title, company, domain, status, and score.

The connection test verifies the selected provider adapter and records its last successful test time. The current `MOCK` adapter always remains local. `HUBSPOT` is reserved in the schema but fails closed until the real provider PR supplies secure credentials and HTTP behavior.

## Synchronizing a lead

Owners, admins, and members can select **Sync to CRM** from a lead's details. Viewers remain read-only. A lead must have an email address and the workspace connection must be active.

Each synchronization:

1. maps the current lead snapshot into provider properties;
2. derives an idempotency key from the connection version and lead update timestamp;
3. creates a durable attempt before calling the provider;
4. creates or updates one `CrmContactLink` with the external contact ID; and
5. records success or failure in the lead activity timeline.

Repeating an unchanged request returns its completed attempt without another provider call. Editing the lead creates a new attempt while retaining the same external contact link. Failed attempts can retry with the same key.

## Current boundary

The mock provider creates deterministic identifiers such as `mock_contact_...`; it does not make network requests. OAuth/access-token storage, provider rate limits, remote schemas, and webhook reconciliation belong to the focused real-provider integration that follows this foundation.
