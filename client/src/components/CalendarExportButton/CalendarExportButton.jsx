import { useState } from "react";
import { Alert, Box, Button } from "@mui/material";
import EventIcon from "@mui/icons-material/Event";
import { useUser } from "../../contexts/UserContext";
import { ROLES } from "../../constants/labels";
import { downloadCalendar } from "../../services/calendarService";

// STORY 4.6 - CALENDAR EXPORT
// Downloads an .ics file for Google Calendar or Apple Calendar.
// Only parents can download it (the server checks too).
export default function CalendarExportButton({ babyId }) {
  const { user } = useUser();
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState("");

  if (user?.role !== ROLES.PARENT) return null;

  const handleDownload = async () => {
    if (isDownloading) return;

    setIsDownloading(true);
    setError("");

    try {
      await downloadCalendar(babyId);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Box>
      <Button
        type="button"
        variant="outlined"
        startIcon={<EventIcon />}
        onClick={handleDownload}
        disabled={isDownloading}
      >
        {isDownloading ? "Preparing..." : "Add to calendar (.ics)"}
      </Button>
      {error && (
        <Alert severity="error" sx={{ mt: 1 }}>
          {error}
        </Alert>
      )}
    </Box>
  );
}
