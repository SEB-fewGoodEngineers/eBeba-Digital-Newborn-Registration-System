
import { useEffect, useState } from "react";
import Add from "@mui/icons-material/Add";
import { Link } from "react-router";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  TextField,
  Typography,
} from "@mui/material";

import { getBabies } from "../../services/babyService";
import { formatDateTime } from "../../utils/dates";
import RecordPair from "../../components/Workspace/RecordPair";
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
    <Box className="panel-page">
      <header className="panel-heading"><div>
      <Typography variant="h5" component="h1" gutterBottom>
        Birth records
      </Typography><p>Record new births and manage recent birth records.</p></div>
      <Button
        component={Link}
        startIcon={<Add />}
        to="/hospital/babies/new"
        variant="contained"
        sx={{ mb: 3 }}
      >
        Record a birth
      </Button></header>

      {/* STORY 1.5 - SEARCH THE HOSPITAL LIST */}
      <details className="search-tools"><summary>Search birth records</summary><TextField
        label="Search by mother's last name or record number"
        value={search}
        onChange={handleSearch}
        fullWidth
        size="small"
        sx={{ mb: 3 }}
      /></details>

      {status === "loading" && (
        <CircularProgress aria-label="Loading" />
      )}

      {status === "error" && (
        <Alert severity="error">{error}</Alert>
      )}

      {status === "ready" && babies.length === 0 && (
        <Typography>
          {search
            ? "No matching birth records found."
            : "No birth records yet."}
        </Typography>
      )}

      {status === "ready" && babies.length > 0 && (
        <RecordPair records={babies} heading="Birth records" detailTitle="Record details"
          name={(b) => [b.firstName, b.lastName].filter(Boolean).join(" ") || b.birthRecordNumber}
          caption={(b) => formatDateTime(b.birthDateTime)}
          summary={(b) => <small>{b.birthRecordNumber}</small>}
          details={(b) => <>
            <dl className="record-fields">
              <dt>Baby</dt><dd>{[b.firstName,b.lastName].filter(Boolean).join(" ") || "Newborn"}</dd>
              <dt>Birth record</dt><dd>{b.birthRecordNumber}</dd>
              <dt>Date of birth</dt><dd>{formatDateTime(b.birthDateTime)}</dd>
            </dl><strong className="hospital-complete">✓ Hospital record complete</strong>
            <details className="extra-info"><summary>More details</summary><dl className="record-fields">
              <dt>Gender</dt><dd>{b.gender}</dd>
              <dt>Mother</dt><dd>{b.mother?.firstName} {b.mother?.lastName}</dd>
              <dt>Municipality</dt><dd>{b.municipalityOfBirth}</dd>
              <dt>Registration</dt><dd><StatusBadge status={b.registrationStatus || "Not applied"} /></dd>
              {b.registrationStatus === "approved" && b.jmbg && <><dt>JMBG</dt><dd>{b.jmbg} <DemoBadge /></dd></>}
            </dl>
            {!b.registrationStatus && <Button component={Link} to={`/hospital/babies/${b._id}/edit`} variant="outlined">Edit record</Button>}
            </details>
          </>}
        />
      )}
    </Box>
  );
}
