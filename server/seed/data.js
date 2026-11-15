// Fictional seed data with FIXED ids, so docs and tests can point to them.
// All people, institutions and numbers are invented. Dates are relative to "now",
// so there are always entries for today and appointments in the future.
const {
  ROLES,
  INSTITUTION_TYPES,
  GENDERS,
  FAMILY_TYPES,
  REGISTRATION_STATUS,
  CSW_CASE_STATUS,
  INSURANCE_STATUS,
  ENTRY_SOURCES,
  MEDICAL_RECORD_TYPES,
  APPOINTMENT_STATUS,
  DIARY_CATEGORIES,
  FEEDING_METHODS,
  DIAPER_TYPES,
  MILESTONE_CATEGORIES,
} = require("../constants");
const { DEMO_JMBG_REGION } = require("../services/workflow");

// ---------- ids ----------
// 24 hex characters. The prefix tells you the collection.
const id = (prefix, n) =>
  `${prefix}${String(n).padStart(24 - prefix.length, "0")}`;

const IDS = {
  // institutions
  hospitalLovcen: id("64a0", 1),
  hospitalPrimorje: id("64a0", 2),
  moi: id("64a0", 3),
  cswLovcen: id("64a0", 4),
  cswPrimorje: id("64a0", 5),
  fzoLovcen: id("64a0", 6),
  fzoPrimorje: id("64a0", 7),
  clinicLovcen: id("64a0", 8),
  // users
  admin: id("64c0", 1),
  nurseLovcen: id("64c0", 2),
  nursePrimorje: id("64c0", 3),
  moiOfficer: id("64c0", 4),
  cswLovcenOfficer: id("64c0", 5),
  cswPrimorjeOfficer: id("64c0", 6),
  fzoLovcenOfficer: id("64c0", 7),
  fzoPrimorjeOfficer: id("64c0", 8),
  pediatrician: id("64c0", 9),
  ana: id("64c0", 10),
  jelena: id("64c0", 11),
  nikola: id("64c0", 12),
  milena: id("64c0", 13),
  tamara: id("64c0", 14),
  vesna: id("64c0", 15),
  // babies
  babyPetrovic: id("64b", 1), // 64b000000000000000000001 – registered, full health and care data
  babyMarkovic: id("64b", 2), // application pending (MoI queue)
  babyPopovic: id("64b", 3), // approved; CSW case and FZO record waiting
  babyLukic: id("64b", 4), // birth recorded, legal guardian, not applied
  // registrations
  regPetrovic: id("64d0", 1),
  regMarkovic: id("64d0", 2),
  regPopovic: id("64d0", 3),
};

// ---------- dates ----------
const now = new Date();
const daysAgo = (d, hours = 10) => {
  const date = new Date(now);
  date.setDate(date.getDate() - d);
  date.setHours(hours, 0, 0, 0);
  return date;
};
const daysFromNow = (d, hours = 10) => daysAgo(-d, hours);
const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
// "Today" entries: i hours before now, but never before midnight
const todayAt = (hoursBefore) =>
  new Date(
    Math.max(
      now.getTime() - hoursBefore * 3600 * 1000,
      startOfToday.getTime() + 60 * 1000,
    ),
  );

// Same format as workflow.generateJmbg(), with a fixed serial so the seed is the same every time
const demoJmbg = (date, serial) => {
  const dd = String(date.getUTCDate()).padStart(2, "0");
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const yyy = String(date.getUTCFullYear()).slice(1);
  return `${dd}${mm}${yyy}${DEMO_JMBG_REGION}${String(serial).padStart(3, "0")}0`;
};

const history = (...steps) =>
  steps.map(([from, to, byUserId, at, note]) => ({
    from,
    to,
    byUserId,
    at,
    note,
  }));

