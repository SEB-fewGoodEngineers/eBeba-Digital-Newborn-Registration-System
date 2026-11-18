
import { Navigate, Route, Routes } from "react-router";
import { Box, CircularProgress } from "@mui/material";

// COMPONENTS
import RequireRole from "./components/RequireRole/RequireRole";
import NavBar from "./components/NavBar/NavBar";

// PAGES
import LandingPage from "./pages/home/LandingPage";
import HomePage from "./pages/home/HomePage";
import NotFoundPage from "./pages/home/NotFoundPage";
import SignInPage from "./pages/auth/SignInPage";
import SignUpPage from "./pages/auth/SignUpPage";
import CarePage from "./pages/care/CarePage";
import HospitalBirthListPage from "./pages/hospital/HospitalBirthListPage";
import RecordBirthPage from "./pages/hospital/RecordBirthPage";
import CswCasesPage from "./pages/csw/CswCasesPage";
import ApplyPage from "./pages/registration/ApplyPage";
import QueuePage from "./pages/moi/QueuePage";
import MedicalRecordsPage from "./pages/health/MedicalRecordsPage";
import DashboardPage from "./pages/dashboard/DashboardPage";
import ReviewPage from "./pages/moi/ReviewPage";

// STORY 1.2 - LINK MY BABY
import LinkBabyPage from "./pages/registration/LinkBabyPage";
import MyBabiesPage from "./pages/registration/MyBabiesPage";

// A3 - ADMIN: CREATE STAFF USERS
import AdminUsersPage from "./pages/admin/AdminUsersPage";

// A4 - ADMIN: READ AUDIT LOGS
import AdminAuditLogPage from "./pages/admin/AdminAuditLogPage";

// CONTEXT AND CONSTANTS
import { ROLES } from "./constants/labels";
import { useUser } from "./contexts/UserContext";

export default function App() {
  const { user, isLoading } = useUser();

  // Wait until we know whether the saved token is still valid
  if (isLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 10 }}>
        <CircularProgress aria-label="Loading" />
      </Box>
    );
  }

  return (
    <>
      <NavBar />
      <Box component="main">
        <Routes>
          <Route path="/" element={user ? <HomePage /> : <LandingPage />} />

          <Route
            path="/sign-in"
            element={user ? <Navigate to="/" replace /> : <SignInPage />}
          />

          <Route
            path="/sign-up"
            element={user ? <Navigate to="/" replace /> : <SignUpPage />}
          />

          <Route
            path="/csw-cases"
            element={
              <RequireRole roles={[ROLES.CSW_STAFF]}>
                <CswCasesPage />
              </RequireRole>
            }
          />

          <Route
            path="/babies/:babyId/care"
            element={
              <RequireRole roles={[ROLES.PARENT]}>
                <CarePage />
              </RequireRole>
            }
          />

          {/* STORY 1.1 - HOSPITAL BIRTH RECORDS */}
          <Route
            path="/hospital/babies"
            element={
              <RequireRole roles={[ROLES.HOSPITAL_STAFF]}>
                <HospitalBirthListPage />
              </RequireRole>
            }
          />

          <Route
            path="/hospital/babies/new"
            element={
              <RequireRole roles={[ROLES.HOSPITAL_STAFF]}>
                <RecordBirthPage />
              </RequireRole>
            }
          />

          {/* STORY 1.4 - CORRECT A BIRTH RECORD */}
          <Route
            path="/hospital/babies/:babyId/edit"
            element={
              <RequireRole roles={[ROLES.HOSPITAL_STAFF]}>
                <RecordBirthPage />
              </RequireRole>
            }
          />

          {/* STORY 1.2 - LINK MY BABY */}
          <Route
            path="/babies/link"
            element={
              <RequireRole roles={[ROLES.PARENT]}>
                <LinkBabyPage />
              </RequireRole>
            }
          />

          <Route
            path="/babies/mine"
            element={
              <RequireRole roles={[ROLES.PARENT]}>
                <MyBabiesPage />
              </RequireRole>
            }
          />

          {/* STORY 4.2 - PARENT DASHBOARD */}
          <Route
            path="/dashboard"
            element={
              <RequireRole roles={[ROLES.PARENT]}>
                <DashboardPage />
              </RequireRole>
            }
          />

          {/* STORY 4.1 - MEDICAL RECORDS */}
          <Route
            path="/babies/:babyId/medical-records"
            element={
              <RequireRole roles={[ROLES.PARENT, ROLES.PEDIATRICIAN]}>
                <MedicalRecordsPage />
              </RequireRole>
            }
          />

          <Route
            path="/registration/apply"
            element={
              <RequireRole roles={[ROLES.PARENT]}>
                <ApplyPage />
              </RequireRole>
            }
          />

          {/* A3 - ADMIN: CREATE STAFF USERS */}
          <Route
            path="/admin/users"
            element={
              <RequireRole roles={[ROLES.ADMIN]}>
                <AdminUsersPage />
              </RequireRole>
            }
          />

          {/* A4 - ADMIN: READ AUDIT LOGS */}
          <Route
            path="/admin/audit-logs"
            element={
              <RequireRole roles={[ROLES.ADMIN]}>
                <AdminAuditLogPage />
              </RequireRole>
            }
          />

          {/* STORY 2.2 - MOI QUEUE */}
          <Route
            path="/moi/queue"
            element={
              <RequireRole roles={[ROLES.MOI_STAFF]}>
                <QueuePage />
              </RequireRole>
            }
          />

          <Route
            path="/moi/review/:registrationId"
            element={
              <RequireRole roles={[ROLES.MOI_STAFF]}>
                <ReviewPage />
              </RequireRole>
            }
          />

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Box>
    </>
  );
}
