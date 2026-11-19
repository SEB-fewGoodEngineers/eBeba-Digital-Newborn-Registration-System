import {
  Box,
  Chip,
  Step,
  StepContent,
  StepLabel,
  Stepper,
  Typography,
} from "@mui/material";
import { formatDateTime } from "../../utils/dates";
import { ROLE_LABELS, STATUS_LABELS } from "../../constants/labels";

// The "who" line for one history entry.
// Shows first + last name and the role. Never email.
const whoLine = (byUser) => {
  if (!byUser) return "Unknown user";
  const name = `${byUser.firstName} ${byUser.lastName}`.trim();
  return name || "Unknown user";
};

// Human-readable transition: "pending → returned" becomes
// "Pending → Returned for correction", using the shared labels.
const transitionLabel = (from, to) => {
  const fromText = from ? STATUS_LABELS[from] || from : "New";
  const toText = STATUS_LABELS[to] || to;
  return `${fromText} → ${toText}`;
};

export default function StatusTimeline({ history }) {
  if (!history || history.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        No history yet.
      </Typography>
    );
  }

  // The data model appends entries in order of occurrence: oldest first.
  // MUI Stepper shows the active step as the LAST one for a history timeline,
  // so we invert with `activeStep={history.length - 1}`.
  return (
    <Box>
      <Stepper orientation="vertical" activeStep={history.length - 1} nonLinear>
        {history.map((entry, idx) => {
          const isFirst = idx === 0;
          const note = (entry.note || "").trim();
          // The first entry has no note; show a plain sentence instead of an
          // empty paragraph. Do not invent a note when there is none.
          const displayNote = isFirst && !note ? "Application submitted" : note;
          return (
            <Step key={idx} completed>
              <StepLabel
                optional={
                  <Typography variant="caption" color="text.secondary">
                    {formatDateTime(entry.at)}
                  </Typography>
                }
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    flexWrap: "wrap",
                  }}
                >
                  <Typography variant="body2" component="span">
                    {transitionLabel(entry.from, entry.to)}
                  </Typography>
                  {entry.byUser?.role && (
                    <Chip
                      size="small"
                      variant="outlined"
                      label={
                        ROLE_LABELS[entry.byUser.role] || entry.byUser.role
                      }
                    />
                  )}
                </Box>
              </StepLabel>
              <StepContent>
                <Typography variant="caption" color="text.secondary">
                  By {whoLine(entry.byUser)}
                </Typography>
                {displayNote && (
                  <Typography variant="body2" sx={{ mt: 0.5 }}>
                    {displayNote}
                  </Typography>
                )}
              </StepContent>
            </Step>
          );
        })}
      </Stepper>
    </Box>
  );
}
