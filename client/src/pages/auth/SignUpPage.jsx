import { useState } from "react";
import { useNavigate } from "react-router";
import {
  Alert,
  Box,
  Button,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { signUp } from "../../services/authService";
import { useUser } from "../../contexts/UserContext";

// Public sign-up is for parents and guardians only.
// Staff accounts are created by the administrator.
export default function SignUpPage() {
  const navigate = useNavigate();
  const { setUser } = useUser();
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    passwordConf: "",
  });
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  const { firstName, lastName, email, password, passwordConf } = formData;
  const passwordsMatch = password === passwordConf;
  const isFormInvalid = !(
    firstName &&
    lastName &&
    email &&
    password.length >= 8 &&
    passwordsMatch
  );

  const handleChange = (evt) => {
    setError("");
    setFieldErrors({});
    setFormData({ ...formData, [evt.target.name]: evt.target.value });
  };

  const handleSubmit = async (evt) => {
    evt.preventDefault();
    setIsSaving(true);
    try {
      // passwordConf stays in the browser; the server only needs the password
      const user = await signUp({ firstName, lastName, email, password });
      setUser(user);
      navigate("/", { replace: true });
    } catch (err) {
      setError(err.message);
      // Show the server's message under each field it complained about
      setFieldErrors(
        Object.fromEntries(err.details.map((d) => [d.field, d.message])),
      );
      setIsSaving(false);
    }
  };

  return (
    <Box sx={{ display: "flex", justifyContent: "center", mt: 6, px: 2 }}>
      <Paper sx={{ p: 4, width: "100%", maxWidth: 460 }}>
        <Typography variant="h5" component="h1" gutterBottom>
          Create a parent account
        </Typography>

        <Box component="form" onSubmit={handleSubmit} noValidate>
          <Stack spacing={2}>
            {error && <Alert severity="error">{error}</Alert>}
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                label="First name"
                name="firstName"
                autoComplete="given-name"
                value={firstName}
                onChange={handleChange}
                error={Boolean(fieldErrors.firstName)}
                helperText={fieldErrors.firstName}
                required
                fullWidth
              />
              <TextField
                label="Last name"
                name="lastName"
                autoComplete="family-name"
                value={lastName}
                onChange={handleChange}
                error={Boolean(fieldErrors.lastName)}
                helperText={fieldErrors.lastName}
                required
                fullWidth
              />
            </Stack>
            <TextField
              label="Email"
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={handleChange}
              error={Boolean(fieldErrors.email)}
              helperText={
                fieldErrors.email || "Use the email you gave the hospital."
              }
              required
              fullWidth
            />
            <TextField
              label="Password"
              name="password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={handleChange}
              error={Boolean(fieldErrors.password)}
              helperText={fieldErrors.password || "At least 8 characters."}
              required
              fullWidth
            />
            <TextField
              label="Confirm password"
              name="passwordConf"
              type="password"
              autoComplete="new-password"
              value={passwordConf}
              onChange={handleChange}
              error={Boolean(passwordConf) && !passwordsMatch}
              helperText={
                passwordConf && !passwordsMatch
                  ? "Passwords do not match."
                  : " "
              }
              required
              fullWidth
            />
            <Stack direction="row" spacing={1}>
              <Button
                type="submit"
                variant="contained"
                disabled={isFormInvalid || isSaving}
              >
                {isSaving ? "Creating account…" : "Sign up"}
              </Button>
              <Button type="button" onClick={() => navigate("/")}>
                Cancel
              </Button>
            </Stack>
          </Stack>
        </Box>
      </Paper>
    </Box>
  );
}
