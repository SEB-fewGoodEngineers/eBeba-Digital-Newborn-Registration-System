import { Navigate, Route, Routes } from "react-router";
import { Box, CircularProgress } from "@mui/material";
import NavBar from "./components/NavBar/NavBar";
import LandingPage from "./pages/home/LandingPage";
import HomePage from "./pages/home/HomePage";
import NotFoundPage from "./pages/home/NotFoundPage";
import SignInPage from "./pages/auth/SignInPage";
import SignUpPage from "./pages/auth/SignUpPage";
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

          {/* Epic pages go here, wrapped in RequireRole (components/RequireRole). Example:
          <Route
            path="/babies/:babyId/diary"
            element={<RequireRole roles={[ROLES.PARENT]}><DiaryPage /></RequireRole>}
          /> */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Box>
    </>
  );
}
