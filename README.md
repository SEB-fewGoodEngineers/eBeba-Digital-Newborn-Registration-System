# eBeba

Digital newborn registration: hospital, parent, MoI, Social Work Center (CSW) and Health Insurance Fund (FZO) in one workflow. A bootcamp sprint project. **All data is fictional.**

Read [CONVENTIONS.md](CONVENTIONS.md) before you write code. Every pull request is checked against it.

## What you need

- **Node 22.22.0 or newer.** Check with `node -v`.
- VS Code with the **Prettier** and **ESLint** extensions (VS Code suggests them when you open the folder).
- A MongoDB Atlas connection string (from the instructor). Put **your own database name** at the end, for example `/ebeba-marko`. The seed deletes everything in its database, so never point it at someone else's or the shared one.

## Demo data

`npm run seed -- --yes` (in `server/`) creates fictional institutions, one account for every role, and four babies at different stages. Run it again at any time to reset your database. Every account has the password from `SEED_PASSWORD` in `.env` (default `eBeba-demo-2026`).

| Account                       | Use it for                                                                                    |
| ----------------------------- | --------------------------------------------------------------------------------------------- |
| `jelena.petrovic@example.com` | A parent with a registered baby (id `64b000000000000000000001`) and full health and care data |
| `ana.vukovic@example.com`     | The demo-day parent: no baby yet                                                              |
| `milena.markovic@example.com` | A parent whose application is waiting at MoI                                                  |
| `moi.officer@example.com`     | MoI staff                                                                                     |
| `nurse.primorje@example.com`  | Hospital staff (the demo-day hospital)                                                        |

The seed prints the full list of accounts.

## Shared code: stubs

The shared services already exist as **stubs**: the function names are final, so every epic can call them from day 1. Their owners make them real (see `docs/epics/`).

| Stub                                       | Owner  | Today                                             |
| ------------------------------------------ | ------ | ------------------------------------------------- |
| `middleware/auth.js` → `requireBabyAccess` | Epic 1 | Only linked parents get access                    |
| `services/audit` → `log()`                 | Epic 1 | Writes to the console                             |
| `services/workflow`                        | Epic 2 | No status rules; approval only changes the status |
| `services/documents` → `pdf.*`             | Epic 3 | Returns 501 "not built yet"                       |
| `services/ai` → `suggest()`                | Epic 3 | Mock provider with one sample flag                |
| `services/notifications` → `notify()`      | Epic 4 | Writes to the console                             |

## First-time setup

```bash
# 1. Root tools (Prettier)
npm install

# 2. Server
cd server
npm install
cp .env.example .env      # fill in MONGODB_URI (with YOUR OWN database name) and JWT_SECRET
npm run seed -- --yes     # fills your database with demo data and prints the logins
npm run dev               # http://localhost:3000

# 3. Client (in a second terminal)
cd client
npm install
cp .env.example .env      # VITE_BACK_END_SERVER_URL=http://localhost:3000
npm run dev               # http://localhost:5173
```

## Everyday commands

| Where     | Command                               | What it does                                        |
| --------- | ------------------------------------- | --------------------------------------------------- |
| `server/` | `npm run dev`                         | Starts the API and restarts it when you save        |
| `server/` | `npm test`                            | Runs the automated tests                            |
| `client/` | `npm run dev`                         | Starts the React app                                |
| `client/` | `npm run lint`                        | Checks the React code                               |
| root      | `npm run format`                      | Formats all code with Prettier                      |
| root      | `npm run ai-context -- <epic number>` | Builds one file for your AI chat (see AI-PROMPT.md) |

## Folders

- `server/` – Express 4 + Mongoose 8 API (CommonJS)
- `client/` – React 19 + React Router 8 + MUI 9 (Vite)
- `CONVENTIONS.md` – the rules for code, Git and pull requests
- `AI-PROMPT.md` – how to work with your AI assistant
- `docs/epics/` – your stories, one file per epic
- `docs/ebeba.dbml` – the data model (open it on dbdiagram.io)
- `.github/pull_request_template.md` – filled in for every PR

## Automatic checks

Every pull request into `development` or `main` runs two checks on GitHub (`.github/workflows/ci.yml`):

- **Server tests**: `npm test` in `server/`
- **Client lint**: `npm run lint` in `client/`

A PR can only be merged when both are green.

## Branches and deployment

- `development` – all story PRs are merged here. Branch from it, and open PRs into it.
- `main` – production. The instructor merges `development` into `main` to deploy.

- **Server → Render.** Root directory `server`, build `npm install`, start `npm start`. Set `MONGODB_URI`, `JWT_SECRET` and `CLIENT_ORIGINS` (the Vercel URL).
- **Client → Vercel.** Root directory `client`, framework Vite. Set `VITE_BACK_END_SERVER_URL` (the Render URL). `vercel.json` makes page refreshes work on every route.

Testing PR!
