# Contributing

## The rules that matter

**One defect per commit.** A commit that fixes a bug and refactors the
surrounding code cannot be reviewed, because the reviewer cannot tell which
change caused which effect. If you want to refactor, do it in its own commit.

**The commit message states the defect and its impact**, not the files touched.
`Fix the migration rollback, which left the schema half-migrated` tells a
reader what was wrong. `Update auth.py` does not.

**A fix ships with a test that fails without it.** This is how the project
avoids regressing. When a test cannot be written for a fix, say so in the commit
message.

**Verify before pushing.** The five gates:

```bash
cd backend && python -m pytest tests/ -q
cd ../frontend && npx tsc --noEmit && npm run lint:baseline && npm run build
```

CI runs these plus migrations against PostgreSQL and the end-to-end specs, so a
local pass is necessary but not sufficient.

## Adding an endpoint

1. Add it to the appropriate router in `backend/app/api/`.
2. **Rate limit it.** `@limiter.limit` requires the handler to accept
   `request: Request`. A test walks the AST and fails if an endpoint is added
   without a limit.
3. Include every input that can change the result in the cache key. Omitting one
   produces intermittent, unreproducible wrongness.
4. Add a test.

## Adding a migration

```bash
alembic revision --autogenerate -m "description"
alembic upgrade head
alembic downgrade base      # must work
alembic upgrade head        # and re-apply cleanly
```

`create_all` creates tables but never alters them, so a migration is the only
safe way to change an existing schema. New columns that existing rows must have
need a `server_default`.

## Adding a dependency

Pin it exactly in `requirements.txt` (backend) or `package.json` (frontend), and
add a test that it actually imports and works. A pin that resolves but is broken
is worse than no pin.

## Licence

Not chosen. Adding a `LICENSE` file is a legal decision for the owner, not a
technical one for a contributor, so it is left out until they make it.
- Frontend: no hardcoded colours — use the design tokens in `globals.css`.
  Every data-driven page distinguishes loading, empty, error and result states.
- Comments explain why, not what. When a line is non-obvious, the reason belongs
  in the commit message or a comment, not a docstring that restates the code.