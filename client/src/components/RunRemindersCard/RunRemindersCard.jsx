import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Stack,
  Typography,
} from "@mui/material";
import { runRemindersNow } from "../../services/notificationService";

// N3 - REMINDERS: the admin's "Run reminders now" button.
// It runs the same job as the daily one; a free Render server may be asleep
// when the daily job should run.
export default function RunRemindersCard() {
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const handleRun = async () => {
    if (isRunning) return;

    setIsRunning(true);
    setError("");
    setResult(null);

    try {
      setResult(await runRemindersNow());
    } catch (err) {
      setError(err.message);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <Card variant="outlined" sx={{ mb: 3 }}>
      <CardContent>
        <Stack spacing={2}>
          <Typography variant="h6" component="h2">
            Reminders
          </Typography>
          <Typography color="text.secondary">
            Every day at 08:00 eBeba reminds parents of vaccinations and
            check-ups in the next 24 hours. Run it now if the server was asleep.
          </Typography>

          {error && <Alert severity="error">{error}</Alert>}

          {result && (
            <Alert severity="success">
              Done. {result.sent} reminders sent ({result.vaccinations}{" "}
              vaccinations, {result.appointments} check-ups found),{" "}
              {result.skipped} skipped, {result.failed} failed.
            </Alert>
          )}

          <Box>
            <Button
              type="button"
              variant="contained"
              onClick={handleRun}
              disabled={isRunning}
            >
              {isRunning ? "Running..." : "Run reminders now"}
            </Button>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}
