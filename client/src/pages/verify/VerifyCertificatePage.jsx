import { useEffect, useState } from "react";
import { useParams } from "react-router";
import {
  Alert,
  Box,
  CircularProgress,
  Paper,
  Typography,
} from "@mui/material";
import { verifyCertificate } from "../../services/documentService";
import { formatDate } from "../../utils/dates";

const DOCUMENT_TYPE_LABELS = {
  registration_certificate: "Registration certificate",
};

export default function VerifyCertificatePage() {
  const { code } = useParams();
  const [answer, setAnswer] = useState(null);
  const [status, setStatus] = useState("loading"); // "loading" | "error" | "ready"
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false;
    verifyCertificate(code)
      .then((data) => {
        if (!ignore) {
          setAnswer(data);
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
  }, [code]);

  return (
    <Box sx={{ maxWidth: 500, mx: "auto", mt: 8, p: 2 }}>
      <Paper variant="outlined" sx={{ p: 4, textAlign: "center" }}>
        <Typography variant="h5" component="h1" gutterBottom>
          Certificate Verification
        </Typography>

        {status === "loading" && (
          <CircularProgress aria-label="Verifying document" />
        )}

        {status === "error" && <Alert severity="error">{error}</Alert>}

        {status === "ready" && answer.valid && (
          <Box sx={{ mt: 2 }}>
            <Alert severity="success" sx={{ mb: 2 }}>
              This document is valid.
            </Alert>
            <Typography variant="body2">
              Document type:{" "}
              {DOCUMENT_TYPE_LABELS[answer.documentType] || answer.documentType}
            </Typography>
            <Typography variant="body2">
              Issue date: {formatDate(answer.issueDate)}
            </Typography>
          </Box>
        )}

        {status === "ready" && !answer.valid && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            This verification code is not valid.
          </Alert>
        )}
      </Paper>
    </Box>
  );
}