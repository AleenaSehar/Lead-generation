# CRM synchronization

LeadFlow provides a provider-independent CRM boundary with both a development-safe mock implementation and a real HubSpot contact adapter. Configuration, field mapping, contact linking, idempotency, retry metadata, permissions, and audit behavior stay inside the shared service layer.

## Configuration

Owners and admins configure the connection at `/integrations`. A workspace has at most one connection. Field mapping translates LeadFlow contact attributes into provider property names for email, names, phone, title, company, domain, status, and score. Optional mappings may be left blank.

The connection test verifies the selected provider adapter and records its last successful test time. The `MOCK` adapter always remains local. The `HUBSPOT` adapter makes authenticated server-to-server requests and fails closed when credentials are missing.

### HubSpot setup

1. Create a HubSpot app/private app for the account used by this LeadFlow deployment.
2. Grant `crm.objects.contacts.read` and `crm.objects.contacts.write` scopes.
3. Add `HUBSPOT_ACCESS_TOKEN` to the server-only environment and restart the application.
4. Select **HubSpot**, save the connection, and run **Test connection** before synchronizing a lead.

Never prefix this token with `NEXT_PUBLIC_`, place it in client code, or commit it. The current credential is deployment-wide and is suitable for a single connected HubSpot account. Multi-workspace SaaS installations should replace it with per-workspace OAuth authorization and encrypted refresh-token storage.

## Synchronizing a lead

Owners, admins, and members can select **Sync to CRM** from a lead's details. Viewers remain read-only. A lead must have an email address and the workspace connection must be active.

Each synchronization:

1. maps the current lead snapshot into provider properties;
2. derives an idempotency key from the connection version and lead update timestamp;
3. creates a durable attempt before calling the provider;
4. creates or updates one `CrmContactLink` with the external contact ID; and
5. records success or failure in the lead activity timeline.

Repeating an unchanged request returns its completed attempt without another provider call. Editing the lead creates a new attempt while retaining the same external contact link. Failed attempts can retry with the same key.

## Provider behavior and current boundary

The mock provider creates deterministic identifiers such as `mock_contact_...`; it does not make network requests. HubSpot upserts new contacts by email and updates subsequent versions through the stored HubSpot contact ID. Only mapped, non-null properties are sent. Rate-limit and temporary server failures are marked retryable in attempt metadata, but retries remain manual until the background worker phase.

HubSpot property names must exist in the connected account. The default mapping uses standard contact properties and leaves LeadFlow status/score blank because those require custom HubSpot properties. Webhook reconciliation and per-workspace OAuth are not part of this PR.
