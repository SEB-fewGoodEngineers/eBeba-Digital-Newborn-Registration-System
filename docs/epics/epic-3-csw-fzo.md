# Epic 3 – CSW and FZO

**Also yours:** the platform services **Documents** and **AI**.

## Your goal

After MoI approves a baby, the Social Work Center (CSW) issues the social card number, and the Health Insurance Fund (FZO) issues the insurance cards and assigns a pediatrician. You also build the PDF documents with QR codes, and the AI pre-check that MoI uses.

## Before you start

- Build your AI file: `npm run ai-context -- 3 --name "Your Name" --level "your level"` (see `AI-PROMPT.md`).
- Your collections: `cswCases`, `insuranceRecords`, `certificates`, `aiSuggestions` (see `docs/ebeba.dbml`).
- The models, the seed data and stubs of your services are already in the starter. The seed data includes approved babies with a CSW case and an insurance record, so you can start before Epic 2 is finished.
- Your folders: `server/controllers/` (cswCases, insuranceRecords, certificates, aiSuggestions), `server/validators/`, `server/services/documents/`, `server/services/ai/`, `client/src/pages/csw/`, `client/src/pages/fzo/`, `client/src/pages/verify/`.

## Who you depend on, and who depends on you

| Who              | What                                                   | By when                                      |
| ---------------- | ------------------------------------------------------ | -------------------------------------------- |
| You need Epic 2  | `approveRegistration()` creates your cases and records | Day 2 midday. Until then, use the seed data. |
| Epic 2 needs you | The pre-check API (AI2)                                | Day 2 end                                    |
| Epic 4 needs you | The certificate download (D1)                          | Day 2 end                                    |

## Recommended order

| Order | Story                                               | Priority        | Hours |
| ----- | --------------------------------------------------- | --------------- | ----- |
| 1     | 3.1 CSW case list                                   | Must            | 2     |
| 2     | 3.2 Process a CSW case                              | Must            | 3     |
| 3     | AI1 The AI service with a mock provider             | Must (platform) | –     |
| 4     | AI2 The pre-check API                               | Must (platform) | –     |
| 5     | D1 Registration certificate PDF and QR verification | Must (platform) | –     |
| 6     | 3.3 FZO record list                                 | Must            | 2     |
| 7     | 3.4 Issue the insurance and cards                   | Must            | 3     |
| 8     | 3.5 Assign a pediatrician                           | Must            | 2     |
| 9     | AI3 Connect the real AI provider                    | Must (platform) | –     |
| 10    | 3.6 Card PDFs for the parent                        | Should          | 3     |

---

## 3.1 CSW case list · Must · 2 h

**As** a CSW officer, **I want** to see the cases sent to my center **so that** I can process them.

**Done when**

- [ ] I see only my center's cases (`cswInstitutionId` = my institution), newest first: baby's name, JMBG with `<DemoBadge />`, status with `<StatusBadge />`.
- [ ] Clicking a case opens it: the baby's civil data and the parents.

**API**

- `GET /csw-cases` and `GET /csw-cases/:caseId` (csw_staff)

---

## 3.2 Process a CSW case · Must · 3 h

**As** a CSW officer, **I want** to process a case **so that** the baby gets a social card number.

**Done when**

- [ ] "Start" moves the case to `in_progress`.
- [ ] "Complete" generates a DEMO social card number and moves the case to `completed`.
- [ ] "Reject" needs a note and moves the case to `rejected`.
- [ ] All changes use `transition()`. The parent is notified each time.
- [ ] Zod tests: reject without a note fails.

**API**

- `POST /csw-cases/:caseId/start`, `/complete`, `/reject` body `{ notes }` (csw_staff)

---

## AI1 The AI service with a mock provider · Must (platform)

**Done when**

- [ ] `ai.suggest(kind, input)` is the only code that talks to an AI provider.
- [ ] The provider is chosen in `.env` (`AI_PROVIDER=mock`). The mock provider returns fixed sample flags, so nobody needs an API key.
- [ ] The answer is checked with a Zod schema. If the answer is invalid, slow (more than 15 seconds) or an error, `ai.suggest` returns `{ available: false }` and does not throw.

