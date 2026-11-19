
import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Stack,
  Typography,
} from "@mui/material";

// Renders the AI pre-check for one registration.
// - takes `suggestion` (the aiSuggestions doc, or null before the first run)
// - calls `onRun` when "Run pre-check" is clicked
// - calls `onDecide(flagId, decision)` when Accept / Dismiss is clicked
// Flags never change the registration status; only the buttons in ReviewPage do.
export default function PrecheckPanel({
  suggestion,
  onRun,
  onDecide,
  isRunning,
  isDeciding,
  error,
}) {
  const [localBusyFlagId, setLocalBusyFlagId] = useState(null);

  const handleDecide = async (flagId, decision) => {
    setLocalBusyFlagId(flagId);

    try {
      await onDecide(flagId, decision);
    } finally {
      setLocalBusyFlagId(null);
    }
  };

  const showUnavailable =
    suggestion && suggestion.aiAvailable === false;

  return (
    <Card sx={{ mt: 2 }}>
      <CardContent>
        <Stack
          direction="row"
          spacing={2}
          sx={{
            mb: 1,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <Typography variant="h6">AI pre-check</Typography>

          <Button
            variant="outlined"
            onClick={onRun}
            disabled={isRunning}
            sx={{ ml: "auto" }}
            type="button"
          >
            {isRunning ? "Running…" : "Run pre-check"}
          </Button>
        </Stack>

        {error && (
          <Alert severity="error" sx={{ mb: 1 }}>
            {error}
          </Alert>
        )}

        {showUnavailable && (
          <Alert severity="warning" sx={{ mb: 1 }}>
            AI check unavailable. Showing rule-based flags only.
          </Alert>
        )}

        {isRunning && !suggestion && (
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              py: 2,
            }}
          >
            <CircularProgress aria-label="Running pre-check" />
          </Box>
        )}

        {suggestion && suggestion.flags?.length === 0 && (
          <Typography variant="body2" color="text.secondary">
            No flags were raised.
          </Typography>
        )}

        {suggestion && suggestion.flags?.length > 0 && (
          <Stack divider={<Divider flexItem />} spacing={1}>
            {suggestion.flags.map((flag) => {
              const isPending = flag.decision === "pending";
              const isBusy =
                localBusyFlagId === flag._id || isDeciding;

              return (
                <Box key={flag._id}>
                  <Stack
                    direction="row"
                    spacing={1}
                    sx={{
                      mb: 0.5,
                      flexWrap: "wrap",
                      alignItems: "center",
                    }}
                  >
                    <Typography
                      variant="caption"
                      color="text.secondary"
                    >
                      {flag.field}
                    </Typography>

                    <Chip
                      label={flag.source === "ai" ? "AI" : "Rule"}
                      size="small"
                      color={
                        flag.source === "ai" ? "info" : "default"
                      }
                      variant="outlined"
                    />

                    {flag.decision === "accepted" && (
                      <Chip
                        label="Accepted"
                        size="small"
                        color="success"
                      />
                    )}

                    {flag.decision === "dismissed" && (
                      <Chip
                        label="Dismissed"
                        size="small"
                        color="default"
                      />
                    )}
                  </Stack>

                  <Typography variant="body2" sx={{ mb: 1 }}>
                    {flag.message}
                  </Typography>

                  {isPending && (
                    <Stack direction="row" spacing={1}>
                      <Button
                        size="small"
                        variant="contained"
                        color="success"
                        onClick={() =>
                          handleDecide(flag._id, "accepted")
                        }
                        disabled={isBusy}
                        type="button"
                      >
                        Accept
                      </Button>

                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() =>
                          handleDecide(flag._id, "dismissed")
                        }
                        disabled={isBusy}
                        type="button"
                      >
                        Dismiss
                      </Button>
                    </Stack>
                  )}
                </Box>
              );
            })}
          </Stack>
        )}

        {suggestion && (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: "block", mt: 2 }}
          >
            Flags are suggestions only. They never change the
            application status. Provider:{" "}
            {suggestion.provider || "mock"}.
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}