// ---------- the data ----------
const buildSeedData = ({ hashedPassword }) => {
  const institution = (_id, name, type, code, municipality) => ({
    _id,
    name,
    type,
    code,
    municipality,
    address: `Demo street 1, ${municipality}`,
    contactEmail: `${code.toLowerCase()}@example.com`,
  });

  const institutions = [
    institution(
      IDS.hospitalLovcen,
      "Porodilište Lovćen (demo)",
      INSTITUTION_TYPES.HOSPITAL,
      "HOSP-PG-01",
      "Podgorica",
    ),
    institution(
      IDS.hospitalPrimorje,
      "Opšta bolnica Primorje (demo)",
      INSTITUTION_TYPES.HOSPITAL,
      "HOSP-BR-01",
      "Bar",
    ),
    institution(
      IDS.moi,
      "MoI demo office Podgorica",
      INSTITUTION_TYPES.MOI,
      "MOI-PG-01",
      "Podgorica",
    ),
    institution(
      IDS.cswLovcen,
      "Centar za socijalni rad Lovćen (demo)",
      INSTITUTION_TYPES.CSW,
      "CSW-PG-01",
      "Podgorica",
    ),
    institution(
      IDS.cswPrimorje,
      "Centar za socijalni rad Primorje (demo)",
      INSTITUTION_TYPES.CSW,
      "CSW-BR-01",
      "Bar",
    ),
    institution(
      IDS.fzoLovcen,
      "FZO filijala Lovćen (demo)",
      INSTITUTION_TYPES.HEALTH_INSURANCE_FUND,
      "FZO-PG-01",
      "Podgorica",
    ),
    institution(
      IDS.fzoPrimorje,
      "FZO filijala Primorje (demo)",
      INSTITUTION_TYPES.HEALTH_INSURANCE_FUND,
      "FZO-BR-01",
      "Bar",
    ),
    institution(
      IDS.clinicLovcen,
      "Dom zdravlja Lovćen (demo)",
      INSTITUTION_TYPES.PEDIATRIC_CLINIC,
      "PED-PG-01",
      "Podgorica",
    ),
  ];

  const user = (_id, firstName, lastName, email, role, institutionId) => ({
    _id,
    firstName,
    lastName,
    email,
    hashedPassword,
    role,
    ...(institutionId && { institutionId }),
  });

  const users = [
    user(IDS.admin, "Admin", "Demo", "admin@example.com", ROLES.ADMIN),
    user(
      IDS.nurseLovcen,
      "Milica",
      "Radović",
      "nurse.lovcen@example.com",
      ROLES.HOSPITAL_STAFF,
      IDS.hospitalLovcen,
    ),
    user(
      IDS.nursePrimorje,
      "Sanja",
      "Perović",
      "nurse.primorje@example.com",
      ROLES.HOSPITAL_STAFF,
      IDS.hospitalPrimorje,
    ),
    user(
      IDS.moiOfficer,
      "Petar",
      "Vujošević",
      "moi.officer@example.com",
      ROLES.MOI_STAFF,
      IDS.moi,
    ),
    user(
      IDS.cswLovcenOfficer,
      "Dragana",
      "Jovanović",
      "csw.lovcen@example.com",
      ROLES.CSW_STAFF,
      IDS.cswLovcen,
    ),
    user(
      IDS.cswPrimorjeOfficer,
      "Vuk",
      "Šćepanović",
      "csw.primorje@example.com",
      ROLES.CSW_STAFF,
      IDS.cswPrimorje,
    ),
    user(
      IDS.fzoLovcenOfficer,
      "Ivan",
      "Bošković",
      "fzo.lovcen@example.com",
      ROLES.HEALTH_INSURANCE_STAFF,
      IDS.fzoLovcen,
    ),
    user(
      IDS.fzoPrimorjeOfficer,
      "Maja",
      "Đurović",
      "fzo.primorje@example.com",
      ROLES.HEALTH_INSURANCE_STAFF,
      IDS.fzoPrimorje,
    ),
    user(
      IDS.pediatrician,
      "Ivana",
      "Kovačević",
      "dr.kovacevic@example.com",
      ROLES.PEDIATRICIAN,
      IDS.clinicLovcen,
    ),
    user(IDS.ana, "Ana", "Vuković", "ana.vukovic@example.com", ROLES.PARENT), // demo: no baby yet
    user(
      IDS.jelena,
      "Jelena",
      "Petrović",
      "jelena.petrovic@example.com",
      ROLES.PARENT,
    ),
    user(
      IDS.nikola,
      "Nikola",
      "Petrović",
      "nikola.petrovic@example.com",
      ROLES.PARENT,
    ),
    user(
      IDS.milena,
      "Milena",
      "Marković",
      "milena.markovic@example.com",
      ROLES.PARENT,
    ),
    user(
      IDS.tamara,
      "Tamara",
      "Popović",
      "tamara.popovic@example.com",
      ROLES.PARENT,
    ),
    user(IDS.vesna, "Vesna", "Lukić", "vesna.lukic@example.com", ROLES.PARENT), // legal guardian
  ];

  const parent = (firstName, lastName, email, extra = {}) => ({
    firstName,
    lastName,
    email,
    dateOfBirth: daysAgo(365 * 30),
    citizenship: "Montenegrin",
    ...extra,
  });

  const birthPetrovic = daysAgo(26, 4);
  const birthMarkovic = daysAgo(5, 14);
  const birthPopovic = daysAgo(12, 22);
  const birthLukic = daysAgo(2, 9);

  const babies = [
    {
      _id: IDS.babyPetrovic,
      birthRecordNumber: "BR-HOSP-PG-01-DEMO01",
      hospitalId: IDS.hospitalLovcen,
      createdByUserId: IDS.nurseLovcen,
      gender: GENDERS.FEMALE,
      birthDateTime: birthPetrovic,
      placeOfBirth: "Porodilište Lovćen (demo)",
      municipalityOfBirth: "Podgorica",
      birthWeightGrams: 3400,
      birthLengthCm: 51,
      familyType: FAMILY_TYPES.TWO_PARENTS,
      mother: parent("Jelena", "Petrović", "jelena.petrovic@example.com", {
        maidenName: "Ivanović",
      }),
      father: parent("Nikola", "Petrović", "nikola.petrovic@example.com"),
      authorizedUserIds: [IDS.jelena, IDS.nikola],
      firstName: "Mia",
      lastName: "Petrović",
      residentialAddress: "Demo street 12, Podgorica",
      jmbg: demoJmbg(birthPetrovic, 1),
      registeredAt: daysAgo(24),
      assignedPediatricianId: IDS.pediatrician,
    },
    {
      _id: IDS.babyMarkovic,
      birthRecordNumber: "BR-HOSP-BR-01-DEMO02",
      hospitalId: IDS.hospitalPrimorje,
      createdByUserId: IDS.nursePrimorje,
      gender: GENDERS.MALE,
      birthDateTime: birthMarkovic,
      placeOfBirth: "Opšta bolnica Primorje (demo)",
      municipalityOfBirth: "Bar",
      birthWeightGrams: 3150,
      birthLengthCm: 50,
      familyType: FAMILY_TYPES.SINGLE_PARENT,
      mother: parent("Milena", "Marković", "milena.markovic@example.com"),
      authorizedUserIds: [IDS.milena],
    },
    {
      _id: IDS.babyPopovic,
      birthRecordNumber: "BR-HOSP-PG-01-DEMO03",
      hospitalId: IDS.hospitalLovcen,
      createdByUserId: IDS.nurseLovcen,
      gender: GENDERS.FEMALE,
      birthDateTime: birthPopovic,
      placeOfBirth: "Porodilište Lovćen (demo)",
      municipalityOfBirth: "Podgorica",
      birthWeightGrams: 2980,
      birthLengthCm: 49,
      familyType: FAMILY_TYPES.UNKNOWN_FATHER,
      mother: parent("Tamara", "Popović", "tamara.popovic@example.com"),
      authorizedUserIds: [IDS.tamara],
      firstName: "Lena",
      lastName: "Popović",
      residentialAddress: "Demo street 5, Podgorica",
      jmbg: demoJmbg(birthPopovic, 2),
      registeredAt: daysAgo(1),
    },
    {
      _id: IDS.babyLukic,
      birthRecordNumber: "BR-HOSP-BR-01-DEMO04",
      hospitalId: IDS.hospitalPrimorje,
      createdByUserId: IDS.nursePrimorje,
      gender: GENDERS.MALE,
      birthDateTime: birthLukic,
      placeOfBirth: "Opšta bolnica Primorje (demo)",
      municipalityOfBirth: "Bar",
      birthWeightGrams: 3600,
      birthLengthCm: 52,
      familyType: FAMILY_TYPES.LEGAL_GUARDIAN,
      mother: parent("Sara", "Lukić", "sara.lukic@example.com"),
      authorizedUserIds: [IDS.vesna],
    },
  ];

  const { PENDING, APPROVED } = REGISTRATION_STATUS;
  const registrations = [
    {
      _id: IDS.regPetrovic,
      babyId: IDS.babyPetrovic,
      submittedByUserId: IDS.jelena,
      proposedFirstName: "Mia",
      proposedLastName: "Petrović",
      residentialAddress: "Demo street 12, Podgorica",
      municipality: "Podgorica",
      status: APPROVED,
      reviewedByUserId: IDS.moiOfficer,
      reviewedAt: daysAgo(24),
      statusHistory: history(
        [undefined, PENDING, IDS.jelena, daysAgo(25), "Submitted"],
        [PENDING, APPROVED, IDS.moiOfficer, daysAgo(24), "Approved"],
      ),
    },
    {
      _id: IDS.regMarkovic,
      babyId: IDS.babyMarkovic,
      submittedByUserId: IDS.milena,
      proposedFirstName: "Stefan",
      proposedLastName: "Markovic", // missing "ć": something for the AI pre-check to find
      residentialAddress: "Demo street 3, Bar",
      municipality: "Bar",
      status: PENDING,
      statusHistory: history([
        undefined,
        PENDING,
        IDS.milena,
        daysAgo(1),
        "Submitted",
      ]),
    },
    {
      _id: IDS.regPopovic,
      babyId: IDS.babyPopovic,
      submittedByUserId: IDS.tamara,
      proposedFirstName: "Lena",
      proposedLastName: "Popović",
      residentialAddress: "Demo street 5, Podgorica",
      municipality: "Podgorica",
      status: APPROVED,
      reviewedByUserId: IDS.moiOfficer,
      reviewedAt: daysAgo(1),
      statusHistory: history(
        [undefined, PENDING, IDS.tamara, daysAgo(3), "Submitted"],
        [PENDING, APPROVED, IDS.moiOfficer, daysAgo(1), "Approved"],
      ),
    },
  ];

  const certificates = [
    {
      babyId: IDS.babyPetrovic,
      registrationId: IDS.regPetrovic,
      certificateNumber: "CERT-DEMO-000001",
      jmbg: babies[0].jmbg,
      verificationCode: "00000000-0000-4000-8000-000000000001",
      issuedByUserId: IDS.moiOfficer,
      issuedAt: daysAgo(24),
    },
    {
      babyId: IDS.babyPopovic,
      registrationId: IDS.regPopovic,
      certificateNumber: "CERT-DEMO-000002",
      jmbg: babies[2].jmbg,
      verificationCode: "00000000-0000-4000-8000-000000000002",
      issuedByUserId: IDS.moiOfficer,
      issuedAt: daysAgo(1),
    },
  ];

  const cswCases = [
    {
      babyId: IDS.babyPetrovic,
      registrationId: IDS.regPetrovic,
      cswInstitutionId: IDS.cswLovcen,
      status: CSW_CASE_STATUS.COMPLETED,
      socialCardNumber: "SC-DEMO-000001",
      processedByUserId: IDS.cswLovcenOfficer,
      completedAt: daysAgo(22),
      statusHistory: history(
        [
          undefined,
          CSW_CASE_STATUS.RECEIVED,
          IDS.moiOfficer,
          daysAgo(24),
          "Opened on approval",
        ],
        [
          CSW_CASE_STATUS.RECEIVED,
          CSW_CASE_STATUS.IN_PROGRESS,
          IDS.cswLovcenOfficer,
          daysAgo(23),
        ],
        [
          CSW_CASE_STATUS.IN_PROGRESS,
          CSW_CASE_STATUS.COMPLETED,
          IDS.cswLovcenOfficer,
          daysAgo(22),
        ],
      ),
    },
    {
      babyId: IDS.babyPopovic,
      registrationId: IDS.regPopovic,
      cswInstitutionId: IDS.cswLovcen,
      status: CSW_CASE_STATUS.RECEIVED,
      statusHistory: history([
        undefined,
        CSW_CASE_STATUS.RECEIVED,
        IDS.moiOfficer,
        daysAgo(1),
        "Opened on approval",
      ]),
    },
  ];

  const insuranceRecords = [
    {
      babyId: IDS.babyPetrovic,
      registrationId: IDS.regPetrovic,
      fundBranchId: IDS.fzoLovcen,
      insuredParentId: IDS.jelena,
      status: INSURANCE_STATUS.CARD_ISSUED,
      policyNumber: "POL-DEMO-000001",
      healthCardNumber: "HC-DEMO-000001",
      insuredPersonCardNumber: "IPC-DEMO-000001",
      cardIssuedAt: daysAgo(21),
      processedByUserId: IDS.fzoLovcenOfficer,
      statusHistory: history(
        [
          undefined,
          INSURANCE_STATUS.RECEIVED,
          IDS.moiOfficer,
          daysAgo(24),
          "Opened on approval",
        ],
        [
          INSURANCE_STATUS.RECEIVED,
          INSURANCE_STATUS.IN_PROGRESS,
          IDS.fzoLovcenOfficer,
          daysAgo(22),
        ],
        [
          INSURANCE_STATUS.IN_PROGRESS,
          INSURANCE_STATUS.CARD_ISSUED,
          IDS.fzoLovcenOfficer,
          daysAgo(21),
        ],
      ),
    },
    {
      babyId: IDS.babyPopovic,
      registrationId: IDS.regPopovic,
      fundBranchId: IDS.fzoLovcen,
      status: INSURANCE_STATUS.RECEIVED,
      statusHistory: history([
        undefined,
        INSURANCE_STATUS.RECEIVED,
        IDS.moiOfficer,
        daysAgo(1),
        "Opened on approval",
      ]),
    },
  ];

  // ----- Petrović baby: health (Epic 4) -----
  const P = IDS.babyPetrovic;
  const medicalRecords = [
    {
      babyId: P,
      recordType: MEDICAL_RECORD_TYPES.EXAMINATION,
      title: "Check-up at 1 week (demo)",
      description: "Baby is feeding well. Weight gain as expected.",
      doctorRecommendations: "Next check-up at 1 month.",
      entrySource: ENTRY_SOURCES.PEDIATRICIAN,
      authorUserId: IDS.pediatrician,
      examinationDate: daysAgo(19),
    },
    {
      babyId: P,
      recordType: MEDICAL_RECORD_TYPES.GENERAL_NOTE,
      title: "No known allergies",
      description: "Nothing noticed so far.",
      entrySource: ENTRY_SOURCES.PARENT,
      authorUserId: IDS.jelena,
      examinationDate: daysAgo(10),
    },
  ];

  const vaccination = (
    vaccineName,
    doseNumber,
    scheduledDate,
    administeredDate,
    byPediatrician,
  ) => ({
    babyId: P,
    vaccineName,
    doseNumber,
    scheduledDate,
    ...(administeredDate && { administeredDate }),
    entrySource: byPediatrician
      ? ENTRY_SOURCES.PEDIATRICIAN
      : ENTRY_SOURCES.PARENT,
    authorUserId: byPediatrician ? IDS.pediatrician : IDS.jelena,
    notes: "Demo schedule, not a real vaccination calendar.",
  });

  const vaccinations = [
    vaccination("Vaccine A (demo)", 1, daysAgo(25), daysAgo(25), true),
    vaccination("Vaccine B (demo)", 1, daysAgo(25), daysAgo(25), true),
    vaccination("Vaccine B (demo)", 2, daysAgo(3), null, false), // overdue
    vaccination("Vaccine C (demo)", 1, daysFromNow(0, 23), null, false), // within 24 h: reminder test
  ];

  const appointments = [
    {
      babyId: P,
      title: "Check-up at 1 week (demo)",
      scheduledAt: daysAgo(19),
      location: "Dom zdravlja Lovćen (demo)",
      status: APPOINTMENT_STATUS.COMPLETED,
      createdByUserId: IDS.jelena,
      reminderSent: true,
    },
    {
      babyId: P,
      title: "Check-up at 1 month (demo)",
      scheduledAt: daysFromNow(3, 9),
      location: "Dom zdravlja Lovćen (demo)",
      status: APPOINTMENT_STATUS.UPCOMING,
      createdByUserId: IDS.jelena,
    },
  ];

  // ----- Petrović baby: care (Epic 5) -----
  const diary = (category, recordedAt, details, notes) => ({
    babyId: P,
    loggedByUserId: IDS.jelena,
    category,
    recordedAt,
    details,
    ...(notes && { notes }),
  });

  const diaryEntries = [
    diary(DIARY_CATEGORIES.FEEDING, todayAt(1), {
      method: FEEDING_METHODS.BOTTLE,
      amountMl: 90,
    }),
    diary(DIARY_CATEGORIES.DIAPER, todayAt(2), {
      diaperType: DIAPER_TYPES.WET,
    }),
    diary(DIARY_CATEGORIES.SLEEP, todayAt(3), { durationMinutes: 120 }),
    diary(DIARY_CATEGORIES.TEMPERATURE, todayAt(4), {
      temperatureCelsius: 36.8,
    }),
    diary(DIARY_CATEGORIES.FEEDING, daysAgo(1, 18), {
      method: FEEDING_METHODS.BREASTFEEDING,
    }),
    diary(
      DIARY_CATEGORIES.ACTIVITY,
      daysAgo(1, 11),
      {},
      "Tummy time, 10 minutes",
    ),
    diary(DIARY_CATEGORIES.SLEEP, daysAgo(2, 14), { durationMinutes: 90 }),
    diary(DIARY_CATEGORIES.DIAPER, daysAgo(2, 9), {
      diaperType: DIAPER_TYPES.BOTH,
    }),
  ];

  const growth = (days, weightGrams, heightCm, headCircumferenceCm) => ({
    babyId: P,
    loggedByUserId: IDS.jelena,
    measuredAt: daysAgo(days),
    weightGrams,
    heightCm,
    headCircumferenceCm,
  });

  const growthMeasurements = [
    growth(26, 3400, 51, 34.5),
    growth(19, 3550, 52, 35),
    growth(12, 3800, 53, 35.5),
    growth(5, 4050, 54, 36),
  ];

  const milestones = [
    {
      babyId: P,
      loggedByUserId: IDS.jelena,
      category: MILESTONE_CATEGORIES.SOCIAL,
      title: "First smile",
      achievedAt: daysAgo(4),
      notes: "Smiled at her dad in the morning.",
    },
  ];

  const notifications = [
    {
      recipientUserId: IDS.jelena,
      babyId: P,
      type: "registration.approved",
      title: "Registration approved",
      message:
        "Your application status in eBeba has changed. Please sign in to see details.",
      link: "/dashboard",
      readAt: daysAgo(24),
    },
    {
      recipientUserId: IDS.jelena,
      babyId: P,
      type: "csw.completed",
      title: "Social card issued",
      message:
        "The Social Work Center has finished your case. Please sign in to see details.",
      link: "/dashboard",
    },
  ];

  return {
    institutions,
    users,
    babies,
    registrations,
    certificates,
    cswCases,
    insuranceRecords,
    medicalRecords,
    vaccinations,
    appointments,
    diaryEntries,
    growthMeasurements,
    milestones,
    notifications,
  };
};

// Who can sign in after seeding (all with the same password)
const LOGINS = [
  ["admin", "admin@example.com"],
  ["hospital_staff (Podgorica)", "nurse.lovcen@example.com"],
  ["hospital_staff (Bar, demo hospital)", "nurse.primorje@example.com"],
  ["moi_staff", "moi.officer@example.com"],
  ["csw_staff (Podgorica)", "csw.lovcen@example.com"],
  ["csw_staff (Bar)", "csw.primorje@example.com"],
  ["health_insurance_staff (Podgorica)", "fzo.lovcen@example.com"],
  ["health_insurance_staff (Bar)", "fzo.primorje@example.com"],
  ["pediatrician", "dr.kovacevic@example.com"],
  ["parent – demo, no baby yet", "ana.vukovic@example.com"],
  ["parent – Petrović baby (registered)", "jelena.petrovic@example.com"],
  ["parent – Petrović baby (registered)", "nikola.petrovic@example.com"],
  ["parent – Marković baby (pending)", "milena.markovic@example.com"],
  ["parent – Popović baby (approved)", "tamara.popovic@example.com"],
  ["legal guardian – Lukić baby (not applied)", "vesna.lukic@example.com"],
];

module.exports = { IDS, LOGINS, buildSeedData };
