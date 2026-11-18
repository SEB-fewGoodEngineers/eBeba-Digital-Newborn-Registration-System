
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
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

import { useUser } from "../../contexts/UserContext";
import { ROLES } from "../../constants/labels";
import {
  createMedicalRecord,
  getMedicalRecords,
  updateMedicalRecord,
} from "../../services/medicalRecordService";
import {
  formatDate,
  toDateInput,
  toIso,
} from "../../utils/dates";

const RECORD_TYPES = [
  { value: "examination", label: "Examination" },
  { value: "allergy", label: "Allergy" },
  { value: "general_note", label: "General note" },
];

const ENTRY_SOURCES = {
  PARENT: "parent-entered",
  PEDIATRICIAN: "pediatrician-entered",
};

const createEmptyForm = () => ({
  recordType: "examination",
  title: "",
  description: "",
  doctorRecommendations: "",
  examinationDate: toDateInput(new Date().toISOString()),
});

export default function MedicalRecordsPage() {
  const { babyId } = useParams();
  const { user } = useUser();

  const [records, setRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [form, setForm] = useState(createEmptyForm);
  const [editingId, setEditingId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    let active = true;

    getMedicalRecords(babyId)
      .then((data) => {
        if (!active) return;
        setRecords(data);
      })
      .catch((err) => {
        if (!active) return;
        setError(err.message);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [babyId]);

  const canEdit = (record) => {
    if (user?.role === ROLES.PARENT) {
      return record.entrySource === ENTRY_SOURCES.PARENT;
    }

    if (user?.role === ROLES.PEDIATRICIAN) {
      return record.entrySource === ENTRY_SOURCES.PEDIATRICIAN;
    }

    return false;
  };

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));

    setFormError("");
    setFieldErrors({});
  };

  const resetForm = () => {
    setForm(createEmptyForm());
    setEditingId(null);
    setFormError("");
    setFieldErrors({});
  };

  const handleEdit = (record) => {
    if (!canEdit(record)) return;

    setEditingId(record._id);

    setForm({
      recordType: record.recordType,
      title: record.title,
      description: record.description,
      doctorRecommendations: record.doctorRecommendations || "",
      examinationDate: toDateInput(record.examinationDate),
    });

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
      const payload = {
        recordType: form.recordType,
        title: form.title,
        description: form.description,
        doctorRecommendations: form.doctorRecommendations,
        examinationDate: toIso(form.examinationDate),
      };

      if (editingId) {
        await updateMedicalRecord(babyId, editingId, payload);
      } else {
        await createMedicalRecord(babyId, payload);
      }

      const updatedRecords = await getMedicalRecords(babyId);
      setRecords(updatedRecords);
      setError("");
      resetForm();
    } catch (err) {
      setFormError(err.message);

      setFieldErrors(
        Object.fromEntries(
          (err.details || []).map((detail) => [
            detail.field,
            detail.message,
          ]),
        ),
      );
    } finally {
      setIsSaving(false);
    }
  };

  const formInvalid =
    !form.title.trim() ||
    !form.description.trim() ||
    !form.examinationDate;

  return (
    <Box sx={{ maxWidth: 960, mx: "auto", p: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        BabyHealth — Medical Records
      </Typography>

      <Typography color="text.secondary" sx={{ mb: 1 }}>
        Medical history, allergies, and examination notes.
      </Typography>

      {/* STORY 4.3 - VACCINATIONS */}
      <Button
        component={RouterLink}
        to={`/babies/${babyId}/vaccinations`}
        sx={{ mb: 3 }}
      >
        Vaccinations
      </Button>

      {isLoading && (
        <CircularProgress aria-label="Loading medical records" />
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {!isLoading && !error && (
        <>
          <Card sx={{ mb: 4 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                {editingId
                  ? "Edit medical record"
                  : "Add medical record"}
              </Typography>

              <Box
                component="form"
                onSubmit={handleSubmit}
                noValidate
              >
                <Stack spacing={2}>
                  {formError && (
                    <Alert severity="error">
                      {formError}
                    </Alert>
                  )}

                  <TextField
                    select
                    required
                    fullWidth
                    label="Record type"
                    name="recordType"
                    value={form.recordType}
                    onChange={handleChange}
                    error={Boolean(fieldErrors.recordType)}
                    helperText={fieldErrors.recordType}
                  >
                    {RECORD_TYPES.map((type) => (
                      <MenuItem
                        key={type.value}
                        value={type.value}
                      >
                        {type.label}
                      </MenuItem>
                    ))}
                  </TextField>

                  <TextField
                    required
                    fullWidth
                    label="Title"
                    name="title"
                    value={form.title}
                    onChange={handleChange}
                    error={Boolean(fieldErrors.title)}
                    helperText={fieldErrors.title}
                    slotProps={{
                      htmlInput: { maxLength: 100 },
                    }}
                  />

                  <TextField
                    required
                    fullWidth
                    multiline
                    minRows={3}
                    label="Description"
                    name="description"
                    value={form.description}
                    onChange={handleChange}
                    error={Boolean(fieldErrors.description)}
                    helperText={fieldErrors.description}
                    slotProps={{
                      htmlInput: { maxLength: 2000 },
                    }}
                  />

                  <TextField
                    fullWidth
                    multiline
                    minRows={2}
                    label="Doctor recommendations"
                    name="doctorRecommendations"
                    value={form.doctorRecommendations}
                    onChange={handleChange}
                    error={Boolean(fieldErrors.doctorRecommendations)}
                    helperText={fieldErrors.doctorRecommendations}
                    slotProps={{
                      htmlInput: { maxLength: 2000 },
                    }}
                  />

                  <TextField
                    required
                    fullWidth
                    type="date"
                    label="Examination date"
                    name="examinationDate"
                    value={form.examinationDate}
                    onChange={handleChange}
                    error={Boolean(fieldErrors.examinationDate)}
                    helperText={fieldErrors.examinationDate}
                    slotProps={{
                      inputLabel: { shrink: true },
                    }}
                  />

                  <Stack direction="row" spacing={2}>
                    <Button
                      variant="contained"
                      type="submit"
                      disabled={formInvalid || isSaving}
                    >
                      {isSaving
                        ? "Saving..."
                        : editingId
                          ? "Save changes"
                          : "Add record"}
                    </Button>

                    {editingId && (
                      <Button
                        type="button"
                        disabled={isSaving}
                        onClick={resetForm}
                      >
                        Cancel
                      </Button>
                    )}
                  </Stack>
                </Stack>
              </Box>
            </CardContent>
          </Card>

          <Typography
            variant="h5"
            component="h2"
            sx={{ mb: 2 }}
          >
            Medical history
          </Typography>

          {records.length === 0 ? (
            <Alert severity="info">
              No medical records yet.
            </Alert>
          ) : (
            <Stack spacing={2}>
              {records.map((record) => (
                <Card key={record._id}>
                  <CardContent>
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      alignItems="flex-start"
                      spacing={2}
                      sx={{ mb: 2 }}
                    >
                      <Box>
                        <Typography variant="h6">
                          {record.title}
                        </Typography>

                        <Typography color="text.secondary">
                          {formatDate(record.examinationDate)}
                        </Typography>
                      </Box>

                      <Chip
                        size="small"
                        label={
                          RECORD_TYPES.find(
                            (type) =>
                              type.value === record.recordType,
                          )?.label || record.recordType
                        }
                      />
                    </Stack>

                    <Typography sx={{ mb: 2 }}>
                      {record.description}
                    </Typography>

                    {record.doctorRecommendations && (
                      <Typography sx={{ mb: 2 }}>
                        <strong>Recommendations:</strong>{" "}
                        {record.doctorRecommendations}
                      </Typography>
                    )}

                    <Typography
                      variant="body2"
                      color="text.secondary"
                    >
                      {record.entrySource === ENTRY_SOURCES.PARENT
                        ? "Entered by parent"
                        : record.entrySource === ENTRY_SOURCES.PEDIATRICIAN
                          ? "Entered by pediatrician"
                          : "Unknown entry source"}
                    </Typography>

                    {canEdit(record) && (
                      <Button
                        type="button"
                        sx={{ mt: 2 }}
                        onClick={() => handleEdit(record)}
                      >
                        Edit
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </Stack>
          )}
        </>
      )}
    </Box>
  );
}
