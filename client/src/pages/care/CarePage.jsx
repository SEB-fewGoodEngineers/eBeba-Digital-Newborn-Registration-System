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
import {
  createDiaryEntry,
  createGrowthMeasurement,
  getDiaryEntries,
  getGrowthMeasurements,
} from "../../services/careService";
import {
  formatDate,
  formatDateTime,
  toDateInput,
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

const createInitialDiaryForm = () => ({
  category: "feeding",
  recordedAt: toDateTimeInput(new Date().toISOString()),
  method: "breastfeeding",
  amountMl: "",
  durationMinutes: "",
  diaperType: "wet",
  temperatureCelsius: "",
  notes: "",
});

const createInitialGrowthForm = () => ({
  measuredAt: toDateInput(new Date().toISOString()),
  weightGrams: "",
  heightCm: "",
  headCircumferenceCm: "",
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

  // Diary state
  const [entries, setEntries] = useState([]);
  const [diaryStatus, setDiaryStatus] = useState("loading"); // "loading" | "error" | "ready"
  const [diaryLoadError, setDiaryLoadError] = useState("");
  const [diaryForm, setDiaryForm] = useState(createInitialDiaryForm);
  const [diaryFormError, setDiaryFormError] = useState("");
  const [diaryFieldErrors, setDiaryFieldErrors] = useState({});
  const [isSavingDiary, setIsSavingDiary] = useState(false);

  // Growth state
  const [measurements, setMeasurements] = useState([]);
  const [growthStatus, setGrowthStatus] = useState("loading"); // "loading" | "error" | "ready"
  const [growthLoadError, setGrowthLoadError] = useState("");
  const [growthForm, setGrowthForm] = useState(createInitialGrowthForm);
  const [growthFormError, setGrowthFormError] = useState("");
  const [growthFieldErrors, setGrowthFieldErrors] = useState({});
  const [isSavingGrowth, setIsSavingGrowth] = useState(false);

  useEffect(() => {
    let ignore = false;
    const { from, to } = todayRange();

    getDiaryEntries(babyId, from, to)
      .then((data) => {
        if (!ignore) {
          setEntries(data);
          setDiaryStatus("ready");
        }
      })
      .catch((err) => {
        if (!ignore) {
          setDiaryLoadError(err.message);
          setDiaryStatus("error");
        }
      });

    return () => {
      ignore = true;
    };
  }, [babyId]);

  useEffect(() => {
    let ignore = false;

    getGrowthMeasurements(babyId)
      .then((data) => {
        if (!ignore) {
          setMeasurements(data);
          setGrowthStatus("ready");
        }
      })
      .catch((err) => {
        if (!ignore) {
          setGrowthLoadError(err.message);
          setGrowthStatus("error");
        }
      });

    return () => {
      ignore = true;
    };
  }, [babyId]);

  const handleDiaryChange = (evt) => {
    setDiaryFormError("");
    setDiaryFieldErrors({});
    setDiaryForm({ ...diaryForm, [evt.target.name]: evt.target.value });
  };

  const buildDiaryPayload = () => {
    const payload = {
      category: diaryForm.category,
      recordedAt: toIso(diaryForm.recordedAt),
      notes: diaryForm.notes.trim() || undefined,
    };

    if (diaryForm.category === "feeding") {
      payload.details = {
        method: diaryForm.method,
        ...(diaryForm.amountMl !== ""
          ? { amountMl: Number(diaryForm.amountMl) }
          : {}),
      };
    } else if (diaryForm.category === "sleep") {
      payload.details = {
        durationMinutes: Number(diaryForm.durationMinutes),
      };
    } else if (diaryForm.category === "diaper") {
      payload.details = {
        diaperType: diaryForm.diaperType,
      };
    } else if (diaryForm.category === "temperature") {
      payload.details = {
        temperatureCelsius: Number(diaryForm.temperatureCelsius),
      };
    }

    return payload;
  };

  const handleDiarySubmit = async (evt) => {
    evt.preventDefault();
    setIsSavingDiary(true);
    setDiaryFormError("");
    setDiaryFieldErrors({});

    try {
      await createDiaryEntry(babyId, buildDiaryPayload());
      const { from, to } = todayRange();
      const updated = await getDiaryEntries(babyId, from, to);
      setEntries(updated);
      setDiaryStatus("ready");
      setDiaryForm(createInitialDiaryForm());
    } catch (err) {
      setDiaryFormError(err.message);
      setDiaryFieldErrors(
        Object.fromEntries(err.details.map((d) => [d.field, d.message])),
      );
    } finally {
      setIsSavingDiary(false);
    }
  };

  const handleGrowthChange = (evt) => {
    setGrowthFormError("");
    setGrowthFieldErrors({});
    setGrowthForm({ ...growthForm, [evt.target.name]: evt.target.value });
  };

  const buildGrowthPayload = () => ({
    measuredAt: toIso(growthForm.measuredAt),
    weightGrams:
      growthForm.weightGrams === ""
        ? undefined
        : Number(growthForm.weightGrams),
    heightCm:
      growthForm.heightCm === "" ? undefined : Number(growthForm.heightCm),
    ...(growthForm.headCircumferenceCm !== ""
      ? { headCircumferenceCm: Number(growthForm.headCircumferenceCm) }
      : {}),
  });

  const handleGrowthSubmit = async (evt) => {
    evt.preventDefault();
    setIsSavingGrowth(true);
    setGrowthFormError("");
    setGrowthFieldErrors({});

    try {
      await createGrowthMeasurement(babyId, buildGrowthPayload());
      const updated = await getGrowthMeasurements(babyId);
      setMeasurements(updated);
      setGrowthStatus("ready");
      setGrowthForm(createInitialGrowthForm());
    } catch (err) {
      setGrowthFormError(err.message);
      setGrowthFieldErrors(
        Object.fromEntries(err.details.map((d) => [d.field, d.message])),
      );
    } finally {
      setIsSavingGrowth(false);
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        BabyCare &amp; BabySteps
      </Typography>

      {/* Diary Section */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h5" component="h2" gutterBottom>
          Daily Diary
        </Typography>

        <Box component="form" onSubmit={handleDiarySubmit} noValidate>
          <Stack spacing={2}>
            {diaryFormError && <Alert severity="error">{diaryFormError}</Alert>}

            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                select
                label="Category"
                name="category"
                value={diaryForm.category}
                onChange={handleDiaryChange}
                error={Boolean(diaryFieldErrors.category)}
                helperText={diaryFieldErrors.category}
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
                value={diaryForm.recordedAt}
                onChange={handleDiaryChange}
                error={Boolean(diaryFieldErrors.recordedAt)}
                helperText={diaryFieldErrors.recordedAt}
                slotProps={{ inputLabel: { shrink: true } }}
                required
                fullWidth
              />
            </Stack>

            {diaryForm.category === "feeding" && (
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                <TextField
                  select
                  label="Feeding method"
                  name="method"
                  value={diaryForm.method}
                  onChange={handleDiaryChange}
                  error={Boolean(diaryFieldErrors["details.method"])}
                  helperText={diaryFieldErrors["details.method"]}
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
                  value={diaryForm.amountMl}
                  onChange={handleDiaryChange}
                  error={Boolean(diaryFieldErrors["details.amountMl"])}
                  helperText={
                    diaryFieldErrors["details.amountMl"] ||
                    "Optional for breastfeeding"
                  }
                  slotProps={{ htmlInput: { min: 0, max: 1000 } }}
                  fullWidth
                />
              </Stack>
            )}

            {diaryForm.category === "sleep" && (
              <TextField
                label="Sleep duration (minutes)"
                name="durationMinutes"
                type="number"
                value={diaryForm.durationMinutes}
                onChange={handleDiaryChange}
                error={Boolean(diaryFieldErrors["details.durationMinutes"])}
                helperText={diaryFieldErrors["details.durationMinutes"]}
                slotProps={{ htmlInput: { min: 1, max: 1440 } }}
                required
                fullWidth
              />
            )}

            {diaryForm.category === "diaper" && (
              <TextField
                select
                label="Diaper type"
                name="diaperType"
                value={diaryForm.diaperType}
                onChange={handleDiaryChange}
                error={Boolean(diaryFieldErrors["details.diaperType"])}
                helperText={diaryFieldErrors["details.diaperType"]}
                fullWidth
              >
                {DIAPER_TYPE_OPTIONS.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </TextField>
            )}

            {diaryForm.category === "temperature" && (
              <TextField
                label="Temperature (°C)"
                name="temperatureCelsius"
                type="number"
                value={diaryForm.temperatureCelsius}
                onChange={handleDiaryChange}
                error={Boolean(diaryFieldErrors["details.temperatureCelsius"])}
                helperText={diaryFieldErrors["details.temperatureCelsius"]}
                slotProps={{ htmlInput: { min: 34, max: 43, step: "0.1" } }}
                required
                fullWidth
              />
            )}

            <TextField
              label="Notes"
              name="notes"
              value={diaryForm.notes}
              onChange={handleDiaryChange}
              error={Boolean(diaryFieldErrors.notes)}
              helperText={
                diaryFieldErrors.notes || "Optional (max 500 characters)"
              }
              slotProps={{ htmlInput: { maxLength: 500 } }}
              multiline
              minRows={2}
              fullWidth
            />

            <Box>
              <Button
                type="submit"
                variant="contained"
                disabled={isSavingDiary}
              >
                {isSavingDiary ? "Saving…" : "Add diary entry"}
              </Button>
            </Box>
          </Stack>
        </Box>

        <Divider sx={{ my: 3 }} />

        <Typography variant="h6" component="h3" gutterBottom>
          Today&apos;s entries
        </Typography>

        {diaryStatus === "loading" && <CircularProgress aria-label="Loading" />}
        {diaryStatus === "error" && (
          <Alert severity="error">{diaryLoadError}</Alert>
        )}
        {diaryStatus === "ready" && entries.length === 0 && (
          <Typography color="text.secondary">No diary entries yet.</Typography>
        )}
        {diaryStatus === "ready" && entries.length > 0 && (
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

      {/* Growth Section */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h5" component="h2" gutterBottom>
          Growth
        </Typography>

        <Box component="form" onSubmit={handleGrowthSubmit} noValidate>
          <Stack spacing={2}>
            {growthFormError && (
              <Alert severity="error">{growthFormError}</Alert>
            )}

            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                label="Date"
                name="measuredAt"
                type="date"
                value={growthForm.measuredAt}
                onChange={handleGrowthChange}
                error={Boolean(growthFieldErrors.measuredAt)}
                helperText={growthFieldErrors.measuredAt}
                slotProps={{ inputLabel: { shrink: true } }}
                required
                fullWidth
              />

              <TextField
                label="Weight (g)"
                name="weightGrams"
                type="number"
                value={growthForm.weightGrams}
                onChange={handleGrowthChange}
                error={Boolean(growthFieldErrors.weightGrams)}
                helperText={growthFieldErrors.weightGrams}
                slotProps={{ htmlInput: { min: 300, max: 30000 } }}
                required
                fullWidth
              />
            </Stack>

            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                label="Height (cm)"
                name="heightCm"
                type="number"
                value={growthForm.heightCm}
                onChange={handleGrowthChange}
                error={Boolean(growthFieldErrors.heightCm)}
                helperText={growthFieldErrors.heightCm}
                slotProps={{ htmlInput: { min: 20, max: 130, step: "0.1" } }}
                required
                fullWidth
              />

              <TextField
                label="Head circumference (cm)"
                name="headCircumferenceCm"
                type="number"
                value={growthForm.headCircumferenceCm}
                onChange={handleGrowthChange}
                error={Boolean(growthFieldErrors.headCircumferenceCm)}
                helperText={growthFieldErrors.headCircumferenceCm || "Optional"}
                slotProps={{ htmlInput: { min: 20, max: 60, step: "0.1" } }}
                fullWidth
              />
            </Stack>

            <Box>
              <Button
                type="submit"
                variant="contained"
                disabled={isSavingGrowth}
              >
                {isSavingGrowth ? "Saving…" : "Add measurement"}
              </Button>
            </Box>
          </Stack>
        </Box>

        <Divider sx={{ my: 3 }} />

        <Typography variant="h6" component="h3" gutterBottom>
          Measurements
        </Typography>

        {growthStatus === "loading" && (
          <CircularProgress aria-label="Loading" />
        )}
        {growthStatus === "error" && (
          <Alert severity="error">{growthLoadError}</Alert>
        )}
        {growthStatus === "ready" && measurements.length === 0 && (
          <Typography color="text.secondary">
            No growth measurements yet.
          </Typography>
        )}
        {growthStatus === "ready" && measurements.length > 0 && (
          <List disablePadding>
            {measurements.map((item) => {
              const parts = [
                `Weight: ${item.weightGrams} g`,
                `Height: ${item.heightCm} cm`,
                item.headCircumferenceCm !== undefined
                  ? `Head: ${item.headCircumferenceCm} cm`
                  : null,
              ].filter(Boolean);

              return (
                <ListItem key={item._id} divider disableGutters>
                  <ListItemText
                    primary={parts.join(" · ")}
                    secondary={formatDate(item.measuredAt)}
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
