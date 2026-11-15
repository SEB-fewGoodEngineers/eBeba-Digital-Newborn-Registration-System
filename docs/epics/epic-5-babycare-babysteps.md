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
| 5     | 5.5 Growth chart             | Could    | –     |
| 6     | 5.6 Diary for another day    | Could    | –     |

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

## 5.5 Growth chart · Could

- A line chart of weight over time. This needs a chart package: ask the instructor first.

## 5.6 Diary for another day · Could

- A date field above the diary list. Changing the date shows that day's entries.
