
import { Link as RouterLink } from "react-router";
import {
  Box,
  Button,
  Paper,
  Stack,
  Typography,
} from "@mui/material";

import { useUser } from "../../contexts/UserContext";
import { ROLE_LABELS, ROLES } from "../../constants/labels";

export default function HomePage() {
  const { user } = useUser();

  return (
    <Box sx={{ maxWidth: 960, mx: "auto", mt: 4, px: 2 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Welcome, {user.firstName}
      </Typography>

      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Signed in as {ROLE_LABELS[user.role]}.
      </Typography>

      {user.role === ROLES.PARENT && (
        <Paper sx={{ p: 3, borderRadius: 3 }}>
          <Typography variant="h5" gutterBottom>
            Parent Portal
          </Typography>

          <Typography color="text.secondary" sx={{ mb: 3 }}>
            Manage your baby's registration and follow its progress.
          </Typography>

          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={2}
            useFlexGap
            flexWrap="wrap"
          >
            <Button
              component={RouterLink}
              to="/dashboard"
              variant="contained"
            >
              My Dashboard
            </Button>

            <Button
              component={RouterLink}
              to="/babies/mine"
              variant="outlined"
            >
              My Babies
            </Button>

            <Button
              component={RouterLink}
              to="/babies/link"
              variant="outlined"
            >
              Link My Baby
            </Button>

            <Button
              component={RouterLink}
              to="/registration/apply"
              variant="contained"
            >
              Apply for Registration
            </Button>
          </Stack>
        </Paper>
      )}

      {user.role === ROLES.HOSPITAL_STAFF && (
        <Paper sx={{ p: 3, borderRadius: 3 }}>
          <Typography variant="h5" gutterBottom>
            Hospital Portal
          </Typography>

          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={2}
          >
            <Button
              component={RouterLink}
              to="/hospital/babies"
              variant="contained"
            >
              Birth Records
            </Button>

            <Button
              component={RouterLink}
              to="/hospital/babies/new"
              variant="outlined"
            >
              Record a Birth
            </Button>
          </Stack>
        </Paper>
      )}
    </Box>
  );
}
