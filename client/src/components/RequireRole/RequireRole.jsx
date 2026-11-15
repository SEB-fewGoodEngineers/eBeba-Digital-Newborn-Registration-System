import { Navigate, useLocation } from "react-router";
import { Alert, Box, CircularProgress } from "@mui/material";
import { useUser } from "../../contexts/UserContext";

// Wrap a page: <RequireRole roles={[ROLES.PARENT]}><DiaryPage /></RequireRole>
// Leave out "roles" to allow any signed-in user.
// This is for convenience only: the server checks access on every request.
export default function RequireRole({ roles, children }) {
  const { user, isLoading } = useUser();
  const location = useLocation();

  if (isLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 6 }}>
        <CircularProgress aria-label="Loading" />
      </Box>
    );
  }

  if (!user) {
    // After signing in, the user comes back to this page
    return (
      <Navigate to="/sign-in" replace state={{ from: location.pathname }} />
    );
  }

  if (roles && !roles.includes(user.role)) {
    return (
      <Alert severity="error" sx={{ m: 3 }}>
        You do not have permission to see this page.
      </Alert>
    );
  }

  return children;
}
