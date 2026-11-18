import { useEffect, useState } from "react";
import { Link as RouterLink, useParams } from "react-router";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";

import { useUser } from "../../contexts/UserContext";
import CalendarExportButton from "../../components/CalendarExportButton/CalendarExportButton";
import { ROLES } from "../../constants/labels";
import {
  createVaccination,
  getVaccinations,
  isOverdue,
  markVaccinationGiven,
} from "../../services/vaccinationService";
import { formatDate, toDateInput, toIso } from "../../utils/dates";

const ENTRY_SOURCES = {
  PARENT: "parent-entered",
  PEDIATRICIAN: "pediatrician-entered",
};

const SOURCE_BY_ROLE = {
  [ROLES.PARENT]: ENTRY_SOURCES.PARENT,
  [ROLES.PEDIATRICIAN]: ENTRY_SOURCES.PEDIATRICIAN,
};

const today = () => toDateInput(new Date().toISOString());

const createEmptyForm = () => ({
  vaccineName: "",
  doseNumber: "1",
  scheduledDate: today(),
  notes: "",
});

// Fields from the server's error details, by field name.
const toFieldErrors = (err) =>
  Object.fromEntries(
    (err.details || []).map((detail) => [detail.field, detail.message]),
  );

// A word and a colour: "Given", "Overdue" or "Scheduled".
function VaccinationStatus({ vaccination }) {
  if (vaccination.administeredDate) {
    return <Chip size="small" color="success" label="Given" />;
  }
  if (isOverdue(vaccination)) {
    return <Chip size="small" color="error" label="Overdue" />;
  }
  return <Chip size="small" variant="outlined" label="Scheduled" />;
}

