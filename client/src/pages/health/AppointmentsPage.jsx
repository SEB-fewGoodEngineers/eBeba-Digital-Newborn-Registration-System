import { useEffect, useState } from "react";
import { Link as RouterLink, useParams } from "react-router";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

import StatusBadge from "../../components/StatusBadge/StatusBadge";
import CalendarExportButton from "../../components/CalendarExportButton/CalendarExportButton";
import {
  createAppointment,
  getAppointments,
  updateAppointmentStatus,
} from "../../services/appointmentService";
import { formatDateTime, toIso } from "../../utils/dates";

const UPCOMING = "upcoming";
const COMPLETED = "completed";
const CANCELLED = "cancelled";

const ACTION_TEXT = {
  [COMPLETED]: { title: "Mark as completed", button: "Mark completed" },
  [CANCELLED]: { title: "Cancel this check-up", button: "Cancel check-up" },
};

const createEmptyForm = () => ({
  title: "",
  scheduledAt: "",
  location: "",
  notes: "",
});

// Fields from the server's error details, by field name.
const toFieldErrors = (err) =>
  Object.fromEntries(
    (err.details || []).map((detail) => [detail.field, detail.message]),
  );

// One check-up card, with the actions while it is upcoming.
function AppointmentCard({ appointment, onAction }) {
  return (
    <Card variant="outlined">
      <CardContent>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1}
          sx={{ justifyContent: "space-between", mb: 1 }}
        >
          <Typography variant="h6" component="h3">
            {appointment.title}
          </Typography>
          <Box>
            <StatusBadge status={appointment.status} />
          </Box>
        </Stack>

        <Typography>{formatDateTime(appointment.scheduledAt)}</Typography>
        {appointment.location && (
          <Typography color="text.secondary">{appointment.location}</Typography>
        )}
        {appointment.notes && (
          <Typography variant="body2" sx={{ mt: 1 }}>
            {appointment.notes}
          </Typography>
        )}

        {appointment.status === UPCOMING && (
          <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
            <Button
              type="button"
              size="small"
              variant="outlined"
              onClick={() => onAction(appointment, COMPLETED)}
            >
              Mark completed
            </Button>
            <Button
              type="button"
              size="small"
              color="error"
              onClick={() => onAction(appointment, CANCELLED)}
            >
              Cancel check-up
            </Button>
          </Stack>
        )}
      </CardContent>
    </Card>
  );
}

