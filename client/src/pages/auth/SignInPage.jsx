import { useState } from "react";
import { Link as RouterLink, useLocation, useNavigate } from "react-router";
import {
  Alert,
  Box,
  Button,
  Link,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { signIn } from "../../services/authService";
import { useUser } from "../../contexts/UserContext";

export default function SignInPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setUser } = useUser();
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleChange = (evt) => {
    setError("");
    setFormData({ ...formData, [evt.target.name]: evt.target.value });
  };

  const handleSubmit = async (evt) => {
    evt.preventDefault();
    setIsSaving(true); // stops a double click from sending twice
    try {
      const user = await signIn(formData);
      setUser(user);
      // Go back to the page the user wanted, or home
      navigate(location.state?.from || "/", { replace: true });
    } catch (err) {
      setError(err.message);
      setIsSaving(false);
    }
  };

  return (
    <Box sx={{ display: "flex", justifyContent: "center", mt: 6, px: 2 }}>
      <Paper sx={{ p: 4, width: "100%", maxWidth: 420 }}>
        <Typography variant="h5" component="h1" gutterBottom>
          Sign in
        </Typography>

        <Box component="form" onSubmit={handleSubmit} noValidate>
          <Stack spacing={2}>
            {error && <Alert severity="error">{error}</Alert>}
            <TextField
              label="Email"
              name="email"
              type="email"
              autoComplete="email"
              value={formData.email}
              onChange={handleChange}
              required
              fullWidth
            />
            <TextField
              label="Password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={formData.password}
              onChange={handleChange}
              required
              fullWidth
            />
            <Stack direction="row" spacing={1}>
              <Button type="submit" variant="contained" disabled={isSaving}>
                {isSaving ? "Signing in…" : "Sign in"}
              </Button>
              {/* type="button": in the template, Cancel also submitted the form */}
              <Button type="button" onClick={() => navigate("/")}>
                Cancel
              </Button>
            </Stack>
            <Typography variant="body2">
              No account yet?{" "}
              <Link component={RouterLink} to="/sign-up">
                Sign up
              </Link>
            </Typography>
          </Stack>
        </Box>
      </Paper>
    </Box>
  );
}
