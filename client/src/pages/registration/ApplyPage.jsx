import { useEffect, useState } from "react";
import { Link as RouterLink } from "react-router";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { api } from "../../services/api";
import { createRegistration } from "../../services/registrationService";
import StatusBadge from "../../components/StatusBadge/StatusBadge";

export default function ApplyPage() {
  const [babies, setBabies] = useState([]);
  const [babiesStatus, setBabiesStatus] = useState("loading"); // loading | error | ready
  const [babiesError, setBabiesError] = useState("");

  const [form, setForm] = useState({
    babyId: "",
    proposedFirstName: "",
    proposedLastName: "",
    residentialAddress: "",
    municipality: "",
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [created, setCreated] = useState(null); // the registration we just made

  // Load my linked babies (Epic 1 endpoint). Only used to fill the dropdown.
  useEffect(() => {
    let ignore = false;
    api("/babies/mine")
      .then((data) => {
        if (ignore) return;
        setBabies(data);
        setBabiesStatus("ready");
      })
      .catch((err) => {
        if (ignore) return;
        setBabiesError(err.message);
        setBabiesStatus("error");
      });
    return () => {
      ignore = true;
    };
  }, []);

  const handleChange = (evt) => {
    setError("");
    setFieldErrors({});
    setForm({ ...form, [evt.target.name]: evt.target.value });
  };

  const handleSubmit = async (evt) => {
    evt.preventDefault();
    setIsSaving(true);
    try {
      const registration = await createRegistration(form);
      setCreated(registration);
    } catch (err) {
      setError(err.message);
      setFieldErrors(
        Object.fromEntries((err.details || []).map((d) => [d.field, d.message])),
      );
    } finally {
      setIsSaving(false);
    }
  };

  // After a successful apply: show the application and its status.
  if (created) {
    return (
      <Box sx={{ maxWidth: 640, mx: "auto", mt: 4, px: 2 }}>
        <Paper sx={{ p: 4 }}>
          <Typography variant="h5" component="h1" gutterBottom>
            Application sent to MoI
          </Typography>
          <Stack spacing={1}>
            <Typography>
              Baby: {created.proposedFirstName} {created.proposedLastName}
            </Typography>
            <Typography>Address: {created.residentialAddress}</Typography>
            <Typography>Municipality: {created.municipality}</Typography>
            <Box>
              Status: <StatusBadge status={created.status} />
            </Box>
          </Stack>
          <Box sx={{ mt: 3 }}>
            <Button component={RouterLink} to="/" variant="contained">
              Back to home
            </Button>
          </Box>
        </Paper>
      </Box>
    );
  }

  if (babiesStatus === "loading") {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 6 }}>
        <CircularProgress aria-label="Loading" />
      </Box>
    );
  }
  if (babiesStatus === "error") {
    return (
      <Box sx={{ maxWidth: 640, mx: "auto", mt: 4, px: 2 }}>
        <Alert severity="error">{babiesError}</Alert>
      </Box>
    );
  }
  if (babies.length === 0) {
    return (
      <Box sx={{ maxWidth: 640, mx: "auto", mt: 4, px: 2 }}>
        <Alert severity="info">
          No linked babies yet. Link your baby with the birth record number
          first.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 640, mx: "auto", mt: 4, px: 2 }}>
      <Paper sx={{ p: 4 }}>
        <Typography variant="h5" component="h1" gutterBottom>
          Apply to register my baby
        </Typography>

        <Box component="form" onSubmit={handleSubmit} noValidate>
          <Stack spacing={2}>
            {error && <Alert severity="error">{error}</Alert>}

            <TextField
              select
              label="Baby"
              name="babyId"
              value={form.babyId}
              onChange={handleChange}
              error={Boolean(fieldErrors.babyId)}
              helperText={fieldErrors.babyId || "Choose one of your linked babies."}
              required
              fullWidth
            >
              {babies.map((b) => (
                <MenuItem key={b._id} value={b._id}>
                  {b.birthRecordNumber}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              label="First name"
              name="proposedFirstName"
              value={form.proposedFirstName}
              onChange={handleChange}
              error={Boolean(fieldErrors.proposedFirstName)}
              helperText={fieldErrors.proposedFirstName}
              required
              fullWidth
            />
            <TextField
              label="Last name"
              name="proposedLastName"
              value={form.proposedLastName}
              onChange={handleChange}
              error={Boolean(fieldErrors.proposedLastName)}
              helperText={fieldErrors.proposedLastName}
              required
              fullWidth
            />
            <TextField
              label="Residential address"
              name="residentialAddress"
              value={form.residentialAddress}
              onChange={handleChange}
              error={Boolean(fieldErrors.residentialAddress)}
              helperText={fieldErrors.residentialAddress}
              required
              fullWidth
            />
            <TextField
              label="Municipality"
              name="municipality"
              value={form.municipality}
              onChange={handleChange}
              error={Boolean(fieldErrors.municipality)}
              helperText={
                fieldErrors.municipality ||
                "This routes your case to the right CSW and FZO office."
              }
              required
              fullWidth
            />

            <Stack direction="row" spacing={1}>
              <Button
                type="submit"
                variant="contained"
                disabled={isSaving}
              >
                {isSaving ? "Sending…" : "Send application"}
              </Button>
              <Button type="button" component={RouterLink} to="/">
                Cancel
              </Button>
            </Stack>
          </Stack>
        </Box>
      </Paper>
    </Box>
  );
}