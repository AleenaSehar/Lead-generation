# Lead details and activity timeline

Select **View details** on a card at `/leads` to open the lead drawer without leaving the pipeline. It displays saved contact and company fields, current status/source/score, and the matched rules behind that score.

## Audit timeline

Activities are stored in PostgreSQL and returned newest-first in pages of 15, with ID ordering used to make identical timestamps deterministic. The timeline includes creation, detail updates, stage changes, scoring changes, capture-form submissions, imports, and internal notes. Authenticated actions show the responsible workspace member; system/public actions are labelled `System`. Status- or score-only changes do not create a redundant generic update entry.

PostgreSQL stores timestamps in UTC and the browser displays them in the viewer's local timezone, including the timezone abbreviation. The drawer header includes the lead email so similarly named contacts are distinguishable.

Use **Load older activity** for long histories. Activity queries always constrain both lead and workspace, so another workspace cannot retrieve a timeline by guessing an ID.

## Notes and roles

Owners, admins, and members may add an internal note from the drawer. Notes are immutable audit events rather than editable lead fields. Viewers can inspect the lead and timeline but cannot add notes.

## Manual verification

1. Open `/leads` and choose **View details** on a card.
2. Confirm contact data, score explanation, and existing activities.
3. Add a note and confirm it appears first with your name and timestamp.
4. Close the drawer, drag the card to another stage, and reopen it to see the status event.
5. Press Escape or click the shaded backdrop to close the drawer.
