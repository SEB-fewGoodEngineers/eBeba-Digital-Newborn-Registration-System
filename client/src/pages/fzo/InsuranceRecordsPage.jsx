import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  List,
  ListItemButton,
  ListItemText,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import {
  getInsuranceRecords,
  getInsuranceRecord,
  startInsuranceRecord,
  issueInsurance,
  getPediatricians,
  assignPediatrician,
} from "../../services/insuranceService";
import StatusBadge from "../../components/StatusBadge/StatusBadge";
import DemoBadge from "../../components/DemoBadge/DemoBadge";
import { formatDate } from "../../utils/dates";

const babyName = (baby) =>
  [baby?.firstName, baby?.lastName].filter(Boolean).join(" ") || "Name pending";

// One line with a DEMO card number. Nothing is shown when there is no number.
const NumberRow = ({ label, value }) =>
  value ? (
    <Typography
      variant="body2"
      component="div"
      sx={{ display: "flex", alignItems: "center" }}
    >
      {label}: {value} <DemoBadge />
    </Typography>
  ) : null;

export default function InsuranceRecordsPage() {
  const [records, setRecords] = useState([]);
  const [status, setStatus] = useState("loading"); // "loading" | "error" | "ready"
  const [error, setError] = useState("");

  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const latestRequest = useRef(0); // ignores answers of older clicks

  const [insuredParentId, setInsuredParentId] = useState("");
  const [actionError, setActionError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [pediatricians, setPediatricians] = useState([]);
  const [pediatricianError, setPediatricianError] = useState("");
  const [pediatricianId, setPediatricianId] = useState("");

  useEffect(() => {
    let ignore = false; // stops an old request from overwriting new data
    getInsuranceRecords()
      .then((data) => {
        if (!ignore) {
          setRecords(data);
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

    // Load the list of active pediatricians once
  useEffect(() => {
    let ignore = false;
    getPediatricians()
      .then((data) => {
        if (!ignore) setPediatricians(data);
      })
      .catch((err) => {
        if (!ignore) setPediatricianError(err.message);
      });
    return () => {
      ignore = true;
    };
  }, []);

  const handleSelect = async (recordId) => {
    const requestNumber = ++latestRequest.current;
    setSelectedId(recordId);
    setDetail(null);
    setDetailError("");
    setActionError("");
    setInsuredParentId("");
    setPediatricianId("");
    setDetailLoading(true);
    try {
      const data = await getInsuranceRecord(recordId);
      if (requestNumber === latestRequest.current) setDetail(data);
    } catch (err) {
      if (requestNumber === latestRequest.current) setDetailError(err.message);
    } finally {
      if (requestNumber === latestRequest.current) setDetailLoading(false);
    }
  };

  // Runs "Start" or "Issue", then loads the record again
  const handleAction = async (actionFn) => {
    setActionError("");
    setIsSaving(true);
    try {
      const updated = await actionFn();
      const fresh = await getInsuranceRecord(updated._id);
      setDetail(fresh);
      setRecords((prev) =>
        prev.map((r) =>
          r._id === fresh._id ? { ...r, status: fresh.status } : r,
        ),
      );
      setInsuredParentId("");
      setPediatricianId("");
    } catch (err) {
      setActionError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (status === "loading") {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 8 }}>
        <CircularProgress aria-label="Loading" />
      </Box>
    );
  }

  if (status === "error") {
    return (
      <Box sx={{ p: 4, maxWidth: 600, mx: "auto" }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  if (records.length === 0) {
    return (
      <Box sx={{ p: 4, textAlign: "center" }}>
        <Typography>No insurance records found for your branch.</Typography>
      </Box>
    );
  }

  const baby = detail?.babyId;
  const insuredParent = detail?.linkedParents?.find(
    (p) => p._id === detail.insuredParentId,
  );

  return (
    <Box sx={{ p: 4, maxWidth: 1000, mx: "auto" }}>
      <Typography variant="h4" component="h1" gutterBottom>
        FZO Insurance Records
      </Typography>
      <Stack direction={{ xs: "column", md: "row" }} spacing={4}>
        <Box sx={{ flex: 1 }}>
          <Card variant="outlined">
            <List disablePadding>
              {records.map((record, index) => {
                const recordBaby = record.babyId || {};
                return (
                  <Box key={record._id}>
                    {index > 0 && <Divider />}
                    <ListItemButton
                      selected={selectedId === record._id}
                      onClick={() => handleSelect(record._id)}
                    >
                      <ListItemText
                        primary={babyName(recordBaby)}
                        slotProps={{ secondary: { component: "div" } }}
                        secondary={
                          <>
                            {recordBaby.jmbg && (
                              <Box sx={{ display: "flex", alignItems: "center" }}>
                                JMBG: {recordBaby.jmbg} <DemoBadge />
                              </Box>
                            )}
                            <Box>Created: {formatDate(record.createdAt)}</Box>
                            <Box sx={{ mt: 1 }}>
                              <StatusBadge status={record.status} />
                            </Box>
                          </>
                        }
                      />
                    </ListItemButton>
                  </Box>
                );
              })}
            </List>
          </Card>
        </Box>

        <Box sx={{ flex: 1 }}>
          {!selectedId && (
            <Card
              variant="outlined"
              sx={{ p: 4, textAlign: "center", bgcolor: "action.hover" }}
            >
              <Typography color="text.secondary">
                Select a record from the list to see the baby and parents.
              </Typography>
            </Card>
          )}

          {selectedId && detailLoading && (
            <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
              <CircularProgress aria-label="Loading record" />
            </Box>
          )}

          {selectedId && detailError && (
            <Alert severity="error">{detailError}</Alert>
          )}

          {detail && (
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Record Details
                </Typography>
                <StatusBadge status={detail.status} />

                <Box sx={{ mt: 1 }}>
                  <NumberRow label="Policy number" value={detail.policyNumber} />
                  <NumberRow
                    label="Health card number"
                    value={detail.healthCardNumber}
                  />
                  <NumberRow
                    label="Insured person card number"
                    value={detail.insuredPersonCardNumber}
                  />
                  {insuredParent && (
                    <Typography variant="body2">
                      Insured parent: {insuredParent.firstName}{" "}
                      {insuredParent.lastName}
                    </Typography>
                  )}
                </Box>

                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle2">Baby Civil Data</Typography>
                <Typography variant="body2">
                  First Name: {baby?.firstName || "N/A"}
                </Typography>
                <Typography variant="body2">
                  Last Name: {baby?.lastName || "N/A"}
                </Typography>
                <Typography
                  variant="body2"
                  component="div"
                  sx={{ display: "flex", alignItems: "center", my: 0.5 }}
                >
                  JMBG: {baby?.jmbg || "Pending"}
                  {baby?.jmbg && <DemoBadge />}
                </Typography>
                <Typography variant="body2">
                  Gender: {baby?.gender || "N/A"}
                </Typography>
                <Typography variant="body2">
                  Birth Date: {formatDate(baby?.birthDateTime)}
                </Typography>
                <Typography variant="body2">
                  Address: {baby?.residentialAddress || "N/A"}
                </Typography>

                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle2">Parents</Typography>
                <Typography variant="body2">
                  Mother: {baby?.mother?.firstName} {baby?.mother?.lastName}
                </Typography>
                {baby?.father?.firstName && (
                  <Typography variant="body2">
                    Father: {baby.father.firstName} {baby.father.lastName}
                  </Typography>
                )}
                                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle2">Pediatrician</Typography>
                <Typography variant="body2">
                  Current:{" "}
                  {detail.assignedPediatrician
                    ? `Dr. ${detail.assignedPediatrician.firstName} ${detail.assignedPediatrician.lastName}`
                    : "Not assigned yet"}
                </Typography>

                {pediatricianError && (
                  <Alert severity="error" sx={{ mt: 1 }}>
                    {pediatricianError}
                  </Alert>
                )}

                <TextField
                  select
                  fullWidth
                  size="small"
                  sx={{ mt: 1 }}
                  label="Choose a pediatrician"
                  helperText={
                    pediatricians.length === 0 && !pediatricianError
                      ? "No active pediatricians found."
                      : ""
                  }
                  value={pediatricianId}
                  onChange={(e) => setPediatricianId(e.target.value)}
                  disabled={isSaving || pediatricians.length === 0}
                >
                  {pediatricians.map((p) => (
                    <MenuItem key={p._id} value={p._id}>
                      Dr. {p.firstName} {p.lastName}
                      {p.institutionId?.name ? ` – ${p.institutionId.name}` : ""}
                    </MenuItem>
                  ))}
                </TextField>
                <Button
                  variant="outlined"
                  sx={{ mt: 1 }}
                  disabled={isSaving || !pediatricianId}
                  onClick={() =>
                    handleAction(async () => {
                      await assignPediatrician(detail._id, pediatricianId);
                      return detail; // handleAction needs the record id
                    })
                  }
                >
                  Assign Pediatrician
                </Button>

                {actionError && (
                  <Alert severity="error" sx={{ mt: 2 }}>
                    {actionError}
                  </Alert>
                )}

                <Box
                  sx={{ mt: 3, display: "flex", flexDirection: "column", gap: 2 }}
                >
                  {detail.status === "received" && (
                    <Button
                      variant="contained"
                      disabled={isSaving}
                      onClick={() =>
                        handleAction(() => startInsuranceRecord(detail._id))
                      }
                    >
                      Start Processing
                    </Button>
                  )}

                  {detail.status === "in_progress" && (
                    <>
                      {detail.linkedParents.length === 0 && (
                        <Alert severity="warning">
                          No parent is linked to this baby yet. Cards cannot be
                          issued.
                        </Alert>
                      )}
                      <TextField
                        select
                        size="small"
                        label="Insured parent"
                        helperText="The parent whose insurance covers the baby."
                        value={insuredParentId}
                        onChange={(e) => setInsuredParentId(e.target.value)}
                        disabled={isSaving || detail.linkedParents.length === 0}
                      >
                        {detail.linkedParents.map((p) => (
                          <MenuItem key={p._id} value={p._id}>
                            {p.firstName} {p.lastName}
                          </MenuItem>
                        ))}
                      </TextField>
                      <Button
                        variant="contained"
                        color="success"
                        disabled={isSaving || !insuredParentId}
                        onClick={() =>
                          handleAction(() =>
                            issueInsurance(detail._id, insuredParentId),
                          )
                        }
                      >
                        Issue Cards
                      </Button>
                    </>
                  )}
                </Box>
              </CardContent>
            </Card>
          )}
        </Box>
      </Stack>
    </Box>
  );
}