# Epic 5 – BabyCare and BabySteps

## Your goal

Parents write a daily diary for their baby (feeding, sleep, diapers, temperature) and track growth (weight and height) and milestones (first smile, first steps).

Your stories are independent: nobody waits for you, and you wait for nobody. Every story follows the same pattern: **a form to add something, and a list to see it**. When the first one works, the others are the same with different fields.

## Before you start

- Build your AI file: `npm run ai-context -- 5 --name "Your Name" --level "your level"` (see `AI-PROMPT.md`).
- Your collections: `diaryEntries`, `growthMeasurements`, `milestones` (see `docs/ebeba.dbml`).
- The models are already in the starter. You do not need to write them.
- Use the seeded **Petrović** baby to test. Sign in as `jelena.petrovic@example.com` (the password is printed when you run the seed). The baby's id is `64b000000000000000000001`, so your page is:
  `http://localhost:5173/babies/64b000000000000000000001/care`
- Your folders: `server/controllers/` (diaryEntries, growthMeasurements, milestones), `server/validators/`, `server/tests/`, `client/src/services/careService.js`, `client/src/pages/care/`.

## Recommended order

| Order | Story                        | Priority | Hours |
| ----- | ---------------------------- | -------- | ----- |
| 1     | 5.1 Log a diary entry        | Must     | 4     |
| 2     | 5.2 Record weight and height | Must     | 3     |
| 3     | 5.3 Delete a diary entry     | Should   | 1     |
| 4     | 5.4 Record milestones        | Should   | 2     |
| 5     | 5.6 Diary for another day    | Could    | 1     |
| 6     | 5.5 Growth chart             | Could    | 2     |
| 7     | 5.7 Weekly diary summary     | Could    | 3     |

The Could stories are in a different order from their numbers: 5.6 is the smallest and needs nothing new, so it comes first.

---

## 5.1 Log a diary entry · Must · 4 h

**As** a parent, **I want** to log what my baby did today **so that** I remember it and can tell the pediatrician.

**Done when**

- [ ] The page `/babies/:babyId/care` has a "Diary" part with a form and today's list.
- [ ] The form has a category: feeding, sleep, diaper, temperature, activity. It shows only the fields for that category:

  | Category    | Fields                                              |
  | ----------- | --------------------------------------------------- |
  | feeding     | method (breastfeeding, bottle, solid), amount in ml |
  | sleep       | minutes                                             |
  | diaper      | wet, dirty, both                                    |
  | temperature | °C                                                  |
  | activity    | notes only                                          |

- [ ] Every entry has a time (default: now) and optional notes.
- [ ] The server sets `babyId` from the URL and `loggedByUserId` from my login, never from the form.
- [ ] Today's list shows the newest first, with the time and the details.
- [ ] The page shows loading, error and "No diary entries yet".
- [ ] Zod tests: a valid feeding entry passes; an unknown category fails; a temperature of 60 °C fails.

**API**

- `POST /babies/:babyId/diary-entries` (parent) → 201
- `GET /babies/:babyId/diary-entries?from=...&to=...` (parent) → entries between `from` and `to`, newest first

**Notes**

- In `app.js`: `app.use("/babies/:babyId/diary-entries", require("./controllers/diaryEntries"))`. Use `express.Router({ mergeParams: true })` to read `:babyId`.
- Every route: `verifyToken`, `requireRole(ROLES.PARENT)`, `requireBabyAccess` (see CONVENTIONS.md, section 5).
- "Today" comes from the browser: `todayRange()` in `utils/dates.js` gives `from` and `to`.
- Check `from` and `to` in the server with a small Zod schema for `req.query`.
- Add the route to `App.jsx`, wrapped in `<RequireRole roles={[ROLES.PARENT]}>`.

---

## 5.2 Record weight and height · Must · 3 h

**As** a parent, **I want** to record my baby's weight and height **so that** I can see how my baby grows.

**Done when**

- [ ] The care page has a "Growth" part with a form and a list.
- [ ] The form has: date, weight (g), height (cm), head circumference (cm, optional).
- [ ] The list shows all measurements, newest first.
- [ ] Zod tests: a valid measurement passes; a weight of 0 fails.

**API**

- `POST /babies/:babyId/growth-measurements` (parent) → 201
- `GET /babies/:babyId/growth-measurements` (parent)

**Notes**

- Same pattern as 5.1. Ask your AI to copy your 5.1 code.

---

## 5.3 Delete a diary entry · Should · 1 h

**Done when**

- [ ] Each diary entry I made has a "Delete" button.
- [ ] A dialog asks "Delete this entry?" first (MUI `Dialog`).
- [ ] The server refuses to delete an entry someone else made (403).
- [ ] The delete is in the audit log.

