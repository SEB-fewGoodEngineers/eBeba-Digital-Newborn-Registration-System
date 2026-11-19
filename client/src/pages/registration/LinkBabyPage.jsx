import { useState } from "react";
import { Link } from "react-router";
import {
  Alert,
  Box,
  Button,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

import { linkBaby } from "../../services/babyService";

export default function LinkBabyPage() {
  const [birthRecordNumber, setBirthRecordNumber] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [linkedBaby, setLinkedBaby] = useState(null);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setIsSaving(true);

    try {
      const baby = await linkBaby(birthRecordNumber);
      setLinkedBaby(baby);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 600, mx: "auto", p: 3 }}>
      <Paper sx={{ p: 3 }}>
        <Stack spacing={3}>
          <Typography variant="h5" component="h1">
            Link my baby
          </Typography>

          {linkedBaby ? (
            <>
              <Alert severity="success">
                Your baby has been linked successfully.
              </Alert>

              <Typography>
                Birth record number: {linkedBaby.birthRecordNumber}
              </Typography>

              <Button component={Link} to="/babies/mine" variant="contained">
                View my babies
              </Button>

              <Button
                type="button"
                onClick={() => {
                  setLinkedBaby(null);
                  setBirthRecordNumber("");
                }}
              >
                Link another baby
              </Button>
            </>
          ) : (
            <Box component="form" onSubmit={handleSubmit}>
              <Stack spacing={3}>
                <Typography>
                  Enter the birth record number provided by the hospital.
                </Typography>

                {error && <Alert severity="error">{error}</Alert>}

                <TextField
                  label="Birth record number"
                  value={birthRecordNumber}
                  onChange={(event) => setBirthRecordNumber(event.target.value)}
                  required
                  fullWidth
                />

                <Button type="submit" variant="contained" disabled={isSaving}>
                  {isSaving ? "Linking..." : "Link my baby"}
                </Button>

                <Button component={Link} to="/babies/mine">
                  View my babies
                </Button>
              </Stack>
            </Box>
          )}
        </Stack>
      </Paper>
    </Box>
  );
}
