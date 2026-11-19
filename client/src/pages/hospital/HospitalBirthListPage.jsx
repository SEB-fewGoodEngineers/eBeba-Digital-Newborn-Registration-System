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
  TextField,
  Typography,
} from "@mui/material";

import { getBabies } from "../../services/babyService";
import { formatDateTime } from "../../utils/dates";
import StatusBadge from "../../components/StatusBadge/StatusBadge";
import DemoBadge from "../../components/DemoBadge/DemoBadge";

export default function HospitalBirthListPage() {
  const [babies, setBabies] = useState([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false;

    const timer = setTimeout(() => {
      getBabies(search)
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
    }, 300);

    return () => {
      ignore = true;
      clearTimeout(timer);
    };
  }, [search]);

  function handleSearch(event) {
    setSearch(event.target.value);
    setStatus("loading");
    setError("");
  }

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

      {/* STORY 1.5 - SEARCH THE HOSPITAL LIST */}
      <TextField
        label="Search by mother's last name or record number"
        value={search}
        onChange={handleSearch}
        fullWidth
        size="small"
        sx={{ mb: 3 }}
      />

      {status === "loading" && <CircularProgress aria-label="Loading" />}

      {status === "error" && <Alert severity="error">{error}</Alert>}

      {status === "ready" && babies.length === 0 && (
        <Typography>
          {search
            ? "No matching birth records found."
            : "No birth records yet."}
        </Typography>
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
                <TableCell>Status</TableCell>
                <TableCell>JMBG</TableCell>
                <TableCell>Action</TableCell>
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

                  <TableCell>
                    <StatusBadge
                      status={baby.registrationStatus || "Not applied"}
                    />
                  </TableCell>

                  <TableCell>
                    {baby.registrationStatus === "approved" && baby.jmbg ? (
                      <>
                        {baby.jmbg}
                        <DemoBadge />
                      </>
                    ) : (
                      "—"
                    )}
                  </TableCell>

                  {/* STORY 1.4 - CORRECT A BIRTH RECORD */}
                  <TableCell>
                    {!baby.registrationStatus ? (
                      <Button
                        component={Link}
                        to={`/hospital/babies/${baby._id}/edit`}
                        variant="outlined"
                        size="small"
                      >
                        Edit
                      </Button>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}
