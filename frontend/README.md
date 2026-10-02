# AstroSeva frontend

Next.js 16 (App Router) · React 19 · Tailwind 4 · TypeScript 5.

See the [root README](../README.md) for architecture, setup, and the full
command list. This file covers only what is specific to this app.

## Develop

```bash
npm install
npm run dev        # http://localhost:3000
```

The client calls `http://127.0.0.1:8000` by default. Set `NEXT_PUBLIC_API_URL`
to point it elsewhere — the same variable feeds the Content-Security-Policy's
`connect-src`, so the two must agree or the browser blocks every request.

## Test

```bash
npm test           # unit tests (Vitest + Testing Library)
npm run e2e        # end-to-end specs (Playwright)
```

`npm run e2e` drives the Chrome already installed on the machine rather than
downloading a browser. A CI runner has no Chrome, so the workflow sets
`E2E_BROWSER_CHANNEL=chromium` to use the bundled build there instead.

## Lint

```bash
npm run lint            # eslint
npm run lint:baseline   # fails only if the count rises above the recorded baseline
```

The repo carries a number of pre-existing lint problems. `lint:baseline` records
the counts in `eslint-baseline.json` and fails only when they increase, so a
broken branch does not train anyone to ignore lint. After an intentional change,
re-record with `npm run lint:baseline:update`. Once the backlog reaches zero,
delete both the script and the baseline file.

## Structure

```
src/app/        one directory per route
src/components/ shared UI (navigation, chart renderer, city search, gates)
src/lib/        api client, motion helpers, local storage
e2e/            Playwright specs
```

## Notes

- `next dev` rewrites `AGENTS.md` on every run. The end-to-end job uses
  `next start` for exactly this reason.
- The app is dark-only. The settings page stores a theme preference, but there
  is no light palette to apply it to.