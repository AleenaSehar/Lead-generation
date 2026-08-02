# Email safety controls

LeadFlow treats consent and suppression as separate requirements. A lead is eligible for outreach only when it has an email address, recorded consent, is not archived, and its address is absent from the workspace suppression list. These rules are checked before enrollment and again before every sequence step.

## Unsubscribe links

Every email generated through the provider abstraction receives an encrypted and authenticated `/unsubscribe/:token` URL. The token binds the workspace, lead, and normalized email address without exposing those values, and cannot be changed without invalidating its authentication tag. The public page does not require a LeadFlow account. Submitting it is idempotent: repeated requests leave one suppression and one unsubscribe event.

Set a dedicated secret and the externally reachable application URL:

```env
UNSUBSCRIBE_SECRET=replace-with-at-least-32-random-characters
NEXT_PUBLIC_APP_URL=https://app.example.com
```

Production refuses to generate unsubscribe links without a sufficiently long secret. Development falls back to a local-only value so mock delivery remains easy to test.

## Suppression lifecycle

Owners and admins use **Settings → Email safety** to add manual blocks or legal requests and remove entries. All workspace roles may view the complete list. Unsubscribe, bounce, and complaint reasons are reserved for recipient actions and verified provider webhooks.

Creating a suppression normalizes the address, stores the workspace entry, cancels active or failed enrollments and unfinished steps for the matching lead, and records lead activity. Removing an entry does not create consent and does not restart cancelled enrollments.

## Provider events

Signed `BOUNCED`, `COMPLAINED`, and `UNSUBSCRIBED` webhooks automatically create the corresponding suppression. Provider event IDs and same-reason suppressions are idempotent, so retries do not duplicate the audit trail. Once suppressed, direct attempts and later workflow steps fail closed.

The current provider remains mock-only; these controls establish the safety contract that a real provider must preserve.
