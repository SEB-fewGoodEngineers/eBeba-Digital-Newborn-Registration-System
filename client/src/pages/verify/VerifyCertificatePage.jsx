import { useEffect, useState } from "react";
import { Container, Typography, Paper, Box } from "@mui/material";

export default function VerifyCertificatePage() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const verifyCode = async () => {
      try {
        // Izvlači kod iz URL-a (npr. /verify/OVDJE_KOD)
        const pathSegments = window.location.pathname.split("/");
        const code = pathSegments[pathSegments.length - 1];

        if (!code) throw new Error("Verification code is missing.");

        const res = await fetch(`${import.meta.env.VITE_BACK_END_SERVER_URL}/verify/${code}`);
        if (!res.ok) throw new Error("Invalid or expired verification code.");
        const data = await res.json();
        setResult(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    verifyCode();
  }, []);

  return (
    <Container maxWidth="sm" sx={{ mt: 8 }}>
      <Paper elevation={3} sx={{ p: 4, textAlign: "center" }}>
        <Typography variant="h5" gutterBottom>
          Certificate Verification
        </Typography>
        {loading && <Typography>Verifying document...</Typography>}
        {error && <Typography color="error">{error}</Typography>}
        {result && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="body1" color="success.main" gutterBottom>
              <strong>Status:</strong> {result.valid ? "Valid Document" : "Invalid"}
            </Typography>
            <Typography variant="body2">Document Type: {result.documentType}</Typography>
            <Typography variant="body2">Issue Date: {result.issueDate}</Typography>
          </Box>
        )}
      </Paper>
    </Container>
  );
}