**API**

- `DELETE /babies/:babyId/diary-entries/:entryId` (parent) → 204

---

## 5.4 Record milestones · Should · 2 h

**Done when**

- [ ] The care page has a "Milestones" part with a form and a list.
- [ ] The form has: category (motor, cognitive, social, language), title (for example "First smile"), date, notes.
- [ ] The list shows all milestones, newest first.

**API**

- `POST /babies/:babyId/milestones`, `GET /babies/:babyId/milestones` (parent)

---

## 5.6 Diary for another day · Could · 1 h

**As** a parent, **I want** to see the diary of another day **so that** I can look back at what my baby did.

**Done when**

- [ ] A date field (`<TextField type="date">`) is above the diary list. It starts on today.
- [ ] A date in the future cannot be chosen (`inputProps={{ max: <today> }}`).
- [ ] Changing the date shows that day's entries, newest first.
- [ ] The heading says "Today" for today, and the date for other days (for example "Diary for 16.11.2026", with `formatDate()`).
- [ ] An empty day shows "No diary entries on this day."
- [ ] Adding a new entry still works, and Delete (5.3) still works.

**API**

- No change: `GET /babies/:babyId/diary-entries?from=...&to=...` already takes any day.

**Notes**

- This is a client-only story. Turn the date field's value (`"2026-11-16"`) into a day with `todayRange(new Date("2026-11-16T00:00"))` from `utils/dates.js`. Do **not** use `new Date("2026-11-16")`: that is midnight in UTC, not in Montenegro.
- Test: choose yesterday. You see yesterday's demo entries.

---

## 5.5 Growth chart · Could · 2 h

**As** a parent, **I want** a chart of my baby's weight **so that** I can see the growth at a glance.

**Done when**

- [ ] The "Growth" part of the care page shows a line chart of weight over time, above the list.
- [ ] The x-axis shows the measurement dates (`formatDate()`), the y-axis the weight in grams, with the axis labels "Date" and "Weight (g)".
- [ ] The chart shows only when there are **2 or more** measurements. Otherwise it says "Add at least two measurements to see the chart."
- [ ] A new measurement appears in the chart right after saving.
- [ ] The list stays under the chart (people who can't see the chart can read the numbers there).

**API**

- No change: use `GET /babies/:babyId/growth-measurements`. It returns the newest first, so reverse it for the chart (oldest on the left).

**Notes**

- Package: **`@mui/x-charts`** (version `^9.18.1`, MIT licence). It is made for MUI 9, so it uses our theme. Install it in `client/`: `npm install @mui/x-charts@^9.18.1`, and name it in your PR under "new packages".
- Import: `import { LineChart } from "@mui/x-charts/LineChart";`
- For the dates on the x-axis use `scaleType: "time"` with `Date` objects.
- The chart does not judge whether the growth is normal. It only shows the numbers.

---

## 5.7 Weekly diary summary (AI) · Could · 3 h

**As** a parent, **I want** a short summary of the last 7 days **so that** I can tell the pediatrician about them.

Start this only when 5.5 and 5.6 are merged, and talk to the Epic 3 developer first: you add a small part to their AI service.

**Done when**

- [ ] The care page has a button "Summary of the last 7 days".
- [ ] **Step 1, the server (no AI):** it counts the last 7 days of diary entries:
  - number of feedings, and the total ml
  - total sleep in hours
  - number of diapers
  - lowest and highest temperature
- [ ] **Step 2, the AI:** the server sends **only these numbers** to `ai.suggest("diary_summary", facts)`. The AI writes 3–4 short, plain sentences.
- [ ] The page shows the numbers in a small table, and the AI text under it, labelled "Written by AI".
- [ ] If the AI is not available, the page shows only the numbers and the message "AI summary unavailable".
- [ ] The text gives **no advice** and never says whether something is normal or not. The prompt to the AI says this.
- [ ] The summary is not saved. The request is written to the audit log (`ai.diary_summary`), without the numbers.
- [ ] Tests for the counting function: a week of sample entries gives the right numbers, and a week with no entries gives zeros.

**API**

- `GET /babies/:babyId/diary-summary` (parent) → `{ facts, aiText, aiAvailable }`

**Notes**

- Put the counting in its own small function (for example `services/diarySummary.js`), so it is easy to test without a database.
- With the Epic 3 developer: add `DIARY_SUMMARY: "diary_summary"` to `AI_SUGGESTION_KINDS` in `server/constants/index.js`, and a mock answer for this kind in `server/services/ai`. Until the real provider is connected, the mock text is shown.
- The baby's name is **not** sent to the AI, only the numbers.
