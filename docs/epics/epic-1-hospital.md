# Epic 1 – Hospital and birth records

**Also yours:** the platform service **Auth, access and audit**.

## Your goal

Hospital staff record a birth. A parent links their account to that birth record. Everyone else in the team builds on top of the birth record, so your first stories come first in the whole project.

You also own access control and the audit log: the rules that decide who can see which baby, and the record of who did what.

## Before you start

- Build your AI file: `npm run ai-context -- 1 --name "Your Name" --level "your level"` (see `AI-PROMPT.md`).
- Your collections: `babies`, `institutions`, `users`, `auditLogs` (see `docs/ebeba.dbml`).
- The models, the seed data and a simple version (stub) of your shared functions are already in the starter. You make them real.
- Your folders: `server/controllers/babies.js`, `server/controllers/admin.js`, `server/validators/`, `server/services/audit/`, `client/src/pages/hospital/`, `client/src/pages/admin/`.

## Who depends on you

| Who      | Needs                                         | By when      |
| -------- | --------------------------------------------- | ------------ |
| Epic 2   | Birth records and linked parents (1.1, 1.2)   | Day 1 end    |
| Everyone | `requireBabyAccess` for all roles (A1)        | Day 2 midday |
| Everyone | `audit.log()` that saves to the database (A2) | Day 2        |

## Recommended order

| Order | Story                                    | Priority        | Hours |
| ----- | ---------------------------------------- | --------------- | ----- |
| 1     | 1.1 Record a birth                       | Must            | 5     |
| 2     | 1.2 Link my account to my baby           | Must            | 3     |
| 3     | A1 Access check for every role           | Must (platform) | –     |
| 4     | A2 Real audit log                        | Must (platform) | –     |
| 5     | 1.3 Status and JMBG in the hospital list | Must            | 2     |
| 6     | A3 Admin: create staff users             | Must (platform) | –     |
| 7     | A4 Admin: read the audit log             | Must (platform) | –     |
| 8     | 1.4 Correct a birth record               | Should          | 2     |
| 9     | 1.5 Search the hospital list             | Should          | 2     |

---

## 1.1 Record a birth · Must · 5 h

**As** hospital staff, **I want** to record a birth **so that** it appears in my hospital's birth list and the parents can apply.

**Done when**

- [ ] The form has every birth field: gender, date and time of birth, place, municipality, weight (g), length (cm), family type.
- [ ] The form has the mother's details (email required). The father's details show only when the family type is `two_parents` or `legal_guardian`.
- [ ] The server sets `hospitalId` from my account (`req.user.institutionId`), never from the form.
- [ ] The server creates a unique birth record number, for example `BR-HOSP-PG-01-7K3F9`. The screen shows it after saving.
- [ ] My list shows only my hospital's births, newest first.
- [ ] Zod tests: a valid birth passes; a missing mother email fails.

**API**

- `POST /babies` (hospital_staff) → 201 with the new baby
- `GET /babies` (hospital_staff) → my hospital's babies, newest first

**Notes**

- Date and time: the browser sends `toIso(value)` (see CONVENTIONS.md, section 6).
- Make the birth record number with `generateNumber("BR-" + hospitalCode)` from the workflow service (it exists as a stub).
- Mount the controller in `app.js`: `app.use("/babies", require("./controllers/babies"))`.
- **Important:** other epics also use URLs that start with `/babies/:babyId/...`. In `babies.js`, put the middleware on each route (`router.post("/", verifyToken, requireRole(...), ...)`), **not** with `router.use(...)`. A `router.use(requireRole(ROLES.HOSPITAL_STAFF))` would block parents on every other epic's `/babies/...` pages.

---

## 1.2 Link my account to my baby · Must · 3 h

**As** a parent, **I want** to link my account to my baby's birth record **so that** I can apply and follow everything.

**Done when**

- [ ] I type the birth record number on a "Link my baby" page.
- [ ] The server links me only if my login email equals the mother's or the father's email on that record. It adds my user id to `authorizedUserIds`.
- [ ] A wrong number or a wrong email gives the same message: "We could not find a birth record for your account."
- [ ] Linking twice changes nothing (use `$addToSet`).
- [ ] After linking, I see my babies with their birth data (read-only).

