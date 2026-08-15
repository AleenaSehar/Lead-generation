# Team notifications

LeadFlow stores important workspace events in an internal notification center. The notification itself is shared across the workspace, while read/unread state is recorded independently for each member.

## Notification events

- a lead enters `QUALIFIED`;
- a lead crosses the high-score threshold of 70;
- an email reply is received;
- a meeting is booked; or
- a CRM synchronization attempt fails.

Notifications are created inside the same database transaction as their triggering business event wherever possible. Stable deduplication keys prevent webhook retries, CRM retries, or repeated requests from generating duplicate alerts.

## Using the notification center

The top-bar notification button displays the current user's unread count and opens the latest 50 workspace notifications. Selecting a lead-related notification marks it read and opens that lead's detail drawer. **Mark all read** affects only the current user.

All authenticated workspace roles may view and mark notifications. Queries are scoped to the active workspace, and a user cannot mark another workspace's notification as read.

## Current boundary

This phase provides persistent in-app notifications. Slack, Microsoft Teams, external email alerts, per-event preferences, and push delivery are separate provider integrations. The browser refreshes the unread count every 60 seconds; real-time subscriptions can replace polling later without changing the underlying event model.
