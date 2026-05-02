# Hostel Management System (Frontend Only)

This is a **frontend-only** Hostel Management System built to match the assignment PDF requirements:

- Navigation between pages
- Clean UI design (Bootstrap)
- Dashboard with summary cards
- Dummy data (**no backend**)
- Ready to deploy on **Vercel**

## Pages

- `dashboard.html` — summary cards + recent allocations
- `rooms.html` — room list + availability
- `allocation.html` — assign student to room
- `vacate.html` — checkout / vacate a student from a room

## Run locally

Just open `dashboard.html` in a browser.

Tip: For best results (and to avoid any browser restrictions), you can use a simple static server:

```bash
npx serve .
```

## Deploy on Vercel

1. Push this folder to a GitHub repository.
2. In Vercel, click **New Project**, import the repo, and deploy.
3. Vercel will host it as a static site.