**API**

- `POST /babies/link` (parent) body `{ birthRecordNumber }` → 200 with the baby
- `GET /babies/mine` (parent) → babies where I am in `authorizedUserIds`
- `GET /babies/:babyId` (any role with access, uses `requireBabyAccess`) → one baby

**Notes**

- The same error for "not found" and "wrong email" stops people from guessing record numbers.
- In `babies.js`, put `router.get("/mine", ...)` **before** `router.get("/:babyId", ...)`. Otherwise Express reads "mine" as a baby id.
- Epic 2 uses `GET /babies/mine` to let the parent choose a baby to register.

---

## A1 Access check for every role · Must (platform)

**Done when**

- [ ] `canAccessBaby(user, baby, records)` is a plain function (no database) that returns `true` or `false`:
  - parent: their id is in `baby.authorizedUserIds`
  - pediatrician: `baby.assignedPediatricianId` is their id
  - hospital_staff: `baby.hospitalId` is their institution
  - moi_staff: always (MoI reviews all applications)
  - csw_staff / health_insurance_staff: the baby's CSW case / insurance record belongs to their institution
  - admin: no (the admin manages users, not babies)
- [ ] `requireBabyAccess` loads the baby (and the case or record when needed), calls `canAccessBaby`, and responds 404 if the baby does not exist, 403 if access is refused. It puts the baby on `req.baby`.
- [ ] Tests in `server/tests/access.test.js`: one "yes" and one "no" for each role.

---

## A2 Real audit log · Must (platform)

**Done when**

- [ ] `audit.log({ actor, action, targetCollection, targetDocumentId, changes })` saves an `auditLogs` document.
- [ ] If saving the log fails, the user's action still works; the error is written to the server log.
- [ ] There is no route that changes or deletes audit entries.

---

## 1.3 Status and JMBG in the hospital list · Must · 2 h

**As** hospital staff, **I want** to see each baby's registration status and JMBG **so that** I can finish the hospital records.

**Done when**

- [ ] The hospital list shows the registration status with `<StatusBadge />` ("Not applied" when there is no registration).
- [ ] Once approved, the list shows the JMBG with `<DemoBadge />`.

**Notes**

- Load the registrations for the listed babies in one query (`Registration.find({ babyId: { $in: ids } })`), not one query per baby.

---

## A3 Admin: create staff users · Must (platform)

**Done when**

- [ ] The admin sees a list of all users (name, email, role, institution, active).
- [ ] The admin creates a staff user: name, email, temporary password, role, institution.
- [ ] The server checks that the institution type matches the role (`ROLE_INSTITUTION_TYPE` in constants).
- [ ] The admin can deactivate and reactivate a user, but not themselves.
- [ ] Every change is in the audit log.

**API**

- `GET /admin/users`, `POST /admin/users`, `PATCH /admin/users/:userId` body `{ isActive }`
- `GET /admin/institutions` (for the form's dropdown)
- All with `requireRole(ROLES.ADMIN)`.

---

## A4 Admin: read the audit log · Must (platform)

**Done when**

- [ ] The admin sees the newest 100 audit entries: time, person, role, action, collection.
- [ ] The admin can filter by action.

**API**

- `GET /admin/audit-logs?action=...` (admin)

---

## 1.4 Correct a birth record · Should · 2 h

**As** hospital staff, **I want** to correct a birth record **so that** mistakes are fixed before the parents apply.

**Done when**

- [ ] I can edit a birth record from my hospital.
- [ ] Once the parent has submitted an application, the server refuses the change (409: "The parents have already applied.").
- [ ] The change is in the audit log with before and after values.

**API**

- `PATCH /babies/:babyId` (hospital_staff)

---

## 1.5 Search the hospital list · Should · 2 h

**Done when**

- [ ] I can search my list by the mother's last name or the birth record number.
- [ ] The search is not case-sensitive.

**API**

- `GET /babies?search=...` (hospital_staff)

**Notes**

- Escape the search text before you put it in a regular expression.
