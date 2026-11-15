# eBeba – Code Conventions

These rules keep our code consistent, so anyone in the team can read, fix and extend anyone else's code.

- **Every pull request (PR) is checked against this file.** A PR that breaks a rule is sent back with a comment.
- **Give this file to your AI assistant** together with your story. Ask it to follow these rules.
- If a rule is unclear or blocks you, ask the instructor. Do not invent your own rule.

Words used here: **must** = required. **should** = expected, unless you have a good reason and write it in your PR.

---

## 1. Versions

| What         | Version               | Note                                                                                                                         |
| ------------ | --------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Node         | 22.22.0 or newer      | Check with `node -v`. React Router 8 needs it.                                                                               |
| Express      | 4.x                   | **Not Express 5.** Do not accept Express 5 code from AI.                                                                     |
| Mongoose     | 8.x                   | Not Mongoose 9.                                                                                                              |
| React        | 19.x                  |                                                                                                                              |
| React Router | 8.x                   | Import from `react-router`, **not** `react-router-dom`.                                                                      |
| MUI          | 9.x (`@mui/material`) | AI often writes code for older MUI versions. Tell it "MUI 9" and check [mui.com](https://mui.com) if something doesn't work. |
| Prettier     | 3.x                   | Formats all code. See section 10.                                                                                            |

- The server uses **CommonJS**: `require(...)` and `module.exports`. No `import` on the server.
- The client (Vite) uses `import` / `export`.
- **Do not add a new package** without asking the instructor first. Write the package and the reason in your PR.
- Always commit `package-lock.json`.

---

## 2. Folders

```
server/
  server.js              Starts the app: database, HTTP and Socket.io
  app.js                 Express app: middleware and routes (tests import this)
  constants/index.js     Roles, status values, enums (one place only)
  models/                One Mongoose model per file
  validators/            Zod schemas, one file per resource
  controllers/           One router per resource, with its handlers (like the template's auth.js)
  middleware/            auth.js (verifyToken, requireRole, requireBabyAccess),
                         validate.js, asyncHandler.js, errorHandler.js
  services/
    audit/               audit.log()
    workflow/            transition(), approveRegistration(), generateJmbg(), generateNumber()
    documents/           pdf.certificate(), pdf.card()
    ai/                  ai.suggest() – the only code that talks to the AI provider
    notifications/       notify(), reminder job
  assets/fonts/          TTF font for č ć š ž đ
  seed/                  Seed script and fictional data
  tests/                 Automated tests (*.test.js)

client/src/
  main.jsx               Router, UserProvider, MUI theme
  App.jsx                All routes
  theme.js               The one MUI theme
  contexts/              UserContext.js (the context + useUser()), UserProvider.jsx
  services/
    api.js               api() and downloadFile() – the only place that calls fetch
    socket.js            The one Socket.io connection
    <resource>Service.js One file per resource, e.g. diaryService.js
  constants/labels.js    Readable labels for status values and roles
  utils/dates.js         formatDate(), formatDateTime(), toIso()
  components/            Shared components, one folder each: components/DemoBadge/DemoBadge.jsx
  pages/                 One folder per area, one file per page:
    hospital/            Epic 1
    registration/  moi/  Epic 2
    csw/  fzo/           Epic 3
    dashboard/  health/  pediatrician/   Epic 4
    care/                Epic 5 (BabyCare and BabySteps)
    auth/  admin/  inbox/  verify/       Platform pages
```

- Put your files **only in your epic's folders**, unless your story says otherwise.
- To change a shared file (`app.js`, `App.jsx`, `constants`, `components`, `middleware`, a model you do not own), tell its owner and say so in your PR.

---

## 3. Names

| Thing                       | Style                                         | Example                                                                                   |
| --------------------------- | --------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Variables, functions        | camelCase                                     | `birthRecordNumber`, `createDiaryEntry`                                                   |
| Constants                   | UPPER_SNAKE_CASE                              | `ROLES`, `REGISTRATION_STATUS`                                                            |
| Model files and model names | PascalCase, singular                          | `models/DiaryEntry.js`, `DiaryEntry`                                                      |
| Collections                 | camelCase, plural, **set explicitly**         | `collection: "diaryEntries"`                                                              |
| Other server files          | camelCase, plural resource                    | `controllers/diaryEntries.js`, `validators/diaryEntries.js`, `tests/diaryEntries.test.js` |
| React components and pages  | PascalCase, `.jsx`                            | `DiaryPage.jsx`, `StatusBadge.jsx`                                                        |
| Client service files        | camelCase + `Service`                         | `diaryService.js`                                                                         |
| URLs                        | kebab-case, plural                            | `/babies/:babyId/diary-entries`                                                           |
| Status and enum values      | lowercase snake_case                          | `pending`, `in_progress`, `card_issued`                                                   |
| Field names                 | camelCase, the names in the plan's data model | `proposedFirstName`                                                                       |

- All code, comments, commit messages and UI text are in **English**. Montenegrin names and places in data are fine (Vuković, Podgorica).
- Never type a status or role as a plain string. Use the constant: `REGISTRATION_STATUS.PENDING`, not `"pending"`.

---

## 4. Models (Mongoose)

```js
// server/models/DiaryEntry.js
const mongoose = require("mongoose");
const { DIARY_CATEGORIES } = require("../constants");

const diaryEntrySchema = new mongoose.Schema(
  {
    babyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Baby",
      required: true,
      index: true,
    },
    loggedByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    category: {
      type: String,
      enum: Object.values(DIARY_CATEGORIES),
      required: true,
    },
    recordedAt: { type: Date, required: true },
    notes: { type: String, trim: true, maxlength: 500 },
  },
  { timestamps: true, collection: "diaryEntries" },
);

module.exports = mongoose.model("DiaryEntry", diaryEntrySchema);
```

- **Must** set `{ timestamps: true, collection: "..." }`. Without `collection`, Mongoose names the collection in lowercase (`diaryentries`).
- **Must** use the field names from the plan's data model. To add or rename a field, ask the model's owner first.
- **Unique fields that start empty** (for example `jmbg`): no `default: null`. Leave the field unset. A `null` value breaks the unique index for the second document.
- Enum values come from `constants/index.js`.
- The `User` model keeps the template's `toJSON` rule that removes `hashedPassword`. Never send `hashedPassword` to the client.

---

## 5. Server: routes, controllers, validation

### The order of a route

Every route goes through the same steps, in this order:

`verifyToken` → `requireRole(...)` → `requireBabyAccess` (if the URL has `:babyId`) → `validate(schema)` (if there is a body) → `asyncHandler(controller)`

Like the template, a controller file holds the router **and** its handlers.

```js
// server/controllers/diaryEntries.js
const express = require("express");
const DiaryEntry = require("../models/DiaryEntry");
const {
  verifyToken,
  requireRole,
  requireBabyAccess,
} = require("../middleware/auth");
const validate = require("../middleware/validate");
const asyncHandler = require("../middleware/asyncHandler");
const audit = require("../services/audit");
const { ROLES } = require("../constants");
const { createDiaryEntrySchema } = require("../validators/diaryEntries");

const router = express.Router({ mergeParams: true }); // gives access to :babyId

router.use(verifyToken, requireRole(ROLES.PARENT), requireBabyAccess);

// CREATE A DIARY ENTRY
router.post(
  "/",
  validate(createDiaryEntrySchema),
  asyncHandler(async (req, res) => {
    const entry = await DiaryEntry.create({
      ...req.body, // already checked and cleaned by Zod
      babyId: req.params.babyId, // server fields come LAST, so they always win
      loggedByUserId: req.user._id,
    });
    await audit.log({
      actor: req.user,
      action: "diary_entry.create",
      targetCollection: "diaryEntries",
      targetDocumentId: entry._id,
      changes: { after: entry },
    });
    res.status(201).json(entry);
  }),
);

module.exports = router;

// in app.js:
// app.use("/babies/:babyId/diary-entries", require("./controllers/diaryEntries"));
```

### Rules

- **Must** wrap every `async` handler in `asyncHandler`. Express 4 does **not** catch errors from `async` functions. Without it, an error makes the request hang or crashes the server.
- **Must** check access on the server for every route. Hiding a button in React is not security.
- `verifyToken` loads the user from the database, so `req.user` is a Mongoose document with `role`, `institutionId` and `isActive`. Compare ids with `.equals()`: `baby.hospitalId.equals(req.user.institutionId)`. Do not compare ids with `===`.
- **Must** validate every request body with a Zod schema in `validators/`. `validate()` replaces `req.body` with the clean data, and unknown fields are removed.
- **Must** set owner and status fields on the server, from `req.user` and `req.params`, **never** from `req.body`: `babyId`, `hospitalId`, `submittedByUserId`, `loggedByUserId`, `authorUserId`, `entrySource`, `status`, `jmbg`, `role`.
- **Must** change status only with `workflow.transition(...)`. Never write `doc.status = ...` yourself.
- **Must** call `audit.log(...)` after every create, update or delete.
- **Must** call `notify(...)` when a user should know about a change. Messages never contain a JMBG or medical details.
- `router.use(...)` is only for a router with its own path, like `/babies/:babyId/diary-entries`. The `/babies` router (Epic 1) shares its path with other epics, so it puts middleware on each route instead.
- Keep handlers short. Logic used by more than one controller goes in a service.
- Start each handler with a comment that says what it does, like the template: `// CREATE A DIARY ENTRY`.

### Responses

| Situation                               | Status | Body                                                               |
| --------------------------------------- | ------ | ------------------------------------------------------------------ |
| Read OK                                 | 200    | The object, or an array                                            |
| Created                                 | 201    | The new object                                                     |
| Deleted                                 | 204    | Nothing                                                            |
| Bad input                               | 400    | `{ err, details }`                                                 |
| Not logged in, or token expired         | 401    | `{ err }`                                                          |
| Logged in, no access                    | 403    | `{ err }`                                                          |
| Not found                               | 404    | `{ err }`                                                          |
| Conflict (already exists, wrong status) | 409    | `{ err }`                                                          |
| Server error                            | 500    | `{ err: "Something went wrong" }` – details only in the server log |

- Errors always use the key `err` (like the template), with a message a user can read.
- Never log passwords or tokens.

---

## 6. Dates and times

- The database stores dates as `Date` (UTC). The server on Render runs in UTC; our users are in Montenegro.
- **The browser converts dates before sending.** For a date or date-time input, send `toIso(value)` from `utils/dates.js`.
- For "today" lists, the browser sends `from` and `to` as ISO timestamps for the user's local day. The server does not guess what "today" is.
- Show dates as `dd.mm.yyyy` and times as `HH:mm`, with `formatDate()` / `formatDateTime()`.

---

## 7. Client (React)

### Data and services

- **Must** call the server only through a service file (`diaryService.js`), and services only through `api()` or `downloadFile()` in `services/api.js`. No `fetch` in components. `api()` adds the token, reads `err` from the server, and sends the user to sign-in when the token has expired.
- **Must** download PDFs with `downloadFile()`. A normal link cannot send the login token.
- **Must** show three states on every page that loads data: **loading**, **error** (the server's message) and **empty** ("No diary entries yet").
- Get the logged-in user with `const { user } = useUser();` (from `contexts/UserContext.js`). Protect pages with `<RequireRole roles={[...]}>`. This is for convenience only; the server still checks.
- Use the one shared Socket.io connection from `services/socket.js`. Do not open your own.

```js
// client/src/services/diaryService.js
import { api } from "./api";

export const getDiaryEntries = (babyId, from, to) =>
  api(`/babies/${babyId}/diary-entries?from=${from}&to=${to}`);

export const createDiaryEntry = (babyId, entry) =>
  api(`/babies/${babyId}/diary-entries`, { method: "POST", body: entry });
```

```jsx
// client/src/pages/care/DiaryPage.jsx (the loading pattern)
import { useEffect, useState } from "react";
import { useParams } from "react-router";
import {
  Alert,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  Typography,
} from "@mui/material";
import { getDiaryEntries } from "../../services/diaryService";
import { todayRange } from "../../utils/dates";

export default function DiaryPage() {
  const { babyId } = useParams();
  const [entries, setEntries] = useState([]);
  const [status, setStatus] = useState("loading"); // "loading" | "error" | "ready"
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false; // stops an old request from overwriting new data
    const { from, to } = todayRange();
    getDiaryEntries(babyId, from, to)
      .then((data) => {
        if (!ignore) {
          setEntries(data);
          setStatus("ready");
        }
      })
      .catch((err) => {
        if (!ignore) {
          setError(err.message);
          setStatus("error");
        }
      });
    return () => {
      ignore = true;
    };
  }, [babyId]);

  if (status === "loading") return <CircularProgress aria-label="Loading" />;
  if (status === "error") return <Alert severity="error">{error}</Alert>;
  if (entries.length === 0)
    return <Typography>No diary entries yet.</Typography>;
  return (
    <List>
      {entries.map((e) => (
        <ListItem key={e._id}>
          <ListItemText primary={e.category} secondary={e.notes} />
        </ListItem>
      ))}
    </List>
  );
}
```

### Look and feel (MUI)

- **Must** build the UI with MUI components: `Button`, `TextField`, `Select`, `Table`, `Card`, `Alert`, `Chip`, `CircularProgress`, `Dialog`.
- Style with the `sx` prop and the shared `theme.js`. **No Tailwind**, no new CSS files, no inline `style={{...}}`.
- Use `<TextField type="date">` or `type="datetime-local"` for dates. Do not add MUI date pickers.
- Use the shared components: `<DemoBadge />` next to every JMBG and card number, `<StatusBadge status={...} />` for every status (it shows the label from `constants/labels.js`).

### Forms and accessibility

- Every input has a label. MUI `TextField` with `label="..."` does this for you.
- Use `<Button>` for actions and `<Link>` for navigation. No clickable `<div>` or `<Typography>`.
- Buttons inside a form that do **not** submit it need `type="button"` (for example, Cancel).
- Disable the submit button while saving, so a double click does not save twice.
- Show the server's error message near the form in an `<Alert>`.
- Do not use colour alone to show meaning; add a word or an icon.

---

## 8. Data and privacy

- **Synthetic data only.** Fictional people, obviously fictional numbers. Never real names, JMBGs or case data – also not in tests, screenshots or AI prompts.
- Never commit `.env`. Add new keys to `.env.example` with a fake value.
- Only `services/ai` sends data to the AI provider, and only the fields it needs.
- Public sign-up always creates a `parent`. Staff accounts are created only by the administrator.

---

## 9. Automated tests

We use Node's built-in test runner (`node --test`). No extra package is needed. Run all tests with `npm test` in `server/`.

- **Platform services must have tests** for their main rules: `transition()` refuses a change not in the status table; `generateJmbg()` returns 13 digits; `canAccessBaby()` lets in the right users and refuses the rest.
- **Each story should add tests for its Zod schema**: one valid body passes, and one wrong body fails.
- Tests use plain objects, not the database.
- Check that a test can fail: break the code on purpose, run the test, see it fail, then undo.

```js
// server/tests/diaryEntries.test.js
const { test } = require("node:test");
const assert = require("node:assert");
const { createDiaryEntrySchema } = require("../validators/diaryEntries");

test("accepts a valid feeding entry", () => {
  const result = createDiaryEntrySchema.safeParse({
    category: "feeding",
    recordedAt: "2026-11-16T08:30:00.000Z",
    details: { method: "bottle", amountMl: 120 },
  });
  assert.strictEqual(result.success, true);
});

test("rejects an unknown category", () => {
  const result = createDiaryEntrySchema.safeParse({
    category: "dancing",
    recordedAt: "2026-11-16T08:30:00.000Z",
  });
  assert.strictEqual(result.success, false);
});
```

---

## 10. Formatting and lint

- **Prettier** formats all code with the shared `.prettierrc` in the repo root. Turn on "Format on save" in VS Code (Prettier extension), or run `npm run format`.
- Never mix formatting changes with your story. If Prettier changes a file you did not work on, do not commit that file.
- **Client:** `npm run lint` must show no errors before you open a PR.
- **GitHub checks:** every PR runs "Server tests" and "Client lint" automatically (`.github/workflows/ci.yml`). A PR with a red check cannot be merged. Click **Details** next to the red check to see the error, fix it, and push again.

---

## 11. Git and pull requests

- **Two protected branches.** Only the instructor merges into them:
  - `development` – where all stories are merged. **You work from this branch.**
  - `main` – production (the deployed app). The instructor merges `development` into `main`.
- **Never push to `development` or `main`.**
- **One story = one branch = one PR.** Branch from the latest `development`:
  `epic-<number>/<story>-<short-name>` → `epic-5/5.1-diary-entry`
- Open your PR **into `development`**, not into `main`.
- Commit messages: story number + what you did, in the present tense:
  `5.1: add diary entry form`, `5.1: fix empty list message`
- At the start of each day, and before you open a PR, update your branch: `git pull origin development`, fix any conflicts, and test again.
- Keep PRs small. If a PR is getting big, ask the instructor whether to split it.
- Fill in the PR template.
- Never force-push a branch someone else uses.

---

## 12. Definition of done

A story is done when:

1. Every "Done when" point in the story works.
2. You tested the normal path **and** at least one failure path (for example: another parent's baby returns 403; a missing field returns 400 with a message).
3. `npm test` (server) and `npm run lint` (client) pass on your laptop, **and** the two automatic checks on your PR ("Server tests" and "Client lint") are green.
4. No errors in the browser console or the server terminal.
5. The code follows this file.
6. The PR is approved and merged by the instructor.
7. **You can explain every line in your PR.** The instructor may ask you about any line.

---

## 13. Working with AI

- Follow `AI-PROMPT.md`: start each chat with the file from `npm run ai-context -- <epic>`, then give the AI one story number at a time.
- Start a new chat every day, or after 3–4 stories.
- Read the AI's plan before you say "go".
- Run it. Test it. Break it on purpose to check that errors are handled.
- If the AI suggests a new package, Express 5 code, `react-router-dom`, Tailwind, old MUI code or a different folder layout: **say no** and point it to this file.
- Never paste real personal data, passwords or API keys into an AI chat.
