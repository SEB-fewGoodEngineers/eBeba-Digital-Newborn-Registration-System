# Epic 4 – Parent dashboard, BabyHealth and pediatrician

**Also yours:** the platform service **Notifications**.

## Your goal

Parents see everything about their baby in one place: the status at MoI, CSW and FZO, the certificate, the pediatrician, and the baby's health record. Pediatricians add clinical entries. You also build live updates and the Demo inbox.

## Before you start

- Build your AI file: `npm run ai-context -- 4 --name "Your Name" --level "your level"` (see `AI-PROMPT.md`).
- Your collections: `medicalRecords`, `vaccinations`, `appointments`, `notifications`. You read many others for the dashboard. See `docs/ebeba.dbml`.
- The models, the seed data and a stub of `notify()` are already in the starter. The seeded **Petrović** baby is registered and has a pediatrician, vaccinations and appointments, so you can start on day 1.
- Your folders: `server/controllers/` (dashboard, medicalRecords, vaccinations, appointments, notifications, pediatrician), `server/validators/`, `server/services/notifications/`, `client/src/pages/dashboard/`, `client/src/pages/health/`, `client/src/pages/pediatrician/`, `client/src/pages/inbox/`, `client/src/services/socket.js`.

## Who you depend on, and who depends on you

| Who                | What                                         | By when                                                |
| ------------------ | -------------------------------------------- | ------------------------------------------------------ |
| Everyone needs you | `notify()` that saves and sends live (N1)    | Day 1 end                                              |
| Epic 5 needs you   | A link from the dashboard to their care page | Day 2                                                  |
| You need Epic 3    | The certificate download (for 4.2)           | Day 2 end. Until then, show the button without a link. |

## Recommended order

| Order | Story                                            | Priority        | Hours |
| ----- | ------------------------------------------------ | --------------- | ----- |
| 1     | 4.1 Medical records                              | Must            | 3     |
| 2     | N1 `notify()` and live updates                   | Must (platform) | –     |
| 3     | 4.2 Parent dashboard                             | Must            | 4     |
| 4     | N2 Notification list and Demo inbox              | Must (platform) | –     |
| 5     | 4.3 Vaccinations                                 | Must            | 3     |
| 6     | 4.4 Appointments                                 | Must            | 2     |
| 7     | N3 Reminders                                     | Must (platform) | –     |
| 8     | 4.5 Pediatrician: my babies and clinical entries | Should          | 5     |
| 9     | 4.6 Calendar export                              | Should          | 2     |
| 10    | 4.7 Pediatrician sees growth                     | Could           | –     |

---

## 4.1 Medical records · Must · 3 h

**As** a parent, **I want** to add an allergy or an examination note **so that** my baby's health information is in one place.

**Done when**

- [ ] I see my baby's medical records, newest first.
- [ ] I can add one: type (`examination`, `allergy`, `general_note`), title, description, doctor's recommendations, date.
- [ ] The server sets `entrySource` to `parent-entered` and `authorUserId` to me.
- [ ] Each record shows who entered it: "Entered by parent" or "Entered by pediatrician".
- [ ] A parent cannot change a pediatrician's record (403).
- [ ] Zod tests: a valid record passes; a record without a title fails.

**API**

- `GET /babies/:babyId/medical-records`, `POST /babies/:babyId/medical-records` (parent, pediatrician)

---

## N1 `notify()` and live updates · Must (platform)

**Done when**

- [ ] `notify(userId, { type, title, message, link, babyId })` saves a `notifications` document and sends it live with Socket.io to that user.
- [ ] Socket.io runs on the HTTP server in `server.js`. A user joins their own room after the server checks their token.
- [ ] `client/src/services/socket.js` holds the one shared connection. It connects after sign-in and disconnects on sign-out.
- [ ] Messages never contain a JMBG or medical details.

**Notes**

- You need the packages `socket.io` and `socket.io-client` (approved in the plan). Add them in this PR.
- CORS for Socket.io uses the same `CLIENT_ORIGINS` as the API.

---

## 4.2 Parent dashboard · Must · 4 h

**As** a parent, **I want** one dashboard **so that** I see everything about my baby.

