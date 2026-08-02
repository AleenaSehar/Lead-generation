# Manual workflow execution engine

The workflow engine converts an email sequence draft into an immutable lead enrollment. It is development-only, manually triggered, and uses the mock email provider.

## Enrollment snapshots

Owners and admins enroll an eligible lead from **View details**. The lead must have an email, recorded consent, and no suppression entry. The server copies every ordered subject, body, delay, and position into `SequenceStepRun` records. Editing the source draft later cannot alter an active enrollment.

The enrollment request accepts an idempotency key. Repeating the same request returns the original enrollment; reusing its key for another lead or sequence returns a conflict.

## Scheduling and processing

Step due times are cumulative from enrollment time. **Process due step** handles at most one eligible step per request. It does not run a timer or background worker.

The processor atomically claims a pending step with a unique lease token. Other concurrent requests receive `already_claimed`. A processing lease becomes recoverable after five minutes if a process crashes.

Each step has a stable email idempotency key. Retries reuse that key, allowing the provider and email-event layer to return the prior accepted attempt instead of sending twice.

## Stop conditions

Before every step, the engine rechecks the lead. Missing email or consent, suppression, or archival cancels the enrollment and every remaining step. Owners/admins can also cancel manually. Provider errors mark the step and enrollment failed; processing again retries only that failed step.

## Manual verification

1. Create a sequence whose first step has a zero-minute delay.
2. Open a consented lead and enroll it under **Sequence enrollments**.
3. Process the due step and confirm one `QUEUED` and one `SENT` mock event.
4. Process again and confirm it waits for the next scheduled step rather than duplicating the first.
5. Cancel another enrollment and confirm all pending steps become cancelled.

There is no automatic scheduler or production delivery in this phase.
