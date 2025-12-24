# Drafts Hub

>A developer-focused workspace for composing, editing and managing on-chain drafts and allowlists. This repository contains a Next.js frontend (client/) and a Move package (move/allowlist/) used by the project.

## Table of contents

- About
- Project structure
- Tech stack
- Quick start
- Development
- Building & deploying
- Move package (allowlist)
- API endpoints and notable code paths
- Contributing
- License & contact

## About

Drafts Hub is a prototype web app for creating, editing and committing drafts which integrate with on-chain Move packages and wallet tooling. The frontend is implemented with Next.js (App Router + TypeScript) and includes a rich text editing canvas powered by TipTap. The repository also includes a Move package under `move/allowlist/` with sources and build artifacts.

This README documents how to run the client locally, where to find important source files, and how to work with the Move package included in the repo.

## Project structure (high level)

- `client/` — Next.js application (TypeScript + Tailwind). Primary developer surface.
  - `app/` — Next.js App Router pages and server/actions.
  - `components/` — Reusable UI components (EditorCanvas, Sidebar, Topbar, etc.).
  - `api/` — Edge/server routes used by the app (AI transforms, commit endpoints, walrus/quilts routes).
  - `types/` — global type declarations.

- `move/allowlist/` — Move package. Contains `sources/`, `build/`, and tests for an on-chain allowlist.

## Tech stack

- Frontend: Next.js 16 (App Router), React 19, TypeScript
- Styling: Tailwind CSS
- Editor: TipTap (rich text editor)
- Wallet / blockchain helpers: `@mysten/dapp-kit`, `@mysten/seal`
- UI primitives: `@radix-ui/*` packages
- Move language package for on-chain logic under `move/allowlist/`

Dependencies (selected, from `client/package.json`):

- `next` 16.x
- `react` 19.x, `react-dom` 19.x
- `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-image`
- `@mysten/dapp-kit`, `@mysten/seal`

Dev dependencies include TypeScript, ESLint, Tailwind and related tooling.

## Quick start (local)

Prerequisites

- Node.js 18+ (recommended). Use nvm if you need multiple Node versions.
- npm (bundled with Node). You can also use `pnpm` or `yarn` if you prefer.

Install dependencies and run the dev server:

```bash
# from repository root
cd client
npm install
npm run dev
```

Open http://localhost:3000 in your browser. The app uses the Next.js App Router; edit `client/app/page.tsx` and components inside `client/app/` to change behavior.

Available scripts (from `client/package.json`)

- `npm run dev` — start the Next.js development server
- `npm run build` — build the Next.js app for production
- `npm run start` — run the production server after build
- `npm run lint` — run ESLint

## Development notes

- Important constants/config: `client/app/constants.ts` exposes a `TESTNET_PACKAGE_ID` used by the frontend to reference a package on testnet.
- Editor: `client/components/EditorCanvas.tsx` contains the TipTap integration for composing drafts.
- Wallet integration: look for `@mysten/dapp-kit` usage and wallet provider wrappers in `client/app/providers.tsx`.
- Server routes: API endpoints live under `client/app/api/` (for example `client/app/api/ai/transform/route.ts` and commit endpoints). These are Next.js server/edge routes used by the app.

### Useful developer tips

- When editing styles, the repo uses Tailwind CSS (see `client/postcss.config.mjs` and Tailwind config in the project). Rebuild is automatic in dev mode.
- Run `npm run lint` regularly to keep code style consistent.

## Building & deploying

The project is a standard Next.js application. To create a production build and run it locally:

```bash
cd client
npm install
npm run build
npm run start
```

For hosting, platforms like Vercel, Netlify or self-hosting on a node server work. The `client` app follows typical Next.js conventions and should be deployable to Vercel out-of-the-box.

## Move package: `move/allowlist/`

This repo contains a Move package under `move/allowlist/`. The package includes:

- `sources/` — Move source files (including `allowlist.move`, `utils.move` and any dependency trees)
- `build/` — compiled modules and build metadata
- `tests/` — Move-based tests for the allowlist package

Building and testing the Move package depends on your Move toolchain (for example `sui` cli or the Move compiler you are using). This repo doesn't include a single standardized Makefile for Move; follow your project's Move toolchain documentation to build and test the package. The package's `Move.toml` contains metadata and address placeholders.

If you want help wiring an automated Move build (CI steps or `Makefile`), open an issue or submit a PR — I can add suggested commands for your toolchain.

## API endpoints & notable code paths

- `client/app/api/ai/transform/route.ts` — server-side AI transformations used by the editor
- `client/app/api/commit/route.ts` — commit endpoint used to persist or commit drafts
- `client/app/api/walrus/quilts/route.ts` — quilt related endpoints (see nested routes under `walrus/quilts/`)

Explore these files in `client/app/api/` to understand how the frontend interacts with server-side logic. Many endpoints are lightweight wrappers which orchestrate transforms, validation, and commits.

## Contributing

Thank you for contributing! A few guidelines to make contributions smooth:

1. Fork the repository and create a feature branch: `git checkout -b feat/your-feature`
2. Keep changes focused and add small, self-contained commits.
3. Run `npm run lint` and ensure TypeScript builds cleanly for changed files.
4. Open a pull request describing the change, the rationale, and any testing steps.

If you plan to modify the Move package, include instructions in your PR for how to build and test the package locally (toolchain commands, address overrides, etc.).

## Tests

There are Move tests under `move/allowlist/tests/`. Frontend unit tests are not included by default — consider adding Jest or Vitest if you want automated JS/TS tests.

## License

No license file is included in this repository. If you want this project to be open source, add a `LICENSE` file to the repo (for example `MIT` or `Apache-2.0`).

## Contact / Next steps

If you'd like I can:

- Add CI workflows (GitHub Actions) to build the frontend and optionally the Move package
- Add a `Makefile`/scripts to build the Move package with a chosen toolchain
- Add a CONTRIBUTING.md and CODE_OF_CONDUCT

Open an issue or reply in the PR with which of these you'd like next and I will implement it.
