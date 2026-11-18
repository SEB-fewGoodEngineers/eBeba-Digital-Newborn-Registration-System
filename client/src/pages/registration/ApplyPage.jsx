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
import {
  createRegistration,
  getRegistrationByBaby,
  updateRegistration,
  resubmitRegistration,
  downloadCertificate,
} from "../../services/registrationService";
import StatusBadge from "../../components/StatusBadge/StatusBadge";
import StatusTimeline from "../../components/StatusTimeline/StatusTimeline";

export default function ApplyPage() {
  const [babies, setBabies] = useState([]);
  const [babiesStatus, setBabiesStatus] = useState("loading");
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

  const [created, setCreated] = useState(null);
  const [existing, setExisting] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const [editError, setEditError] = useState("");
  const [editFieldErrors, setEditFieldErrors] = useState({});
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState("");

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

  // Load the existing application for the selected baby.
  // Reset of "existing"/"isEditing" lives in handleChange, not here.
  useEffect(() => {
    if (!form.babyId) return;

    let ignore = false;
    getRegistrationByBaby(form.babyId)
      .then((reg) => {
        if (ignore) return;
        setExisting(reg);
        if (reg && reg.status === "returned") {
          setEditForm({
            proposedFirstName: reg.proposedFirstName,
            proposedLastName: reg.proposedLastName,
            residentialAddress: reg.residentialAddress,
            municipality: reg.municipality,
          });
        }
      })
      .catch(() => {
        if (ignore) return;
        setExisting(null);
      });
    return () => {
      ignore = true;
    };
  }, [form.babyId]);

  const handleChange = (evt) => {
    setError("");
    setFieldErrors({});
    setForm({ ...form, [evt.target.name]: evt.target.value });

    if (evt.target.name === "babyId") {
      setExisting(null);
      setIsEditing(false);
      setEditForm(null);
      setEditError("");
      setEditFieldErrors({});
    }
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
        Object.fromEntries(
          (err.details || []).map((d) => [d.field, d.message]),
        ),
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditChange = (evt) => {
    setEditError("");
    setEditFieldErrors({});
    setEditForm({ ...editForm, [evt.target.name]: evt.target.value });
  };

  const handleSaveEdit = async (evt) => {
    evt.preventDefault();
    setIsSavingEdit(true);
    setEditError("");
    setEditFieldErrors({});
    try {
      const updated = await updateRegistration(existing._id, editForm);
      setExisting(updated);
      setIsEditing(false);
    } catch (err) {
      setEditError(err.message);
      setEditFieldErrors(
        Object.fromEntries(
          (err.details || []).map((d) => [d.field, d.message]),
        ),
      );
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleResubmit = async () => {
    setIsSavingEdit(true);
    setEditError("");
    try {
      await resubmitRegistration(existing._id);
      setExisting({ ...existing, status: "pending", reviewerNotes: undefined });
      setIsEditing(false);
    } catch (err) {
      setEditError(err.message);
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDownloadCertificate = async (certificateId) => {
    setDownloadError("");
    setDownloading(true);
    try {
      await downloadCertificate(certificateId);
    } catch (err) {
      setDownloadError(err.message);
    } finally {
      setDownloading(false);
    }
  };

  if (created || existing) {
    const reg = created || existing;
    return (
      <Box sx={{ maxWidth: 640, mx: "auto", mt: 4, px: 2 }}>
        <Paper sx={{ p: 4 }}>
          <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
            <Typography variant="h5" component="h1">
              My application
            </Typography>
            <StatusBadge status={reg.status} />
          </Stack>

          {reg.status === "returned" && reg.reviewerNotes && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Note from the officer
              </Typography>
              <Typography variant="body2">{reg.reviewerNotes}</Typography>
            </Alert>
          )}

          {reg.status === "rejected" && reg.reviewerNotes && (
            <Alert severity="error" sx={{ mb: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Reason for rejection (final)
              </Typography>
              <Typography variant="body2">{reg.reviewerNotes}</Typography>
            </Alert>
          )}

          <Box sx={{ my: 2 }}>
            <Typography variant="h6" gutterBottom>
              History
            </Typography>
            <StatusTimeline history={reg.statusHistory} />
          </Box>

          {reg.certificate?.pdfGenerated && (
            <Box sx={{ mt: 2 }}>
              <Button
                variant="contained"
                onClick={() => handleDownloadCertificate(reg.certificate.id)}
                disabled={downloading}
                type="button"
              >
                {downloading ? "Preparing…" : "Download certificate (PDF)"}
              </Button>
              <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                This is a DEMO certificate. The digital signature proves the
                file has not been altered since it was signed by the eBeba demo
                system. It is not a qualified electronic signature under
                Montenegrin law and has no legal effect.
              </Typography>
              {downloadError && (
                <Alert severity="error" sx={{ mt: 1 }}>
                  {downloadError}
                </Alert>
              )}
            </Box>
          )}

          {!isEditing ? (
            <Stack spacing={1}>
              <Typography>
                Baby: {reg.proposedFirstName} {reg.proposedLastName}
              </Typography>
              <Typography>Address: {reg.residentialAddress}</Typography>
              <Typography>Municipality: {reg.municipality}</Typography>

              {reg.status === "returned" && (
                <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                  <Button
                    variant="outlined"
                    onClick={() => setIsEditing(true)}
                    type="button"
                  >
                    Edit
                  </Button>
                  <Button
                    variant="contained"
                    color="warning"
                    onClick={handleResubmit}
                    disabled={isSavingEdit}
                    type="button"
                  >
                    {isSavingEdit ? "Resubmitting…" : "Resubmit"}
                  </Button>
                </Stack>
              )}
            </Stack>
          ) : (
            <Box component="form" onSubmit={handleSaveEdit} noValidate>
              <Stack spacing={2}>
                {editError && <Alert severity="error">{editError}</Alert>}
                <TextField
                  label="First name"
                  name="proposedFirstName"
                  value={editForm.proposedFirstName}
                  onChange={handleEditChange}
                  error={Boolean(editFieldErrors.proposedFirstName)}
                  helperText={editFieldErrors.proposedFirstName}
                  required
                  fullWidth
                />
                <TextField
                  label="Last name"
                  name="proposedLastName"
                  value={editForm.proposedLastName}
                  onChange={handleEditChange}
                  error={Boolean(editFieldErrors.proposedLastName)}
                  helperText={editFieldErrors.proposedLastName}
                  required
                  fullWidth
                />
                <TextField
                  label="Residential address"
                  name="residentialAddress"
                  value={editForm.residentialAddress}
                  onChange={handleEditChange}
                  error={Boolean(editFieldErrors.residentialAddress)}
                  helperText={editFieldErrors.residentialAddress}
                  required
                  fullWidth
                />
                <TextField
                  label="Municipality"
                  name="municipality"
                  value={editForm.municipality}
                  onChange={handleEditChange}
                  error={Boolean(editFieldErrors.municipality)}
                  helperText={editFieldErrors.municipality}
                  required
                  fullWidth
                />
                <Stack direction="row" spacing={1}>
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={isSavingEdit}
                  >
                    {isSavingEdit ? "Saving…" : "Save"}
                  </Button>
                  <Button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    disabled={isSavingEdit}
                  >
                    Cancel
                  </Button>
                </Stack>
              </Stack>
            </Box>
          )}
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
              helperText={
                fieldErrors.babyId || "Choose one of your linked babies."
              }
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
              <Button type="submit" variant="contained" disabled={isSaving}>
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
