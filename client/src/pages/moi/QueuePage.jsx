import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import {
  Alert,
  Box,
  CircularProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableContainer,
  Typography,
} from "@mui/material";
import { listRegistrations } from "../../services/registrationService";
import { formatDate } from "../../utils/dates";
import StatusBadge from "../../components/StatusBadge/StatusBadge";

export default function QueuePage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState("loading"); // loading | error | ready
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false;
    listRegistrations("pending")
      .then((data) => {
        if (ignore) return;
        setRows(data);
        setStatus("ready");
      })
      .catch((err) => {
        if (ignore) return;
        setError(err.message);
        setStatus("error");
      });
    return () => {
      ignore = true;
    };
  }, []);

  if (status === "loading") {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 6 }}>
        <CircularProgress aria-label="Loading" />
      </Box>
    );
  }
  if (status === "error") {
    return (
      <Box sx={{ maxWidth: 900, mx: "auto", mt: 4, px: 2 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1100, mx: "auto", mt: 4, px: 2 }}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h5" component="h1" gutterBottom>
          MoI queue
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Pending applications, oldest first. Click a row to review.
        </Typography>

        {rows.length === 0 ? (
          <Alert severity="info">No pending applications.</Alert>
        ) : (
          <TableContainer>
            <Table size="small" aria-label="Pending registration applications">
              <TableHead>
                <TableRow>
                  <TableCell>Proposed name</TableCell>
                  <TableCell>Date of birth</TableCell>
                  <TableCell>Hospital</TableCell>
                  <TableCell>Applied</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((r) => (
                  <TableRow
                    key={r._id}
                    hover
                    sx={{ cursor: "pointer" }}
                    onClick={() => navigate(`/moi/review/${r._id}`)}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        navigate(`/moi/review/${r._id}`);
                      }
                    }}
                  >
                    <TableCell>
                      {r.proposedFirstName} {r.proposedLastName}
                    </TableCell>
                    <TableCell>{formatDate(r.birthDateTime)}</TableCell>
                    <TableCell>
                      {r.hospital?.name || "—"}
                      {r.hospital?.municipality
                        ? ` (${r.hospital.municipality})`
                        : ""}
                    </TableCell>
                    <TableCell>{formatDate(r.createdAt)}</TableCell>
                    <TableCell>
                      <StatusBadge status={r.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    </Box>
  );
}