---

## AI2 The pre-check API · Must (platform)

**Done when** `POST /registrations/:registrationId/precheck` (moi_staff):

- [ ] Runs the **rule checks** first (no AI): missing fields; proposed last name is not the same as either parent's last name; the applicant's account name is not the same as the mother's or the father's name on the birth record.
- [ ] Sends **only those field values** to `ai.suggest("registration_precheck", ...)`. The AI explains near-misses, for example "Vukovic" and "Vuković".
- [ ] Saves one `aiSuggestions` document with all flags (`source`: `rule` or `ai`, `decision`: `pending`) and `aiAvailable`.
- [ ] `PATCH /ai-suggestions/:suggestionId/flags/:flagId` body `{ decision }` saves `accepted` or `dismissed`, who and when, and writes to the audit log.
- [ ] Flags say what is different. They never say what the law allows.

---

## D1 Registration certificate PDF and QR verification · Must (platform)

**Done when**

- [ ] `GET /babies/:babyId/documents/certificate` (parents of the baby, hospital, MoI) returns a PDF made with `pdfkit` when it is downloaded. It is not stored.
- [ ] The PDF uses the TTF font in `server/assets/fonts`, so č ć š ž đ print correctly.
- [ ] The PDF has a large "DEMO" mark and a QR code that links to `<client URL>/verify/<verificationCode>`.
- [ ] `GET /verify/:code` (public, no login) returns only: valid or not, the document type, and the issue date. **No names and no numbers.**
- [ ] The client page `/verify/:code` shows that answer.

**Notes**

- You need the packages `pdfkit` and `qrcode` (approved in the plan). Add them in this PR.
- The client downloads the PDF with `downloadFile()`.

---

## 3.3 FZO record list · Must · 2 h

Same as 3.1, for FZO staff and `insuranceRecords` (`fundBranchId` = my institution).

**API**

- `GET /insurance-records` and `GET /insurance-records/:recordId` (health_insurance_staff)

---

## 3.4 Issue the insurance and cards · Must · 3 h

**As** a FZO officer, **I want** to issue the insurance and cards **so that** the baby is insured.

**Done when**

- [ ] "Start" moves the record to `in_progress`.
- [ ] I choose which parent's insurance covers the baby (from the baby's linked parents).
- [ ] "Issue cards" generates DEMO policy, health card and insured person card numbers, and moves the record to `card_issued`.
- [ ] The parent is notified.
- [ ] Zod tests: issuing without a parent fails.

**API**

- `POST /insurance-records/:recordId/start` (health_insurance_staff)
- `POST /insurance-records/:recordId/issue` body `{ insuredParentId }` (health_insurance_staff)

---

## 3.5 Assign a pediatrician · Must · 2 h

**As** a FZO officer, **I want** to assign a pediatrician **so that** the baby has a doctor.

**Done when**

- [ ] I choose from a list of active pediatricians.
- [ ] The server saves it to `babies.assignedPediatricianId` (the only place it is stored).
- [ ] The parent is notified. The pediatrician can now see the baby (Epic 4).

**API**

- `GET /insurance-records/pediatricians` (health_insurance_staff)
- `POST /insurance-records/:recordId/pediatrician` body `{ pediatricianId }`

---

## AI3 Connect the real AI provider · Must (platform)

**Done when**

- [ ] The instructor tells you which provider to use.
- [ ] The key is only in the server's `.env`.
- [ ] The prompt tells the AI to answer only in JSON, with one plain-English sentence per flag.
- [ ] The demo case ("Vukovic" vs "Vuković") gives a useful flag.
- [ ] Only synthetic data is sent.

---

## 3.6 Card PDFs for the parent · Should · 3 h

**Done when**

- [ ] The parent can download the social card and the insured person card as PDFs, with a DEMO mark.

**API**

- `GET /babies/:babyId/documents/social-card` and `GET /babies/:babyId/documents/insured-person-card` (parents of the baby)
