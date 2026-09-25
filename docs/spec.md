# TaskFlow spec

## Goal
A role-aware team task manager demo: managers plan and assign work, members update their own tasks.
One demo workspace, two roles, projects, memberships, tasks, comments, dashboard.

## Out of scope (v1)
Billing, email invitations, file storage, calendar sync, real-time collaboration.

## Screens
Sign in · Dashboard · Projects · Project detail · Task detail · Settings
(Add a photo or sketch of each wireframe to docs/screenshots/ and link it here.)

## Acceptance scenarios
1. **Member updates own task.** Given Sam is signed in, when he opens "Fix broken links report" and sets status to
   In progress and saves, then the page says "Saved." and a refresh still shows In progress.
2. **Member cannot reassign.** Given Sam is signed in, when he sends PATCH /api/tasks/{id} with a new assigneeId,
   then the API answers 403 and nothing changes.
3. **Non-member is blocked.** Given Sam is not in "Customer Onboarding", when he opens /projects/{its id},
   then he sees "Project not found." (API answers 404).
4. **Manager assigns work.** Given Maya is signed in, when she adds a task in "Website Relaunch" assigned to Sam,
   then it appears in the task list and on Sam's dashboard.
5. **Dashboard counts.** Given fresh seed data, Maya's dashboard shows 11 open, 3 due soon, 3 overdue, 4 completed;
   Sam's shows 7, 2, 2, 2.

## Decisions
- Auth: HttpOnly, SameSite=Strict session cookie (not a token in localStorage). 8 h sliding expiry.
- Non-members get 404 instead of 403 so project ids can't be probed.
- Dates stored in UTC and displayed in UTC; a due date means "end of that day, UTC".
- Demo reset: `docker compose down -v && docker compose up -d db`, then start the API (it re-seeds an empty database).
