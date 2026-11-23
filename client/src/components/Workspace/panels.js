import { ROLES } from "../../constants/labels";
import ChildCare from "@mui/icons-material/ChildCareOutlined";
import Hospital from "@mui/icons-material/LocalHospitalOutlined";
import Document from "@mui/icons-material/AssignmentOutlined";
import People from "@mui/icons-material/PeopleOutlined";
import Institution from "@mui/icons-material/AccountBalanceOutlined";
import Health from "@mui/icons-material/HealthAndSafetyOutlined";
import History from "@mui/icons-material/History";
import LinkIcon from "@mui/icons-material/Link";

export const panels = {
  [ROLES.PARENT]: {
    label: "Parent",
    links: [
      ["/dashboard", "My baby", ChildCare],
      ["/babies/mine", "My babies", ChildCare],
      ["/babies/link", "Link my baby", LinkIcon],
      ["/registration/apply", "Apply for registration", Document],
    ],
  },
  [ROLES.ADMIN]: {
    label: "Admin",
    links: [
      ["/admin/audit-logs", "Audit logs", History],
      ["/admin/users", "User accounts", People],
    ],
  },
  [ROLES.HOSPITAL_STAFF]: {
    label: "Nurse",
    links: [
      ["/hospital/babies", "Birth records", Document],
      ["/hospital/babies/new", "Record a birth", Hospital],
    ],
  },
  [ROLES.CSW_STAFF]: {
    label: "CSW",
    links: [["/csw-cases", "Social welfare cases", Document]],
  },
  [ROLES.HEALTH_INSURANCE_STAFF]: {
    label: "FZO",
    links: [["/insurance-records", "Insurance records", Health]],
  },
  [ROLES.MOI_STAFF]: {
    label: "MoI",
    links: [["/moi/queue", "Registration review", Institution]],
  },
};
