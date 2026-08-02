# LeadFlow delivery roadmap

Each item below is intended to ship as a focused pull request into `dev`. Dependencies are ordered so product features are built on tested identity, data, and automation foundations.

## Phase 0 — repository foundation

- [x] Repository standards, templates, and architecture notes
- [x] Next.js and TypeScript migration
- [x] CI checks for linting, types, production dependency auditing, and production builds

## Phase 1 — real application foundation

- [x] PostgreSQL and Prisma foundation
- [x] Supabase authentication and workspace membership
- [x] Authorized lead-management API
- [x] Dashboard connected to persistent lead data

**Outcome:** users can sign in and securely manage real leads within isolated workspaces.

## Phase 2 — lead capture and qualification

- [x] Public and embeddable capture forms
- [x] CSV import with mapping and duplicate handling
- [x] Explainable rule-based scoring
- [x] Lead activity timeline and audit trail

**Outcome:** prospects enter automatically and receive transparent qualification scores.

## Phase 3 — email automation

- [x] Email provider abstraction and delivery webhooks
- [x] Multi-step sequence builder
- [x] Idempotent workflow execution engine
- [x] Consent, unsubscribe, suppression, bounce, and complaint controls

**Outcome:** qualified, contactable leads can enter reliable and permission-aware sequences.

## Phase 4 — integrations and conversion

- [ ] Calendar booking
- [ ] CRM synchronization
- [ ] Email reply detection
- [ ] Team notifications
- [ ] Lead routing and ownership

**Outcome:** outreach activity moves cleanly into sales conversations and existing team tools.

## Phase 5 — reporting and intelligence

- [ ] Campaign and funnel analytics
- [ ] Revenue attribution
- [ ] A/B testing
- [ ] Data-grounded personalization assistance

**Outcome:** teams can identify which sources and activities generate qualified pipeline and revenue.

## Release model

When a tested group of features in `dev` is ready:

1. Create a release PR from `dev` into `main`.
2. Summarize features, migrations, configuration, and known limitations.
3. Complete staging verification and document rollback steps.
4. Merge the release PR and create a version tag.

AI-assisted personalization is intentionally scheduled after identity, data quality, workflow safety, and outreach controls are dependable.
