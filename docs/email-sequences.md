# Email sequence drafts

The `/automations` page is a real, workspace-scoped authoring interface for multi-step email drafts. It replaces the earlier demonstration automation cards.

## Authoring model

A sequence has a name, optional description, `DRAFT` status, and up to 20 ordered email steps. Every step requires a subject and plain-text body plus a wait in minutes from `0` to `43,200` (30 days). Array order is the source of truth; the server assigns positions and replaces steps atomically when a draft is saved.

Owners and admins may create, edit, reorder, and archive drafts. Members and viewers can inspect drafts without changing them. Archive removes a sequence from the active list without deleting its database record.

## Safety boundary

There is intentionally no activate, enroll, schedule, or send control. Saving a draft only stores content. The next workflow-engine PR will own execution state and idempotency, and compliance controls must be in place before production delivery becomes available.

## Manual verification

1. Open `/automations` and create a named sequence.
2. Add two or more steps with different delays.
3. Move steps up and down, save, reload, and confirm order persists.
4. Edit content and confirm the updated timestamp/list count.
5. Archive the draft and confirm it leaves the list.
6. Confirm no action offers activation or real sending.
