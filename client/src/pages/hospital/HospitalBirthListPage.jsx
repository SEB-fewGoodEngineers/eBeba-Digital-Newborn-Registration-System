import { useEffect, useState } from "react";
import { Link } from "react-router";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";

import { getBabies } from "../../services/babyService";
import { formatDateTime } from "../../utils/dates";

export default function HospitalBirthListPage() {
  const [babies, setBabies] = useState([]);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false;

    getBabies()
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

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" component="h1" gutterBottom>
        Hospital birth records
      </Typography>

      <Button
        component={Link}
        to="/hospital/babies/new"
        variant="contained"
        sx={{ mb: 3 }}
      >
        Record a birth
      </Button>

      {status === "loading" && <CircularProgress aria-label="Loading" />}

      {status === "error" && <Alert severity="error">{error}</Alert>}

      {status === "ready" && babies.length === 0 && (
        <Typography>No birth records yet.</Typography>
      )}

      {status === "ready" && babies.length > 0 && (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Record number</TableCell>
                <TableCell>Birth date</TableCell>
                <TableCell>Gender</TableCell>
                <TableCell>Mother</TableCell>
                <TableCell>Municipality</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {babies.map((baby) => (
                <TableRow key={baby._id}>
                  <TableCell>{baby.birthRecordNumber}</TableCell>

                  <TableCell>{formatDateTime(baby.birthDateTime)}</TableCell>

                  <TableCell>
                    {baby.gender === "M" ? "Male" : "Female"}
                  </TableCell>

                  <TableCell>
                    {baby.mother.firstName} {baby.mother.lastName}
                  </TableCell>

                  <TableCell>{baby.municipalityOfBirth}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}