// STORY 4.4 - APPOINTMENTS (check-ups)
export default function AppointmentsPage() {
  const { babyId } = useParams();

  const [appointments, setAppointments] = useState([]);
  const [status, setStatus] = useState("loading"); // "loading" | "error" | "ready"
  const [error, setError] = useState("");

  const [form, setForm] = useState(createEmptyForm);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  // The status change waiting for confirmation: { appointment, nextStatus }
  const [pending, setPending] = useState(null);
  const [actionError, setActionError] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    let ignore = false; // stops an old request from overwriting new data

    getAppointments(babyId)
      .then((data) => {
        if (!ignore) {
          setAppointments(data);
          setStatus("ready");
        }
      })
      .catch((err) => {
        if (!ignore) {
          setError(err.message);
          setStatus("error");
        }
      });

    return () => {
      ignore = true;
    };
  }, [babyId]);

  const reload = async () => {
    setAppointments(await getAppointments(babyId));
  };

  // The server sends them soonest first.
  const upcoming = appointments.filter((a) => a.status === UPCOMING);
  // Past and closed check-ups: the newest first.
  const closed = appointments.filter((a) => a.status !== UPCOMING).reverse();

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setFormError("");
    setFieldErrors({});
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isSaving) return;

    setIsSaving(true);
    setFormError("");
    setFieldErrors({});

    try {
      await createAppointment(babyId, {
        title: form.title,
        scheduledAt: toIso(form.scheduledAt),
        location: form.location,
        ...(form.notes.trim() ? { notes: form.notes } : {}),
      });
      await reload();
      setForm(createEmptyForm());
    } catch (err) {
      setFormError(err.message);
      setFieldErrors(toFieldErrors(err));
    } finally {
      setIsSaving(false);
    }
  };

  const openAction = (appointment, nextStatus) => {
    setPending({ appointment, nextStatus });
    setActionError("");
  };

  const closeAction = () => {
    if (!isUpdating) setPending(null);
  };

  const confirmAction = async () => {
    if (!pending || isUpdating) return;

    setIsUpdating(true);
    setActionError("");

    try {
      await updateAppointmentStatus(
        babyId,
        pending.appointment._id,
        pending.nextStatus,
      );
      await reload();
      setPending(null);
    } catch (err) {
      setActionError(err.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const formInvalid =
    !form.title.trim() || !form.scheduledAt || !form.location.trim();

  return (
    <Box sx={{ maxWidth: 960, mx: "auto", p: { xs: 2, sm: 3 } }}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={2}
        sx={{ justifyContent: "space-between", mb: 3 }}
      >
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            BabyHealth — Check-ups
          </Typography>
          <Typography color="text.secondary">
            Upcoming and past check-ups. Demo data only.
          </Typography>
        </Box>
        <Stack spacing={1} sx={{ alignItems: { sm: "flex-end" } }}>
          <CalendarExportButton babyId={babyId} />
          <Button
            component={RouterLink}
            to={`/babies/${babyId}/medical-records`}
          >
            Medical records
          </Button>
        </Stack>
      </Stack>

      {status === "loading" && <CircularProgress aria-label="Loading" />}

      {status === "error" && <Alert severity="error">{error}</Alert>}

      {status === "ready" && (
        <>
          <Typography variant="h5" component="h2" sx={{ mb: 2 }}>
            Upcoming
          </Typography>

          {upcoming.length === 0 ? (
            <Alert severity="info" sx={{ mb: 4 }}>
              No upcoming check-ups.
            </Alert>
          ) : (
            <Stack spacing={2} sx={{ mb: 4 }}>
              {upcoming.map((appointment) => (
                <AppointmentCard
                  key={appointment._id}
                  appointment={appointment}
                  onAction={openAction}
                />
              ))}
            </Stack>
          )}

          <Card sx={{ mb: 4 }}>
            <CardContent>
              <Typography variant="h6" component="h2" gutterBottom>
                Add a check-up
              </Typography>

              <Box component="form" onSubmit={handleSubmit} noValidate>
                <Stack spacing={2}>
                  {formError && <Alert severity="error">{formError}</Alert>}

                  <TextField
                    required
                    fullWidth
                    label="Title"
                    name="title"
                    value={form.title}
                    onChange={handleChange}
                    error={Boolean(fieldErrors.title)}
                    helperText={fieldErrors.title}
                    slotProps={{ htmlInput: { maxLength: 100 } }}
                  />

                  <TextField
                    required
                    type="datetime-local"
                    label="Date and time"
                    name="scheduledAt"
                    value={form.scheduledAt}
                    onChange={handleChange}
                    error={Boolean(fieldErrors.scheduledAt)}
                    helperText={fieldErrors.scheduledAt}
                    slotProps={{ inputLabel: { shrink: true } }}
                  />

                  <TextField
                    required
                    fullWidth
                    label="Place"
                    name="location"
                    value={form.location}
                    onChange={handleChange}
                    error={Boolean(fieldErrors.location)}
                    helperText={fieldErrors.location}
                    slotProps={{ htmlInput: { maxLength: 200 } }}
                  />

                  <TextField
                    fullWidth
                    multiline
                    minRows={2}
                    label="Notes"
                    name="notes"
                    value={form.notes}
                    onChange={handleChange}
                    error={Boolean(fieldErrors.notes)}
                    helperText={fieldErrors.notes}
                    slotProps={{ htmlInput: { maxLength: 500 } }}
                  />

                  <Box>
                    <Button
                      variant="contained"
                      type="submit"
                      disabled={formInvalid || isSaving}
                    >
                      {isSaving ? "Saving..." : "Add check-up"}
                    </Button>
                  </Box>
                </Stack>
              </Box>
            </CardContent>
          </Card>

          <Typography variant="h5" component="h2" sx={{ mb: 2 }}>
            Past and closed
          </Typography>

          {closed.length === 0 ? (
            <Typography color="text.secondary">
              No completed or cancelled check-ups yet.
            </Typography>
          ) : (
            <Stack spacing={2}>
              {closed.map((appointment) => (
                <AppointmentCard
                  key={appointment._id}
                  appointment={appointment}
                  onAction={openAction}
                />
              ))}
            </Stack>
          )}
        </>
      )}

      <Dialog open={Boolean(pending)} onClose={closeAction}>
        <DialogTitle>
          {pending && ACTION_TEXT[pending.nextStatus].title}
        </DialogTitle>
        <DialogContent>
          {pending && (
            <DialogContentText>
              {pending.appointment.title},{" "}
              {formatDateTime(pending.appointment.scheduledAt)}. This cannot be
              undone.
            </DialogContentText>
          )}
          {actionError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {actionError}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button type="button" onClick={closeAction} disabled={isUpdating}>
            Back
          </Button>
          <Button
            type="button"
            variant="contained"
            color={pending?.nextStatus === CANCELLED ? "error" : "primary"}
            onClick={confirmAction}
            disabled={isUpdating}
          >
            {isUpdating
              ? "Saving..."
              : pending && ACTION_TEXT[pending.nextStatus].button}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
