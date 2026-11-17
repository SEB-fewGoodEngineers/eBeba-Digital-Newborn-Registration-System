
import { Link as RouterLink, useNavigate } from "react-router";
import { AppBar, Box, Button, Toolbar, Typography } from "@mui/material";
import { useUser } from "../../contexts/UserContext";
import { ROLE_LABELS, ROLES } from "../../constants/labels";

export default function NavBar() {
  // Fixed from the template: setUser was used in sign-out but never taken from the context
  const { user, signOut } = useUser();
  const navigate = useNavigate();

  const handleSignOut = () => {
    signOut();
    navigate("/");
  };

  return (
    <AppBar position="static">
      <Toolbar sx={{ gap: 1 }}>
        <Typography
          variant="h6"
          component={RouterLink}
          to="/"
          sx={{ color: "inherit", textDecoration: "none", flexGrow: 1 }}
        >
          eBeba
        </Typography>

        {user ? (
          <>
            {user.role === ROLES.MOI_STAFF && (
              <Button color="inherit" component={RouterLink} to="/moi/queue">
                MoI queue
              </Button>
            )}

            <Box
              component="span"
              sx={{ display: { xs: "none", sm: "inline" }, mr: 1 }}
            >
              {user.firstName} · {ROLE_LABELS[user.role]}
            </Box>

            {user.role === ROLES.ADMIN && (
              <>
                <Button
                  color="inherit"
                  component={RouterLink}
                  to="/admin/users"
                >
                  Users
                </Button>

                <Button
                  color="inherit"
                  component={RouterLink}
                  to="/admin/audit-logs"
                >
                  Audit logs
                </Button>
              </>
            )}

            <Button color="inherit" onClick={handleSignOut}>
              Sign out
            </Button>
          </>
        ) : (
          <>
            <Button color="inherit" component={RouterLink} to="/sign-in">
              Sign in
            </Button>
            <Button color="inherit" component={RouterLink} to="/sign-up">
              Sign up
            </Button>
          </>
        )}
      </Toolbar>
    </AppBar>
  );
}
