
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Paper,
  Stack,
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
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("pending");

  useEffect(() => {
    let ignore = false;

    listRegistrations(filter)
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
  }, [filter]);

  const changeFilter = (newFilter) => {
    setFilter(newFilter);
    setStatus("loading");
    setError("");
    setRows([]);
  };

  const openReview = (registrationId) => {
    navigate(`/moi/review/${registrationId}`);
  };

  return (
    <Box sx={{ maxWidth: 1100, mx: "auto", mt: 4, px: 2 }}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h5" component="h1" gutterBottom>
          MoI queue
        </Typography>

        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mb: 2 }}
        >
          Select a status and click an application to review it.
        </Typography>

        <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
          <Button
            variant={filter === "pending" ? "contained" : "outlined"}
            onClick={() => changeFilter("pending")}
          >
            Pending
          </Button>

          <Button
            variant={filter === "approved" ? "contained" : "outlined"}
            onClick={() => changeFilter("approved")}
          >
            Approved
          </Button>
        </Stack>

        {status === "loading" && (
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              py: 4,
            }}
          >
            <CircularProgress aria-label="Loading applications" />
          </Box>
        )}

        {status === "error" && (
          <Alert severity="error">{error}</Alert>
        )}

        {status === "ready" && rows.length === 0 && (
          <Alert severity="info">
            No {filter} applications.
          </Alert>
        )}

        {status === "ready" && rows.length > 0 && (
          <TableContainer>
            <Table
              size="small"
              aria-label={`${filter} registration applications`}
            >
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
                    onClick={() => openReview(r._id)}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        openReview(r._id);
                      }
                    }}
                  >
                    <TableCell>
                      {r.proposedFirstName} {r.proposedLastName}
                    </TableCell>

                    <TableCell>
                      {formatDate(r.birthDateTime)}
                    </TableCell>

                    <TableCell>
                      {r.hospital?.name || "—"}
                      {r.hospital?.municipality
                        ? ` (${r.hospital.municipality})`
                        : ""}
                    </TableCell>

                    <TableCell>
                      {formatDate(r.createdAt)}
                    </TableCell>

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
