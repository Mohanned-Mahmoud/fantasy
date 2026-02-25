# Fantasy 5-a-side Football

A full-stack Fantasy Premier League-inspired web app for local 5-a-side matches.

## Architecture

- **Frontend**: Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS v4 — runs on port 5000
- **Backend**: Python FastAPI + SQLModel (SQLite by default, swap to PostgreSQL via DATABASE_URL) — runs on port 8000
- **Auth**: JWT-based via FastAPI with bcrypt password hashing
- **Database**: SQLite (local dev). Change `DATABASE_URL` in `backend/.env` for PostgreSQL/Supabase/Neon

## Folder Structure

```
/
├── frontend/              # Next.js application
│   ├── app/               # App Router pages
│   │   ├── page.tsx       # Landing page
│   │   ├── login/         # Login page
│   │   ├── register/      # Registration page
│   │   ├── dashboard/     # Manager dashboard
│   │   ├── squad/         # Squad picker
│   │   ├── leaderboard/   # Global leaderboard
│   │   ├── minileagues/   # Mini-leagues
│   │   └── admin/         # Admin panel (admin only)
│   ├── components/
│   │   ├── Navbar.tsx     # Sidebar + mobile bottom nav
│   │   └── PitchView.tsx  # Visual 5-a-side pitch component
│   └── lib/
│       ├── api.ts         # Axios client (proxies to /api → backend)
│       └── auth.ts        # JWT auth helpers
│
└── backend/               # FastAPI application
    ├── main.py            # App entry point
    └── app/
        ├── core/
        │   ├── config.py     # Settings (env vars)
        │   ├── database.py   # SQLModel engine + session
        │   └── security.py   # JWT + bcrypt auth
        ├── models/
        │   └── models.py     # SQLModel DB models
        ├── api/
        │   ├── auth.py       # /api/auth routes
        │   ├── players.py    # /api/players routes
        │   ├── gameweeks.py  # /api/gameweeks routes
        │   ├── teams.py      # /api/teams routes
        │   ├── leaderboard.py# /api/leaderboard routes
        │   └── minileagues.py# /api/minileagues routes
        └── services/
            └── points_engine.py  # Points calculation logic
```

## Workflows

- **Start application** — `cd frontend && npm run dev` — Next.js on port 5000 (webview)
- **Backend API** — `cd backend && python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload` — FastAPI on port 8000 (console)

## Fantasy Points System

| Event | GK | DEF | MID | ATT |
|-------|-----|-----|-----|-----|
| Goal | +6 | +5 | +5 | +4 |
| Assist | +3 | +3 | +3 | +3 |
| Clean Sheet | +5 | +3 | +1 | — |
| Save (per 3) | +1 | — | — | — |
| MVP | +3 | +3 | +3 | +3 |
| Nutmeg/Skill | +1 | +1 | +1 | +1 |
| Yellow Card | -1 | -1 | -1 | -1 |
| Red Card | -3 | -3 | -3 | -3 |
| Own Goal | -2 | -2 | -2 | -2 |

## Squad Rules

- Exactly 5 players per team
- Minimum 1 GK
- Budget: £50M per gameweek
- 1 free transfer per gameweek (extra = -4 pts each)
- Captain gets 2× points

## Admin Setup

To create an admin user, use `backend/create_admin.py`:
```bash
cd backend && python create_admin.py
```

## External Database (PostgreSQL)

To use Supabase or Neon instead of SQLite, update `backend/.env`:
```
DATABASE_URL=postgresql://user:password@host:5432/dbname
```

## API Documentation

Visit `http://localhost:8000/docs` for the interactive FastAPI Swagger docs.
