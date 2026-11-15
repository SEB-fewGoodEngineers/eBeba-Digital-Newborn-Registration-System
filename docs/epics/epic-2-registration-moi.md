# Epic 2 – Registration and MoI

**Also yours:** the platform service **Workflow**.

## Your goal

A parent applies to register their baby. A MoI officer reviews the application next to the hospital's birth record, with help from the AI pre-check, and approves, returns or rejects it. Approval gives the baby a JMBG and starts the work at CSW and FZO.

This is the centre of the project. Your approval step connects Epic 1, Epic 3 and Epic 4.

## Before you start

- Build your AI file: `npm run ai-context -- 2 --name "Your Name" --level "your level"` (see `AI-PROMPT.md`).
- Your collections: `registrations` (and you write to `babies`, `certificates`, `cswCases`, `insuranceRecords` when approving). See `docs/ebeba.dbml`.
- The models, the seed data and a stub of the workflow service are already in the starter. You make them real.
- Your folders: `server/controllers/registrations.js`, `server/validators/registrations.js`, `server/services/workflow/`, `client/src/pages/registration/`, `client/src/pages/moi/`.

## Who you depend on, and who depends on you

| Who                | What                                                                       | By when                                     |
| ------------------ | -------------------------------------------------------------------------- | ------------------------------------------- |
| You need Epic 1    | Linked babies (`GET /babies/mine`)                                         | Day 1 end. Until then, use the seeded baby. |
| You need Epic 3    | The pre-check API (for 2.6)                                                | Day 2 end                                   |
| Epic 3 needs you   | `approveRegistration()` creates their CSW cases and insurance records (W2) | Day 2 midday                                |
| Everyone needs you | `transition()` (W1)                                                        | Day 1 end                                   |

## Recommended order

| Order | Story                                  | Priority        | Hours |
| ----- | -------------------------------------- | --------------- | ----- |
| 1     | W1 `transition()` and the status table | Must (platform) | –     |
| 2     | 2.1 Apply to register my baby          | Must            | 3     |
| 3     | 2.2 MoI queue                          | Must            | 2     |
| 4     | 2.3 Review against the birth record    | Must            | 3     |
| 5     | W2 `approveRegistration()`             | Must (platform) | –     |
| 6     | 2.4 Approve                            | Must            | 2     |
| 7     | 2.5 Return, reject, fix and resubmit   | Must            | 3     |
| 8     | 2.6 AI pre-check panel                 | Must            | 3     |
| 9     | 2.7 Application history                | Should          | 2     |

---

## W1 `transition()` and the status table · Must (platform)

**Done when**

- [ ] `transition(doc, toStatus, user, note)` changes the status only if the change is in the table below. Otherwise it throws an error with status 409.
- [ ] It adds an entry to `statusHistory`: `{ from, to, byUserId, at, note }`.
- [ ] It works for `registrations`, `cswCases` and `insuranceRecords`.
- [ ] `generateNumber(prefix)` returns a unique-looking DEMO number, for example `SC-DEMO-7K3F9`.
- [ ] `generateJmbg(birthDateTime)` returns 13 digits: `DDMMYYY` + region code `99` (`DEMO_JMBG_REGION`) + 3 digits + check digit.
- [ ] Tests in `server/tests/workflow.test.js`: allowed and refused changes; JMBG has 13 digits and starts with the birth date.

| Record           | Allowed changes                                                        |
| ---------------- | ---------------------------------------------------------------------- |
| registrations    | `pending` → `returned`, `approved`, `rejected`; `returned` → `pending` |
| cswCases         | `received` → `in_progress`; `in_progress` → `completed`, `rejected`    |
| insuranceRecords | `received` → `in_progress`; `in_progress` → `card_issued`              |

---

## 2.1 Apply to register my baby · Must · 3 h

**As** a parent, **I want** to apply to register my linked baby **so that** MoI can give my baby a JMBG.

**Done when**

- [ ] I choose one of my babies (from `GET /babies/mine`).
- [ ] The form has: first name, last name, address, municipality.
- [ ] The server checks that I am authorized on the baby, and that no application exists yet (409 if it does).
- [ ] The application is saved with status `pending` and the first `statusHistory` entry.
- [ ] I see my application and its status.
- [ ] Zod tests: a valid application passes; an empty last name fails.

**API**

- `POST /registrations` (parent) body `{ babyId, proposedFirstName, proposedLastName, residentialAddress, municipality }` → 201
- `GET /registrations/:registrationId` (the parent of that baby, or MoI staff)

