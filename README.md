# Lumina Tech Labs — Lead Capture and Qualification Platform

A platform that helps Lumina Tech Labs capture and qualify B2B leads: visitors enter data about their corporate space, get an instant energy savings estimate, and can then schedule a diagnostic meeting with the sales team.

## What the application does

- **Calculates a savings estimate**: based on floor area, number of workstations, energy bill, and current infrastructure, it shows estimated savings, investment payback period, and carbon reduction.
- **Collects lead data**: to unlock the full report, the visitor fills in name, corporate email, phone number, job title, and company.
- **Automatically scores the lead**: larger/more promising leads are flagged as high priority and routed directly to the sales team.
- **Allows scheduling a meeting**: shows the sales team's available time slots and automatically creates the invite and video call room.
- **Notifies sales and the CRM**: alerts the team (email/Slack/Teams) and automatically registers the lead in the company's CRM.

## Tools used

| Layer | Tool |
| --- | --- |
| Frontend | Angular |
| Backend | Java with Spring Boot |
| Database | PostgreSQL (Supabase) |
| Infrastructure | Docker |
| Calendar | Google Calendar / Outlook |
| Video calls | Google Meet / Teams / Zoom |
| CRM | HubSpot / Salesforce / Pipefy / RD Station |