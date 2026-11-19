import { useEffect, useState } from "react";
import { Link } from "react-router";
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

import { getMyBabies } from "../../services/babyService";
import { formatDateTime } from "../../utils/dates";

export default function MyBabiesPage() {
  const [babies, setBabies] = useState([]);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false;

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

  if (status === "loading") {
    return (
      <Box sx={{ p: 3 }}>
        <CircularProgress aria-label="Loading" />
      </Box>
    );
  }

  if (status === "error") {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 800, mx: "auto", p: 3 }}>
      <Stack spacing={3}>
        <Typography variant="h5" component="h1">
          My babies
        </Typography>

        <Button
          component={Link}
          to="/babies/link"
          variant="contained"
          sx={{ alignSelf: "flex-start" }}
        >
          Link my baby
        </Button>

        {babies.length === 0 ? (
          <Typography>No babies linked to your account yet.</Typography>
        ) : (
          babies.map((baby) => (
            <Card key={baby._id}>
              <CardContent>
                <Stack spacing={1}>
                  <Typography variant="h6">
                    {baby.firstName || "Baby"} {baby.lastName || ""}
                  </Typography>

                  <Typography>
                    Record number: {baby.birthRecordNumber}
                  </Typography>

                  <Typography>
                    Born: {formatDateTime(baby.birthDateTime)}
                  </Typography>

                  <Typography>Gender: {baby.gender}</Typography>

                  <Typography>Place: {baby.placeOfBirth}</Typography>

                  <Typography>
                    Municipality: {baby.municipalityOfBirth}
                  </Typography>

                  <Typography>
                    Mother: {baby.mother?.firstName} {baby.mother?.lastName}
                  </Typography>

                  <Typography>
                    Weight: {baby.birthWeightGrams ?? "N/A"} g
                  </Typography>

                  <Typography>
                    Length: {baby.birthLengthCm ?? "N/A"} cm
                  </Typography>
                </Stack>
              </CardContent>
            </Card>
          ))
        )}
      </Stack>
    </Box>
  );
}
