# Calendar booking

LeadFlow provides one public booking page per workspace. Owners and admins configure it under `/bookings`; all workspace roles can view upcoming meetings.

## Configuration

The booking page stores its public title, description, IANA time zone, meeting duration, buffer, minimum notice, maximum advance window, weekly availability, and active state. Initial availability is Monday through Friday, 09:00–17:00, in the browser's detected time zone. Saving creates an opaque public ID and a shareable `/book/:publicId` URL.

Supported meeting durations are 15, 30, 45, and 60 minutes. Availability is evaluated in the workspace booking time zone while visitors see slots and confirmations in their own browser time zone.

## Public flow

The public API returns only active page details and currently available slots. On booking, the server recalculates availability instead of trusting the browser. A database uniqueness constraint and serializable transaction prevent two visitors from claiming the same start time.

A confirmed booking:

1. links the normalized email to an existing workspace lead or creates a website-sourced lead;
2. stores the UTC start and end with the visitor's IANA time zone;
3. creates a `MEETING_BOOKED` lead activity; and
4. updates the lead's last-activity timestamp.

Booking a meeting does not grant marketing consent. The lead remains ineligible for sequences unless consent was recorded separately.

## Current boundary

This phase creates reliable internal LeadFlow meeting records. It does not yet create Google or Microsoft calendar events, send reminders, or generate video-conference links. Those provider integrations can build on the internal booking record in a focused follow-up PR.
