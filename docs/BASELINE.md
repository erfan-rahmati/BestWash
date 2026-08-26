# BestWash baseline

Baseline captured before feature development on 2026-08-18.

- Node: 24.19.0 (project constraint: `>=24.11 <25`)
- pnpm: 11.19.0 (project constraint: `>=11.17 <12`)
- Repository style: pnpm/Turborepo modular monorepo
- Web: Next.js 16 / React 19, mobile-only customer shell (`max-width: 440px`)
- API: NestJS 11 / Prisma 7 / PostgreSQL
- Existing database migrations preserved: 8

Baseline verification:

- lint: passed
- typecheck: passed
- unit tests: 12/12 passed
- production build: passed

The uploaded archives contained generated `.next`, `dist`, `.turbo`, local
environment files and dependencies. Those artifacts were intentionally excluded
from the clean working repository. No uploaded secret is copied into the final
deliverable.
