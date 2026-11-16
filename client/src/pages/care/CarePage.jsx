import { useEffect, useState } from "react";
import { useParams } from "react-router";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Divider,
  List,
  ListItem,
  ListItemText,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { createDiaryEntry, getDiaryEntries } from "../../services/careService";
import {
  formatDateTime,
  toDateTimeInput,
  toIso,
  todayRange,
} from "../../utils/dates";

const CATEGORY_OPTIONS = [
  { value: "feeding", label: "Feeding" },
  { value: "sleep", label: "Sleep" },
  { value: "diaper", label: "Diaper" },
  { value: "temperature", label: "Temperature" },
  { value: "activity", label: "Activity" },
];

const FEEDING_METHOD_OPTIONS = [
  { value: "breastfeeding", label: "Breastfeeding" },
  { value: "bottle", label: "Bottle" },
  { value: "solid", label: "Solid food" },
];

const DIAPER_TYPE_OPTIONS = [
  { value: "wet", label: "Wet" },
  { value: "dirty", label: "Dirty" },
  { value: "both", label: "Both" },
];

const CATEGORY_LABELS = Object.fromEntries(
  CATEGORY_OPTIONS.map((item) => [item.value, item.label]),
);

const FEEDING_LABELS = Object.fromEntries(
  FEEDING_METHOD_OPTIONS.map((item) => [item.value, item.label]),
);

const DIAPER_LABELS = Object.fromEntries(
  DIAPER_TYPE_OPTIONS.map((item) => [item.value, item.label]),
);

const createInitialForm = () => ({
  category: "feeding",
  recordedAt: toDateTimeInput(new Date().toISOString()),
  method: "breastfeeding",
  amountMl: "",
  durationMinutes: "",
  diaperType: "wet",
  temperatureCelsius: "",
  notes: "",
});

const formatEntryDetails = (entry) => {
  const details = entry.details || {};
  if (entry.category === "feeding") {
    const methodLabel = FEEDING_LABELS[details.method] || details.method || "";
    return details.amountMl !== undefined
      ? `${methodLabel} · ${details.amountMl} ml`
      : methodLabel;
  }
  if (entry.category === "sleep" && details.durationMinutes !== undefined) {
    return `${details.durationMinutes} min`;
  }
  if (entry.category === "diaper" && details.diaperType) {
    return DIAPER_LABELS[details.diaperType] || details.diaperType;
  }
  if (
    entry.category === "temperature" &&
    details.temperatureCelsius !== undefined
  ) {
    return `${details.temperatureCelsius} °C`;
  }
  return "";
};