**Done when** for each of my babies I see:

- [ ] Birth data, and the JMBG with `<DemoBadge />` once registered.
- [ ] Status at MoI, CSW and FZO with `<StatusBadge />`. When a CSW case or insurance record does not exist yet, it shows "Waiting for MoI" (`waiting_for_moi`).
- [ ] The pediatrician's name, once assigned.
- [ ] A "Download certificate" button once approved (uses `downloadFile()`).
- [ ] Links to BabyHealth and to BabyCare / BabySteps (Epic 5: `/babies/:babyId/care`).
- [ ] The page updates live when a status changes (listen on the shared socket).
- [ ] A parent with no linked baby sees a link to "Link my baby" (Epic 1).

**API**

- `GET /dashboard` (parent) → my babies, each with its registration, CSW case, insurance record and pediatrician

**Notes**

- Load the related records for all babies at once (`$in`), not one query per baby.

---

## N2 Notification list and Demo inbox · Must (platform)

**Done when**

- [ ] A bell in the NavBar shows the number of unread notifications, and a list when clicked.
- [ ] Clicking a notification marks it as read and opens its `link`.
- [ ] The Demo inbox page (`/inbox`) shows each notification as the "email" and the "SMS" it would send.

**API**

- `GET /notifications`, `PATCH /notifications/:notificationId/read` (any signed-in user, only their own)

---

## 4.3 Vaccinations · Must · 3 h

**As** a parent, **I want** to manage my baby's vaccinations **so that** none is forgotten.

**Done when**

- [ ] I see the vaccinations: name, dose, scheduled date, given date.
- [ ] "Overdue" is shown when the scheduled date has passed and there is no given date. It is worked out when shown, not stored.
- [ ] I can add a scheduled vaccination.
- [ ] I can mark my own entries as given.
- [ ] Zod tests: a valid vaccination passes; a missing scheduled date fails.

**API**

- `GET /babies/:babyId/vaccinations`, `POST /babies/:babyId/vaccinations`
- `PATCH /babies/:babyId/vaccinations/:vaccinationId` body `{ administeredDate }`

---

## 4.4 Appointments · Must · 2 h

**Done when**

- [ ] I see upcoming check-ups, soonest first.
- [ ] I can add one: title, date and time, place.
- [ ] I can mark one `completed` or `cancelled`.

**API**

- `GET /babies/:babyId/appointments`, `POST /babies/:babyId/appointments`
- `PATCH /babies/:babyId/appointments/:appointmentId` body `{ status }`

---

## N3 Reminders · Must (platform)

**Done when**

- [ ] A job (`node-cron`) runs once a day. It sends a reminder for every vaccination and appointment in the next 24 hours with `reminderSent: false`, then sets `reminderSent: true`.
- [ ] The admin has a "Run reminders now" button that runs the same job. (A free Render server may be asleep when the job should run.)

**API**

- `POST /admin/run-reminders` (admin)

**Notes**

- You need the package `node-cron` (approved in the plan). Add it in this PR.

---

## 4.5 Pediatrician: my babies and clinical entries · Should · 5 h

**As** a pediatrician, **I want** to see my babies and add clinical entries **so that** parents have correct health information.

**Done when**

- [ ] I see only the babies assigned to me.
- [ ] On a baby, I see the medical records and vaccinations.
- [ ] I can add an examination or a vaccination. The server sets `entrySource` to `pediatrician-entered`.
- [ ] I cannot change a parent's entry (403).
- [ ] The parent is notified.

**API**

- `GET /pediatrician/babies` (pediatrician)
- The same `POST` routes as 4.1 and 4.3, with the pediatrician role.

---

## 4.6 Calendar export · Should · 2 h

**Done when**

- [ ] A button downloads an `.ics` file with the upcoming appointments and scheduled vaccinations.
- [ ] The file opens in Google Calendar and Apple Calendar.

**API**

- `GET /babies/:babyId/calendar.ics` (parent) – download with `downloadFile()`

---

## 4.7 Pediatrician sees growth · Could

- The pediatrician sees the baby's growth measurements (read-only), from Epic 5's `growthMeasurements`.