---

## 2.2 MoI queue · Must · 2 h

**As** a MoI officer, **I want** to see the pending applications **so that** I can work through them in order.

**Done when**

- [ ] I see the `pending` applications, oldest first: baby's proposed name, date of birth, hospital, date applied.
- [ ] Clicking one opens the review page.

**API**

- `GET /registrations?status=pending` (moi_staff)

---

## 2.3 Review against the birth record · Must · 3 h

**As** a MoI officer, **I want** to see the application next to the hospital's birth record **so that** I can check that they match.

**Done when**

- [ ] One page shows two columns: the application (proposed names, address, applicant's account name) and the birth record (birth data, mother, father).
- [ ] Differences are easy to see (for example, the parents' last names next to the proposed last name).

**Notes**

- Load the baby and the applicant with `.populate()` in one request.

---

## W2 `approveRegistration()` · Must (platform)

**Done when** `approveRegistration(registrationId, user)`:

- [ ] Changes the registration to `approved` with `transition()`.
- [ ] Writes to the baby: `jmbg`, `firstName`, `lastName`, `residentialAddress`, `registeredAt`.
- [ ] Creates one certificate (number, JMBG, `verificationCode` = `crypto.randomUUID()`).
- [ ] Creates one CSW case and one insurance record, each sent to the office in the registration's municipality (or the first active one).
- [ ] Notifies the parents (`notify()`) and the hospital staff of that hospital.
- [ ] Writes to the audit log.
- [ ] **Running it twice never creates duplicates.** Use `findOneAndUpdate` with `upsert: true` and `babyId` as the key, so a second run only finishes what is missing.

---

## 2.4 Approve · Must · 2 h

**As** a MoI officer, **I want** to approve a correct application **so that** the baby gets a JMBG and the other institutions can start.

**Done when**

- [ ] The review page has an "Approve" button that calls `approveRegistration()`.
- [ ] The officer sees the new JMBG with `<DemoBadge />`.
- [ ] The parent sees "Approved" and can download the certificate (Epic 3 builds the PDF).
- [ ] Approving twice does nothing new.

**API**

- `POST /registrations/:registrationId/approve` (moi_staff)

---

## 2.5 Return, reject, fix and resubmit · Must · 3 h

**As** a MoI officer, **I want** to return an application for correction or reject it **so that** the parent knows what to fix.

**Done when**

- [ ] "Return for correction" and "Reject" both need a note (`reviewerNotes`).
- [ ] "Reject" asks "Are you sure? This is final." first (MUI `Dialog`).
- [ ] The parent sees the note. When the status is `returned`, the parent can edit the application and resubmit it. It goes back to `pending`.
- [ ] The server refuses edits when the status is not `returned`.
- [ ] The parent is notified each time.

**API**

- `POST /registrations/:registrationId/return` body `{ reviewerNotes }` (moi_staff)
- `POST /registrations/:registrationId/reject` body `{ reviewerNotes }` (moi_staff)
- `PUT /registrations/:registrationId` body: the application fields (parent, only when `returned`)

---

## 2.6 AI pre-check panel · Must · 3 h

**As** a MoI officer, **I want** an AI pre-check **so that** I notice small differences, such as a missing "ć".

**Done when**

- [ ] On the review page, a "Run pre-check" button calls the pre-check API (built by Epic 3).
- [ ] Each flag shows: the field, the message, and where it came from ("Rule" or "AI").
- [ ] I can mark each flag "Accept" or "Dismiss". The decision is saved.
- [ ] If the AI did not answer, the panel says "AI check unavailable" and still shows the rule flags.
- [ ] The flags never approve or reject anything. The officer does that.

**API (built by Epic 3)**

- `POST /registrations/:registrationId/precheck` (moi_staff) → the `aiSuggestions` document
- `PATCH /ai-suggestions/:suggestionId/flags/:flagId` body `{ decision }` (moi_staff)

**Notes**

- Until Epic 3's API is ready, the AI stub returns fixed sample flags, so you can build the panel.

---

## 2.7 Application history · Should · 2 h

**Done when**

- [ ] The parent and the MoI officer see a timeline from `statusHistory`: date and time, who, the change, the note.

---

## Could

- **AI parent-friendly message:** the AI turns the officer's short note into a clear, polite message. The officer edits it before it is sent. Ask the instructor before you start.
