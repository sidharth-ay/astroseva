# AstroSeva

A Vedic astrology platform built around an astronomical core rather than a user
interface. Planet positions come from the JPL ephemeris via Skyfield, the
sidereal conversion is Lahiri, and every derived figure — houses, divisional
charts, strength, dasha, doshas, panchang — is computed from those positions
rather than approximated.

The product spans three areas: the calculating product (kundli, doshas,
matching, panchang, varshphal, numerology, gemstones, transit, festivals,
mantras, reports), a governed astrologer marketplace (onboarding, document
review, assessments, availability), and content and commerce (academy,
community, shop, saved charts).

## Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 (App Router) · React 19 · Tailwind 4 · TypeScript 5 |
| Backend | Python 3.12+ · FastAPI 0.115 · SQLAlchemy 2.0 · Alembic |
| Astronomy | Skyfield 1.55 (JPL DE421 ephemeris) |
| Services | PostgreSQL 16 · Redis 7 |
| AI | Gemini (optional — the app degrades gracefully without a key) |
| PDF | reportlab 4.2.2 |

## Prerequisites

- Python 3.12 or newer
- Node.js 20 or newer
- PostgreSQL and Redis (optional — see below)

## Setup

### 1. Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

Create `backend/.env` from the example. **Only `JWT_SECRET` is required** —
the service refuses to start without it, which is the intended fail-fast:

```bash
cp .env.example .env
# edit .env and set JWT_SECRET to a long random string
```

Run the migrations, then the server:

```bash
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

`alembic upgrade head` is the only safe way to build the schema on an existing
database. `init_db()` calls `create_all`, which creates tables but never
alters them, so a database that predates a migration will be left behind.

### 2. Frontend

```bash
cd frontend
npm install
npm run dev                      # http://localhost:3000
```

The client talks to `http://127.0.0.1:8000` by default. Set
`NEXT_PUBLIC_API_URL` to change it — the same variable feeds the
Content-Security-Policy's `connect-src`, so the two must agree.

### Services

PostgreSQL and Redis both have working fallbacks. Without them the app runs on
SQLite and a disk-backed cache, which is fine for local development. Set
`DATABASE_URL` and `REDIS_URL` in `.env` to use the real services.

## Commands

### Backend

```bash
python -m pytest tests/ -q       # the test suite
alembic upgrade head              # apply migrations
alembic downgrade base           # roll all the way back
alembic revision --autogenerate -m "description"   # new migration
```

### Frontend

```bash
npm run dev        # develop
npm run build      # production build
npm run lint       # eslint
npm run lint:baseline   # fails only if the count rises above the recorded baseline
npm test           # unit tests (Vitest)
npm run e2e        # end-to-end specs (Playwright, drives installed Chrome)
```

### CI

Four jobs run on every push and pull request: backend tests, migrations against
a real PostgreSQL, frontend gates, and end-to-end specs. See
`.github/workflows/ci.yml`.

## Project structure

```
backend/
  app/
    api/          # routers: one module per feature area
    core/         # the astronomy. Pure functions, no I/O
    db/           # engine, models, migrations config
    models/       # request/response schemas
    services/     # auth, cache, AI, PDF, storage, email, jobs
  data/           # the canonical city dataset
  migrations/     # Alembic versions
  tests/          # pytest suite
frontend/
  src/app/        # one directory per route
  src/components/ # shared UI
  src/lib/        # api client, motion, local storage
  e2e/            # Playwright specs
```

## How the pieces fit

`app/core` holds the calculation engines. They are pure functions with no
database or network access, which is what allows the test suite to pin them to
reference values. `app/api` holds the routers: each endpoint validates input,
resolves the caller's settings, checks the cache under a key that includes every
input that can change the result, and delegates to `core`.

The response cache is the highest-risk component in a calculation product, so a
cache key must contain every input that affects the answer. This is enforced by
a test rather than by convention.

## Testing

The suite is measured rather than asserted: 802 tests pass, and two of them pin
the engine to independently produced reference charts at roughly one arcminute
of tolerance. See `backend/tests/test_omkumar_reference.py` and
`backend/tests/test_kundli_reference.py`.

Every endpoint is rate limited, and a test walks the AST to fail if one is added
without a limit. See `backend/tests/test_rate_limits.py`.

## Known limitations

- **No native mobile app.** The client is responsive web only.
- **English only.** A language preference is stored but no translations exist.
- **No full Krishnamurti Paddhati engine.** The KP ayanamsa is accepted as an
  option; the cuspal-chart machinery is not implemented.
- **Email is off by default.** `EMAIL_ENABLED=0` logs outgoing mail instead of
  sending it, so password reset and verification flows are testable without SMTP
  credentials. Set the `SMTP_*` variables to send real mail.
- **The AI layer is optional.** Without `GEMINI_API_KEY` the app serves its own
  deterministic fallbacks.

## License

No licence has been chosen yet. This is a legal decision rather than a technical
one, so it is deliberately left open — see the note in `CONTRIBUTING.md`.