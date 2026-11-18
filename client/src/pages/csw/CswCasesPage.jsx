import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Card,
  CardContent,
  CircularProgress,
  List,
  ListItemButton,
  ListItemText,
  Typography,
  Stack,
  Divider,
  Button,
  TextField,
} from "@mui/material";
import {
  getCswCases,
  startCswCase,
  completeCswCase,
  rejectCswCase,
} from "../../services/cswService";
import StatusBadge from "../../components/StatusBadge/StatusBadge";
import DemoBadge from "../../components/DemoBadge/DemoBadge";
import { formatDate } from "../../utils/dates";

export default function CswCasesPage() {
  const [cases, setCases] = useState([]);
  const [selectedCase, setSelectedCase] = useState(null);
  const [status, setStatus] = useState("loading"); // "loading" | "error" | "ready"
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [rejectNotes, setRejectNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let ignore = false;
    getCswCases()
      .then((data) => {
        if (!ignore) {
          setCases(data);
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

  const handleSelectCase = (cswCase) => {
    setSelectedCase(cswCase);
    setActionError("");
    setRejectNotes("");
  };

  const syncUpdatedCase = (updated) => {
    // Čuvamo postojeći babyId objekat ako ga server nije ponovo populirao
    const merged = {
      ...updated,
      babyId:
        typeof updated.babyId === "object" && updated.babyId !== null
          ? updated.babyId
          : selectedCase.babyId,
    };
    setSelectedCase(merged);
    setCases((prev) =>
      prev.map((item) => (item._id === merged._id ? merged : item)),
    );
  };

  const handleAction = async (actionFn) => {
    setActionError("");
    setIsSaving(true);
    try {
      const updated = await actionFn();
      syncUpdatedCase(updated);
      setRejectNotes("");
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

  if (cases.length === 0) {
    return (
      <Box sx={{ p: 4, textAlign: "center" }}>
        <Typography>No CSW cases found for your center.</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 4, maxWidth: 1000, mx: "auto" }}>
      <Typography variant="h4" component="h1" gutterBottom>
        CSW Cases Queue
      </Typography>
      <Stack direction={{ xs: "column", md: "row" }} spacing={4}>
        {/* Lijeva strana: Lista predmeta */}
        <Box sx={{ flex: 1 }}>
          <Card variant="outlined">
            <List disablePadding>
              {cases.map((c, index) => {
                const baby = c.babyId || {};
                return (
                  <Box key={c._id}>
                    {index > 0 && <Divider />}
                    <ListItemButton
                      selected={selectedCase?._id === c._id}
                      onClick={() => handleSelectCase(c)}
                    >
                      <ListItemText
                        primary={
                          <Typography variant="subtitle1">
                            {baby.firstName || "Proposed Name"}{" "}
                            {baby.lastName || ""}
                          </Typography>
                        }
                        secondary={
                          <Box component="span" sx={{ display: "block", mt: 0.5 }}>
                            {baby.jmbg && (
                              <Typography
                                variant="body2"
                                component="span"
                                sx={{ display: "flex", alignItems: "center" }}
                              >
                                JMBG: {baby.jmbg} <DemoBadge />
                              </Typography>
                            )}
                            <Typography variant="body2" component="span" display="block">
                              Created: {formatDate(c.createdAt)}
                            </Typography>
                            <Box component="span" sx={{ display: "inline-block", mt: 1 }}>
                              <StatusBadge status={c.status} />
                            </Box>
                          </Box>
                        }
                      />
                    </ListItemButton>
                  </Box>
                );
              })}
            </List>
          </Card>
        </Box>

        {/* Desna strana: Detalji predmeta i akcije */}
        <Box sx={{ flex: 1 }}>
          {selectedCase ? (
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Case Details
                </Typography>
                <Box sx={{ mb: 1 }}>
                  <StatusBadge status={selectedCase.status} />
                </Box>

                {selectedCase.socialCardNumber && (
                  <Typography
                    variant="body2"
                    sx={{ display: "flex", alignItems: "center", mt: 1 }}
                  >
                    Social Card Number: {selectedCase.socialCardNumber}
                    <DemoBadge />
                  </Typography>
                )}

                {selectedCase.notes && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Notes: {selectedCase.notes}
                  </Typography>
                )}

                <Divider sx={{ my: 2 }} />

                <Typography variant="subtitle2">Baby Civil Data</Typography>
                <Typography variant="body2">
                  First Name: {selectedCase.babyId?.firstName || "N/A"}
                </Typography>
                <Typography variant="body2">
                  Last Name: {selectedCase.babyId?.lastName || "N/A"}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{ display: "flex", alignItems: "center", my: 0.5 }}
                >
                  JMBG: {selectedCase.babyId?.jmbg || "Pending"}
                  {selectedCase.babyId?.jmbg && <DemoBadge />}
                </Typography>
                <Typography variant="body2">
                  Gender: {selectedCase.babyId?.gender || "N/A"}
                </Typography>
                <Typography variant="body2">
                  Birth Date: {formatDate(selectedCase.babyId?.birthDateTime)}
                </Typography>

                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle2">Parents Information</Typography>
                <Typography variant="body2">
                  Mother: {selectedCase.babyId?.mother?.firstName}{" "}
                  {selectedCase.babyId?.mother?.lastName} (
                  {selectedCase.babyId?.mother?.email})
                </Typography>
                {selectedCase.babyId?.father?.firstName && (
                  <Typography variant="body2">
                    Father: {selectedCase.babyId?.father?.firstName}{" "}
                    {selectedCase.babyId?.father?.lastName}
                  </Typography>
                )}

                {actionError && (
                  <Alert severity="error" sx={{ mt: 2 }}>
                    {actionError}
                  </Alert>
                )}

                {/* Sekcija sa dugmadima za obradu predmeta (Start, Complete, Reject) */}
                <Box sx={{ mt: 3, display: "flex", gap: 2, flexWrap: "wrap" }}>
                  {selectedCase.status === "received" && (
                    <Button
                      variant="contained"
                      color="primary"
                      disabled={isSaving}
                      onClick={() =>
                        handleAction(() => startCswCase(selectedCase._id))
                      }
                    >
                      Start Case
                    </Button>
                  )}

                  {selectedCase.status === "in_progress" && (
                    <>
                      <Button
                        variant="contained"
                        color="success"
                        disabled={isSaving}
                        onClick={() =>
                          handleAction(() => completeCswCase(selectedCase._id))
                        }
                      >
                        Complete & Issue Social Card
                      </Button>

                      <Box sx={{ display: "flex", gap: 1, width: "100%", mt: 1 }}>
                        <TextField
                          label="Rejection Reason"
                          size="small"
                          fullWidth
                          value={rejectNotes}
                          onChange={(e) => setRejectNotes(e.target.value)}
                          placeholder="Enter reason for rejection..."
                        />
                        <Button
                          variant="outlined"
                          color="error"
                          disabled={isSaving || !rejectNotes.trim()}
                          onClick={() =>
                            handleAction(() =>
                              rejectCswCase(selectedCase._id, rejectNotes),
                            )
                          }
                        >
                          Reject
                        </Button>
                      </Box>
                    </>
                  )}
                </Box>
              </CardContent>
            </Card>
          ) : (
            <Card
              variant="outlined"
              sx={{ p: 4, textAlign: "center", bgcolor: "action.hover" }}
            >
              <Typography color="text.secondary">
                Select a case from the list to view baby and parent details.
              </Typography>
            </Card>
          )}
        </Box>
      </Stack>
    </Box>
  );
}