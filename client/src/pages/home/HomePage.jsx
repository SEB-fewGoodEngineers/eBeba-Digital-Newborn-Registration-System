
import { Link as RouterLink } from "react-router";
import { Box, Button, Typography } from "@mui/material";
import { useUser } from "../../contexts/UserContext";
import { ROLE_LABELS, ROLES } from "../../constants/labels";

// The signed-in home page. Each epic adds its own links here for its role.
export default function HomePage() {
  const { user } = useUser();

  return (
    <Box sx={{ maxWidth: 960, mx: "auto", mt: 4, px: 2 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Welcome, {user.firstName}
      </Typography>

      <Typography color="text.secondary">
        Signed in as {ROLE_LABELS[user.role]}.
      </Typography>

      {user.role === ROLES.PARENT && (
        <Button
          component={RouterLink}
          to="/dashboard"
          variant="contained"
          sx={{ mt: 3 }}
        >
          Parent Dashboard
        </Button>
      )}
    </Box>
  );
}
