import { useEffect, useState } from "react";
import { Link as RouterLink } from "react-router";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Stack,
  Typography,
} from "@mui/material";

import { getMyBabies } from "../../services/pediatricianService";
import { formatDate } from "../../utils/dates";

// Before MoI registration a baby may have no name yet.
const babyName = (baby) =>
  [baby.firstName, baby.lastName].filter(Boolean).join(" ") ||
  "Name not registered yet";

// STORY 4.5 - PEDIATRICIAN: MY BABIES
export default function PediatricianBabiesPage() {
  const [babies, setBabies] = useState([]);
  const [status, setStatus] = useState("loading"); // "loading" | "error" | "ready"
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false; // stops an old request from overwriting new data

    getMyBabies()
      .then((data) => {
        if (!ignore) {
          setBabies(data);
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
  }, []);

  const renderContent = () => {
    if (status === "loading") {
      return <CircularProgress aria-label="Loading" />;
    }

    if (status === "error") {
      return <Alert severity="error">{error}</Alert>;
    }

    if (babies.length === 0) {
      return <Alert severity="info">No babies are assigned to you yet.</Alert>;
    }

    return (
      <Stack spacing={2}>
        {babies.map((baby) => (
          <Card key={baby._id} variant="outlined">
            <CardContent>
              <Typography variant="h6" component="h2">
                {babyName(baby)}
              </Typography>
              <Typography color="text.secondary">
                Born {formatDate(baby.birthDateTime)}
                {baby.placeOfBirth ? ` · ${baby.placeOfBirth}` : ""}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Birth record {baby.birthRecordNumber}
              </Typography>

              <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                <Button
                  component={RouterLink}
                  to={`/babies/${baby._id}/medical-records`}
                  variant="contained"
                >
                  Medical records
                </Button>
                <Button
                  component={RouterLink}
                  to={`/babies/${baby._id}/vaccinations`}
                  variant="outlined"
                >
                  Vaccinations
                </Button>
                {/* STORY 4.7 - GROWTH (read-only) */}
                <Button
                  component={RouterLink}
                  to={`/pediatrician/babies/${baby._id}/growth`}
                  variant="outlined"
                >
                  Growth
                </Button>
              </Stack>
            </CardContent>
          </Card>
        ))}
      </Stack>
    );
  };

  return (
    <Box sx={{ maxWidth: 960, mx: "auto", p: { xs: 2, sm: 3 } }}>
      <Typography variant="h4" component="h1" gutterBottom>
        My babies
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Babies assigned to you. Add examinations and vaccinations; the parents
        are notified.
      </Typography>

      {renderContent()}
    </Box>
  );
}
