import { useState } from "react";
import { Alert, Button, Stack, Typography } from "@mui/material";
import DemoBadge from "../DemoBadge/DemoBadge";
import {
  downloadSocialCard,
  downloadInsuredPersonCard,
} from "../../services/documentService";

// Download buttons for the parent. A button is shown only when its card exists.
export default function CardDownloads({ baby }) {
  const [error, setError] = useState("");
  const [isBusy, setIsBusy] = useState(false);

  const hasSocialCard = baby.cswStatus === "completed";
  const hasInsuredCard = baby.insuranceStatus === "card_issued";

  if (!hasSocialCard && !hasInsuredCard) return null;

  const handleDownload = async (downloadFn) => {
    setError("");
    setIsBusy(true);
    try {
      await downloadFn(baby._id);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <Stack spacing={1} alignItems="flex-start">
      <Stack direction="row" alignItems="center">
        <Typography variant="h6" component="h3">
          Cards
        </Typography>
        <DemoBadge />
      </Stack>

      {hasSocialCard && (
        <Button
          variant="outlined"
          disabled={isBusy}
          onClick={() => handleDownload(downloadSocialCard)}
        >
          Download social card (PDF)
        </Button>
      )}

      {hasInsuredCard && (
        <Button
          variant="outlined"
          disabled={isBusy}
          onClick={() => handleDownload(downloadInsuredPersonCard)}
        >
          Download insured person card (PDF)
        </Button>
      )}

      {error && <Alert severity="error">{error}</Alert>}
    </Stack>
  );
}