export default function CarePage() {
  const { babyId } = useParams();

  const [entries, setEntries] = useState([]);
  const [status, setStatus] = useState("loading"); // "loading" | "error" | "ready"
  const [loadError, setLoadError] = useState("");

  const [formData, setFormData] = useState(createInitialForm);
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let ignore = false;
    const { from, to } = todayRange();

    getDiaryEntries(babyId, from, to)
      .then((data) => {
        if (!ignore) {
          setEntries(data);
          setStatus("ready");
        }
      })
      .catch((err) => {
        if (!ignore) {
          setLoadError(err.message);
          setStatus("error");
        }
      });

    return () => {
      ignore = true;
    };
  }, [babyId]);

  const handleChange = (evt) => {
    setFormError("");
    setFieldErrors({});
    setFormData({ ...formData, [evt.target.name]: evt.target.value });
  };

  const buildPayload = () => {
    const payload = {
      category: formData.category,
      recordedAt: toIso(formData.recordedAt),
      notes: formData.notes.trim() || undefined,
    };

    if (formData.category === "feeding") {
      payload.details = {
        method: formData.method,
        ...(formData.amountMl !== ""
          ? { amountMl: Number(formData.amountMl) }
          : {}),
      };
    } else if (formData.category === "sleep") {
      payload.details = {
        durationMinutes: Number(formData.durationMinutes),
      };
    } else if (formData.category === "diaper") {
      payload.details = {
        diaperType: formData.diaperType,
      };
    } else if (formData.category === "temperature") {
      payload.details = {
        temperatureCelsius: Number(formData.temperatureCelsius),
      };
    }

    return payload;
  };

  const handleSubmit = async (evt) => {
    evt.preventDefault();
    setIsSaving(true);
    setFormError("");
    setFieldErrors({});

    try {
      await createDiaryEntry(babyId, buildPayload());
      const { from, to } = todayRange();
      const updated = await getDiaryEntries(babyId, from, to);
      setEntries(updated);
      setStatus("ready");
      setFormData(createInitialForm());
    } catch (err) {
      setFormError(err.message);
      setFieldErrors(
        Object.fromEntries(err.details.map((d) => [d.field, d.message])),
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        BabyCare &amp; BabySteps
      </Typography>

      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h5" component="h2" gutterBottom>
          Daily Diary
        </Typography>

        <Box component="form" onSubmit={handleSubmit} noValidate>
          <Stack spacing={2}>
            {formError && <Alert severity="error">{formError}</Alert>}

            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                select
                label="Category"
                name="category"
                value={formData.category}
                onChange={handleChange}
                error={Boolean(fieldErrors.category)}
                helperText={fieldErrors.category}
                fullWidth
              >
                {CATEGORY_OPTIONS.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                label="Time"
                name="recordedAt"
                type="datetime-local"
                value={formData.recordedAt}
                onChange={handleChange}
                error={Boolean(fieldErrors.recordedAt)}
                helperText={fieldErrors.recordedAt}
                slotProps={{ inputLabel: { shrink: true } }}
                required
                fullWidth
              />
            </Stack>

            {formData.category === "feeding" && (
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                <TextField
                  select
                  label="Feeding method"
                  name="method"
                  value={formData.method}
                  onChange={handleChange}
                  error={Boolean(fieldErrors["details.method"])}
                  helperText={fieldErrors["details.method"]}
                  fullWidth
                >
                  {FEEDING_METHOD_OPTIONS.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </TextField>

                <TextField
                  label="Amount (ml)"
                  name="amountMl"
                  type="number"
                  value={formData.amountMl}
                  onChange={handleChange}
                  error={Boolean(fieldErrors["details.amountMl"])}
                  helperText={
                    fieldErrors["details.amountMl"] ||
                    "Optional for breastfeeding"
                  }
                  slotProps={{ htmlInput: { min: 0, max: 1000 } }}
                  fullWidth
                />
              </Stack>
            )}

            {formData.category === "sleep" && (
              <TextField
                label="Sleep duration (minutes)"
                name="durationMinutes"
                type="number"
                value={formData.durationMinutes}
                onChange={handleChange}
                error={Boolean(fieldErrors["details.durationMinutes"])}
                helperText={fieldErrors["details.durationMinutes"]}
                slotProps={{ htmlInput: { min: 1, max: 1440 } }}
                required
                fullWidth
              />
            )}

            {formData.category === "diaper" && (
              <TextField
                select
                label="Diaper type"
                name="diaperType"
                value={formData.diaperType}
                onChange={handleChange}
                error={Boolean(fieldErrors["details.diaperType"])}
                helperText={fieldErrors["details.diaperType"]}
                fullWidth
              >
                {DIAPER_TYPE_OPTIONS.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </TextField>
            )}

            {formData.category === "temperature" && (
              <TextField
                label="Temperature (°C)"
                name="temperatureCelsius"
                type="number"
                value={formData.temperatureCelsius}
                onChange={handleChange}
                error={Boolean(fieldErrors["details.temperatureCelsius"])}
                helperText={fieldErrors["details.temperatureCelsius"]}
                slotProps={{ htmlInput: { min: 34, max: 43, step: "0.1" } }}
                required
                fullWidth
              />
            )}

            <TextField
              label="Notes"
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              error={Boolean(fieldErrors.notes)}
              helperText={fieldErrors.notes || "Optional (max 500 characters)"}
              slotProps={{ htmlInput: { maxLength: 500 } }}
              multiline
              minRows={2}
              fullWidth
            />

            <Box>
              <Button type="submit" variant="contained" disabled={isSaving}>
                {isSaving ? "Saving…" : "Add diary entry"}
              </Button>
            </Box>
          </Stack>
        </Box>

        <Divider sx={{ my: 3 }} />

        <Typography variant="h6" component="h3" gutterBottom>
          Today&apos;s entries
        </Typography>

        {status === "loading" && <CircularProgress aria-label="Loading" />}
        {status === "error" && <Alert severity="error">{loadError}</Alert>}
        {status === "ready" && entries.length === 0 && (
          <Typography color="text.secondary">No diary entries yet.</Typography>
        )}
        {status === "ready" && entries.length > 0 && (
          <List disablePadding>
            {entries.map((entry) => {
              const detailText = formatEntryDetails(entry);
              const secondaryParts = [
                formatDateTime(entry.recordedAt),
                detailText,
                entry.notes,
              ].filter(Boolean);

              return (
                <ListItem key={entry._id} divider disableGutters>
                  <ListItemText
                    primary={
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Chip
                          label={
                            CATEGORY_LABELS[entry.category] || entry.category
                          }
                          size="small"
                        />
                        {detailText && (
                          <Typography variant="subtitle2">
                            {detailText}
                          </Typography>
                        )}
                      </Stack>
                    }
                    secondary={secondaryParts.join(" — ")}
                  />
                </ListItem>
              );
            })}
          </List>
        )}
      </Paper>
    </Container>
  );
}
