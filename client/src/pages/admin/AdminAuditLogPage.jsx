
import { useEffect, useState } from "react";
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
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";

import { getAdminAuditLogs } from "../../services/adminService";
import { ROLE_LABELS } from "../../constants/labels";

export default function AdminAuditLogPage() {
  const [logs, setLogs] = useState([]);
  const [action, setAction] = useState("");
  const [selectedAction, setSelectedAction] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false;

    getAdminAuditLogs(selectedAction)
      .then((data) => {
        if (!ignore) {
          setLogs(data);
          setError("");
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!ignore) {
          setError(err.message);
          setLogs([]);
          setLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [selectedAction]);

  const handleSearch = (event) => {
    event.preventDefault();

    const nextAction = action.trim();

    if (nextAction !== selectedAction) {
      setLoading(true);
      setSelectedAction(nextAction);
    }
  };

  const handleClear = () => {
    setAction("");

    if (selectedAction !== "") {
      setLoading(true);
      setSelectedAction("");
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" component="h1" gutterBottom>
        Audit logs
      </Typography>

      <Typography color="text.secondary" sx={{ mb: 3 }}>
        View the latest 100 audit records.
      </Typography>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Box component="form" onSubmit={handleSearch}>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={2}
            sx={{ alignItems: "center" }}
          >
            <TextField
              label="Filter by action"
              placeholder="e.g. user.create"
              value={action}
              onChange={(event) => setAction(event.target.value)}
              size="small"
              fullWidth
              slotProps={{
                htmlInput: { maxLength: 100 },
              }}
            />

            <Button type="submit" variant="contained">
              Search
            </Button>

            <Button type="button" variant="outlined" onClick={handleClear}>
              Clear
            </Button>
          </Stack>
        </Box>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ textAlign: "center", mt: 4 }}>
          <CircularProgress aria-label="Loading" />
        </Box>
      ) : logs.length === 0 ? (
        <Typography>No audit records found.</Typography>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Time</TableCell>
                <TableCell>User</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Action</TableCell>
                <TableCell>Collection</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {logs.map((log) => {
                const actor = log.actorUserId;

                const actorName = actor
                  ? `${actor.firstName} ${actor.lastName}`
                  : "Unknown user";

                return (
                  <TableRow key={log._id}>
                    <TableCell>
                      {new Date(log.createdAt).toLocaleString()}
                    </TableCell>

                    <TableCell>
                      {actorName}

                      {actor?.email && (
                        <Typography
                          variant="body2"
                          color="text.secondary"
                        >
                          {actor.email}
                        </Typography>
                      )}
                    </TableCell>

                    <TableCell>
                      {ROLE_LABELS[log.actorRole] || log.actorRole}
                    </TableCell>

                    <TableCell>{log.action}</TableCell>

                    <TableCell>{log.targetCollection}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}