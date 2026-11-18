import { LineChart } from "@mui/x-charts/LineChart";
import { useEffect, useState } from "react";
import { useParams } from "react-router";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  IconButton,
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
  createMilestone,
  deleteDiaryEntry,
  getDiaryEntries,
  getGrowthMeasurements,
  getMilestones,
} from "../../services/careService";
import {
  dayRange,
  formatDate,
  formatDateTime,
  toDateInput,
  toDateTimeInput,
  toIso,
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

const MILESTONE_CATEGORY_OPTIONS = [
  { value: "motor", label: "Motor" },
  { value: "cognitive", label: "Cognitive" },
  { value: "social", label: "Social" },
  { value: "language", label: "Language" },
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

const MILESTONE_CATEGORY_LABELS = Object.fromEntries(
  MILESTONE_CATEGORY_OPTIONS.map((item) => [item.value, item.label]),
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

const createInitialMilestoneForm = () => ({
  category: "motor",
  title: "",
  achievedAt: toDateInput(new Date().toISOString()),
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

  // Diary state
  const [entries, setEntries] = useState([]);
  const [diaryStatus, setDiaryStatus] = useState("loading");
  const [diaryLoadError, setDiaryLoadError] = useState("");
  const [diaryForm, setDiaryForm] = useState(createInitialDiaryForm);
  const [diaryFormError, setDiaryFormError] = useState("");
  const [diaryFieldErrors, setDiaryFieldErrors] = useState({});
  const [isSavingDiary, setIsSavingDiary] = useState(false);

  // Story 5.6: Selected date for viewing diary (defaults to today)
  const [selectedDate, setSelectedDate] = useState(() =>
    toDateInput(new Date().toISOString()),
  );

  // Delete dialog state
  const [deleteTargetId, setDeleteTargetId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Growth state
  const [measurements, setMeasurements] = useState([]);
  const [growthStatus, setGrowthStatus] = useState("loading");
  const [growthLoadError, setGrowthLoadError] = useState("");
  const [growthForm, setGrowthForm] = useState(createInitialGrowthForm);
  const [growthFormError, setGrowthFormError] = useState("");
  const [growthFieldErrors, setGrowthFieldErrors] = useState({});
  const [isSavingGrowth, setIsSavingGrowth] = useState(false);

  // Milestone state
  const [milestones, setMilestones] = useState([]);
  const [milestoneStatus, setMilestoneStatus] = useState("loading");
  const [milestoneLoadError, setMilestoneLoadError] = useState("");
  const [milestoneForm, setMilestoneForm] = useState(createInitialMilestoneForm);
  const [milestoneFormError, setMilestoneFormError] = useState("");
  const [milestoneFieldErrors, setMilestoneFieldErrors] = useState({});
  const [isSavingMilestone, setIsSavingMilestone] = useState(false);

  // Fetch diary entries whenever babyId or selectedDate changes
  useEffect(() => {
    let ignore = false;
    const { from, to } = dayRange(selectedDate);

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
  }, [babyId, selectedDate]);

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

  useEffect(() => {
    let ignore = false;

    getMilestones(babyId)
      .then((data) => {
        if (!ignore) {
          setMilestones(data);
          setMilestoneStatus("ready");
        }
      })
      .catch((err) => {
        if (!ignore) {
          setMilestoneLoadError(err.message);
          setMilestoneStatus("error");
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
      const { from, to } = dayRange(selectedDate);
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

  const handleDeleteConfirm = async () => {
    if (!deleteTargetId) return;
    setIsDeleting(true);
    try {
      await deleteDiaryEntry(babyId, deleteTargetId);
      const { from, to } = dayRange(selectedDate);
      const updated = await getDiaryEntries(babyId, from, to);
      setEntries(updated);
      setDeleteTargetId(null);
    } catch (err) {
      setDiaryLoadError(err.message);
    } finally {
      setIsDeleting(false);
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

  const handleMilestoneChange = (evt) => {
    setMilestoneFormError("");
    setMilestoneFieldErrors({});
    setMilestoneForm({ ...milestoneForm, [evt.target.name]: evt.target.value });
  };

  const buildMilestonePayload = () => ({
    category: milestoneForm.category,
    title: milestoneForm.title.trim(),
    achievedAt: toIso(milestoneForm.achievedAt),
    notes: milestoneForm.notes.trim() || undefined,
  });

  const handleMilestoneSubmit = async (evt) => {
    evt.preventDefault();
    setIsSavingMilestone(true);
    setMilestoneFormError("");
    setMilestoneFieldErrors({});

    try {
      await createMilestone(babyId, buildMilestonePayload());
      const updated = await getMilestones(babyId);
      setMilestones(updated);
      setMilestoneStatus("ready");
      setMilestoneForm(createInitialMilestoneForm());
    } catch (err) {
      setMilestoneFormError(err.message);
      setMilestoneFieldErrors(
        Object.fromEntries(err.details.map((d) => [d.field, d.message])),
      );
    } finally {
      setIsSavingMilestone(false);
    }
  };

  const todayStr = toDateInput(new Date().toISOString());
  const isToday = selectedDate === todayStr;

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

        {/* Story 5.6: Date picker and dynamic header */}
        <Stack
          direction={{ xs: "column", sm: "row" }}
          justifyContent="space-between"
          alignItems={{ xs: "stretch", sm: "center" }}
          spacing={2}
          sx={{ mb: 2 }}
        >
          <Typography variant="h6" component="h3">
            {isToday
              ? "Today's entries"
              : `Diary for ${formatDate(toIso(selectedDate))}`}
          </Typography>

          <TextField
            label="View date"
            type="date"
            size="small"
            value={selectedDate}
            onChange={(e) => {
              setDiaryStatus("loading");
              setSelectedDate(e.target.value);
            }}
            slotProps={{
              inputLabel: { shrink: true },
              htmlInput: { max: todayStr },
            }}
          />
        </Stack>

        {diaryStatus === "loading" && <CircularProgress aria-label="Loading" />}
        {diaryStatus === "error" && (
          <Alert severity="error">{diaryLoadError}</Alert>
        )}
        {diaryStatus === "ready" && entries.length === 0 && (
          <Typography color="text.secondary">
            {isToday
              ? "No diary entries yet."
              : `No diary entries on this day.`}
          </Typography>
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
                <ListItem
                  key={entry._id}
                  divider
                  disableGutters
                  secondaryAction={
                    <IconButton
                      edge="end"
                      aria-label="delete"
                      onClick={() => setDeleteTargetId(entry._id)}
                    >
                      ✕
                    </IconButton>
                  }
                >
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

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={Boolean(deleteTargetId)}
        onClose={() => setDeleteTargetId(null)}
      >
        <DialogTitle>Delete entry</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Delete this entry? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setDeleteTargetId(null)}
            disabled={isDeleting}
            type="button"
          >
            Cancel
          </Button>
          <Button
            onClick={handleDeleteConfirm}
            color="error"
            variant="contained"
            disabled={isDeleting}
            type="button"
          >
            {isDeleting ? "Deleting…" : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Growth Section */}
      <Paper sx={{ p: 3, mb: 4 }}>
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

      {/* Milestones Section */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h5" component="h2" gutterBottom>
          Milestones
        </Typography>

        <Box component="form" onSubmit={handleMilestoneSubmit} noValidate>
          <Stack spacing={2}>
            {milestoneFormError && (
              <Alert severity="error">{milestoneFormError}</Alert>
            )}

            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                select
                label="Category"
                name="category"
                value={milestoneForm.category}
                onChange={handleMilestoneChange}
                error={Boolean(milestoneFieldErrors.category)}
                helperText={milestoneFieldErrors.category}
                fullWidth
              >
                {MILESTONE_CATEGORY_OPTIONS.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                label="Title (e.g. First smile)"
                name="title"
                value={milestoneForm.title}
                onChange={handleMilestoneChange}
                error={Boolean(milestoneFieldErrors.title)}
                helperText={milestoneFieldErrors.title}
                required
                fullWidth
              />
            </Stack>

            <TextField
              label="Date achieved"
              name="achievedAt"
              type="date"
              value={milestoneForm.achievedAt}
              onChange={handleMilestoneChange}
              error={Boolean(milestoneFieldErrors.achievedAt)}
              helperText={milestoneFieldErrors.achievedAt}
              slotProps={{ inputLabel: { shrink: true } }}
              required
              fullWidth
            />

            <TextField
              label="Notes"
              name="notes"
              value={milestoneForm.notes}
              onChange={handleMilestoneChange}
              error={Boolean(milestoneFieldErrors.notes)}
              helperText={
                milestoneFormError || "Optional (max 500 characters)"
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
                disabled={isSavingMilestone}
              >
                {isSavingMilestone ? "Saving…" : "Add milestone"}
              </Button>
            </Box>
          </Stack>
        </Box>

        <Divider sx={{ my: 3 }} />

        <Typography variant="h6" component="h3" gutterBottom>
          Milestones list
        </Typography>

        {milestoneStatus === "loading" && (
          <CircularProgress aria-label="Loading" />
        )}
        {milestoneStatus === "error" && (
          <Alert severity="error">{milestoneLoadError}</Alert>
        )}
        {milestoneStatus === "ready" && milestones.length === 0 && (
          <Typography color="text.secondary">No milestones yet.</Typography>
        )}
        {milestoneStatus === "ready" && milestones.length > 0 && (
          <List disablePadding>
            {milestones.map((item) => {
              const secondaryParts = [
                formatDate(item.achievedAt),
                item.notes,
              ].filter(Boolean);

              return (
                <ListItem key={item._id} divider disableGutters>
                  <ListItemText
                    primary={
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Chip
                          label={
                            MILESTONE_CATEGORY_LABELS[item.category] ||
                            item.category
                          }
                          size="small"
                        />
                        <Typography variant="subtitle1" fontWeight={600}>
                          {item.title}
                        </Typography>
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