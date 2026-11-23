
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Stack,
  Typography,
} from "@mui/material";

import { listRegistrations } from "../../services/registrationService";
import { formatDate } from "../../utils/dates";
import RecordPair from "../../components/Workspace/RecordPair";
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
    if (newFilter === filter) return;
    setFilter(newFilter);
    setStatus("loading");
    setError("");
    setRows([]);
  };

  const openReview = (registrationId, intent) => {
    navigate(`/moi/review/${registrationId}`, {state: {intent}});
  };

  return (
    <Box className="panel-page">
        <Typography variant="h5" component="h1" gutterBottom>
          Birth registration – Review queue
        </Typography>

        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mb: 2 }}
        >
          Review applications for birth registration and make a decision.
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
          <RecordPair records={rows} heading="Registration review queue"
            name={(r) => [r.proposedFirstName, r.proposedLastName].filter(Boolean).join(" ") || "Registration"}
            caption={(r) => formatDate(r.createdAt)}
            summary={(r) => <StatusBadge status={r.status} />}
            details={(r) => <>
              <dl className="record-fields">
                <dt>Date of birth</dt><dd>{formatDate(r.birthDateTime)}</dd>
                <dt>Hospital</dt><dd>{[r.hospital?.name, r.hospital?.municipality].filter(Boolean).join(", ") || "—"}</dd>
                <dt>Application date</dt><dd>{formatDate(r.createdAt)}</dd>
                <dt>Status</dt><dd><StatusBadge status={r.status} /></dd>
              </dl>
              <div className="decision-actions">{r.status === "pending" ? <>
              <Button variant="outlined" onClick={() => openReview(r._id, "return")}>↶ Return for correction</Button>
              <Button variant="contained" onClick={() => openReview(r._id, "approve")}>✓ Approve registration</Button>
              </> : <Button variant="contained" onClick={() => openReview(r._id)}>Review application</Button>}</div>
            </>}
          />
        )}

    </Box>
  );
}