// STORY 4.3 - VACCINATIONS
export default function VaccinationsPage() {
  const { babyId } = useParams();
  const { user } = useUser();

  const [vaccinations, setVaccinations] = useState([]);
  const [status, setStatus] = useState("loading"); // "loading" | "error" | "ready"
  const [error, setError] = useState("");

  const [form, setForm] = useState(createEmptyForm);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  // The vaccination being marked as given (dialog).
  const [givenFor, setGivenFor] = useState(null);
  const [givenDate, setGivenDate] = useState(today);
  const [givenError, setGivenError] = useState("");
  const [isMarking, setIsMarking] = useState(false);

  useEffect(() => {
    let ignore = false; // stops an old request from overwriting new data

    getVaccinations(babyId)
      .then((data) => {
        if (!ignore) {
          setVaccinations(data);
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

  // Only entries that my own role entered can be changed (the server checks too).
  const canMarkGiven = (vaccination) =>
    !vaccination.administeredDate &&
    vaccination.entrySource === SOURCE_BY_ROLE[user?.role];

  const reload = async () => {
    const data = await getVaccinations(babyId);
    setVaccinations(data);
  };

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
      await createVaccination(babyId, {
        vaccineName: form.vaccineName,
        doseNumber: Number(form.doseNumber),
        scheduledDate: toIso(form.scheduledDate),
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

  const openGivenDialog = (vaccination) => {
    setGivenFor(vaccination);
    setGivenDate(today());
    setGivenError("");
  };

  const closeGivenDialog = () => {
    if (!isMarking) setGivenFor(null);
  };

  const handleMarkGiven = async () => {
    if (isMarking || !givenFor) return;

    setIsMarking(true);
    setGivenError("");

    try {
      await markVaccinationGiven(babyId, givenFor._id, toIso(givenDate));
      await reload();
      setGivenFor(null);
    } catch (err) {
      setGivenError(err.message);
    } finally {
      setIsMarking(false);
    }
  };

  const formInvalid =
    !form.vaccineName.trim() || !form.doseNumber || !form.scheduledDate;

  const renderList = () => {
    if (vaccinations.length === 0) {
      return <Alert severity="info">No vaccinations yet.</Alert>;
    }

    return (
      <TableContainer component={Card} variant="outlined">
        <Table size="small" aria-label="Vaccinations">
          <TableHead>
            <TableRow>
              <TableCell>Vaccine</TableCell>
              <TableCell>Dose</TableCell>
              <TableCell>Scheduled</TableCell>
              <TableCell>Given</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Entered by</TableCell>
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {vaccinations.map((vaccination) => (
              <TableRow key={vaccination._id}>
                <TableCell>
                  {vaccination.vaccineName}
                  {vaccination.notes && (
                    <Typography variant="body2" color="text.secondary">
                      {vaccination.notes}
                    </Typography>
                  )}
                </TableCell>
                <TableCell>{vaccination.doseNumber}</TableCell>
                <TableCell>{formatDate(vaccination.scheduledDate)}</TableCell>
                <TableCell>
                  {vaccination.administeredDate
                    ? formatDate(vaccination.administeredDate)
                    : "–"}
                </TableCell>
                <TableCell>
                  <VaccinationStatus vaccination={vaccination} />
                </TableCell>
                <TableCell>
                  {vaccination.entrySource === ENTRY_SOURCES.PEDIATRICIAN
                    ? "Pediatrician"
                    : "Parent"}
                </TableCell>
                <TableCell>
                  {canMarkGiven(vaccination) && (
                    <Button
                      type="button"
                      size="small"
                      onClick={() => openGivenDialog(vaccination)}
                    >
                      Mark as given
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  return (
    <Box sx={{ maxWidth: 960, mx: "auto", p: { xs: 2, sm: 3 } }}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={2}
        sx={{ justifyContent: "space-between", mb: 3 }}
      >
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            BabyHealth — Vaccinations
          </Typography>
          <Typography color="text.secondary">
            Scheduled and given vaccinations. Demo schedule only.
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
          <Card sx={{ mb: 4 }}>
            <CardContent>
              <Typography variant="h6" component="h2" gutterBottom>
                Add a scheduled vaccination
              </Typography>

              <Box component="form" onSubmit={handleSubmit} noValidate>
                <Stack spacing={2}>
                  {formError && <Alert severity="error">{formError}</Alert>}

                  <TextField
                    required
                    fullWidth
                    label="Vaccine name"
                    name="vaccineName"
                    value={form.vaccineName}
                    onChange={handleChange}
                    error={Boolean(fieldErrors.vaccineName)}
                    helperText={fieldErrors.vaccineName}
                    slotProps={{ htmlInput: { maxLength: 100 } }}
                  />

                  <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                    <TextField
                      required
                      type="number"
                      label="Dose"
                      name="doseNumber"
                      value={form.doseNumber}
                      onChange={handleChange}
                      error={Boolean(fieldErrors.doseNumber)}
                      helperText={fieldErrors.doseNumber}
                      slotProps={{ htmlInput: { min: 1, max: 10, step: 1 } }}
                    />

                    <TextField
                      required
                      type="date"
                      label="Scheduled date"
                      name="scheduledDate"
                      value={form.scheduledDate}
                      onChange={handleChange}
                      error={Boolean(fieldErrors.scheduledDate)}
                      helperText={fieldErrors.scheduledDate}
                      slotProps={{ inputLabel: { shrink: true } }}
                    />
                  </Stack>

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
                      {isSaving ? "Saving..." : "Add vaccination"}
                    </Button>
                  </Box>
                </Stack>
              </Box>
            </CardContent>
          </Card>

          <Typography variant="h5" component="h2" sx={{ mb: 2 }}>
            Vaccinations
          </Typography>

          {renderList()}
        </>
      )}

      <Dialog open={Boolean(givenFor)} onClose={closeGivenDialog}>
        <DialogTitle>Mark as given</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {givenFor && (
              <Typography>
                {givenFor.vaccineName}, dose {givenFor.doseNumber}
              </Typography>
            )}
            {givenError && <Alert severity="error">{givenError}</Alert>}
            <TextField
              required
              type="date"
              label="Given date"
              value={givenDate}
              onChange={(event) => setGivenDate(event.target.value)}
              slotProps={{
                inputLabel: { shrink: true },
                htmlInput: { max: today() },
              }}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button type="button" onClick={closeGivenDialog} disabled={isMarking}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="contained"
            onClick={handleMarkGiven}
            disabled={!givenDate || isMarking}
          >
            {isMarking ? "Saving..." : "Mark as given"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
