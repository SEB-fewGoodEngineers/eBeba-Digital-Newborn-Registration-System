import Child from "@mui/icons-material/ChildCareOutlined";
import Family from "@mui/icons-material/PeopleOutlined";
import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Card,
  CardContent,
  CircularProgress,
  List,
  ListItemButton,

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
  downloadSocialCardPdf,
} from "../../services/cswService";
import StatusBadge from "../../components/StatusBadge/StatusBadge";
import DemoBadge from "../../components/DemoBadge/DemoBadge";
import { formatDate } from "../../utils/dates";

export default function CswCasesPage() {
  const [search, setSearch] = useState("");
  const [cases, setCases] = useState([]);
  const [selectedCase, setSelectedCase] = useState(null);
  const [status, setStatus] = useState("loading");
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
          setSelectedCase(data[0] || null);
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

  const matches = cases.filter(({ babyId }) => [babyId?.firstName, babyId?.lastName, babyId?.mother?.lastName, babyId?.father?.lastName].filter(Boolean).join(" ").toLowerCase().includes(search.trim().toLowerCase()));

  if (cases.length === 0) {
    return (
      <Box className="panel-page"><h1>Social welfare cases</h1>
        <Typography>No CSW cases found for your center.</Typography>
      </Box>
    );
  }

  return (
    <Box className="panel-page">
      <Typography variant="h4" component="h1" gutterBottom>
        Social welfare cases
      </Typography>
      <p className="panel-description">Manage child and family cases and review benefit eligibility.</p>
      <Stack className="agency-pair" direction={{ xs: "column", md: "row" }} spacing={2}>
        <Box sx={{ flex: 1 }}>
          <Card variant="outlined">
            <TextField fullWidth size="small" label="Search by child or family name" value={search} onChange={(event) => setSearch(event.target.value)} />
            {!matches.length && <p>No matching cases.</p>}
            <List disablePadding>
              {matches.map((c, index) => {
                const baby = c.babyId || {};
                return (
                  <Box key={c._id}>
                    {index > 0 && <Divider />}
                    <ListItemButton
                      disabled={isSaving}
                      selected={selectedCase?._id === c._id}
                      onClick={() => handleSelectCase(c)}
                    >
                      <Family /><span className="row-name"><strong>{[baby.firstName,baby.lastName].filter(Boolean).join(" ") || "Child record"}</strong><small>{baby.mother?.lastName || baby.lastName || "Child"} family</small></span>
                      <StatusBadge status={c.status} />
                    </ListItemButton>
                  </Box>
                );
              })}
            </List>
          </Card>
        </Box>

        <Box sx={{ flex: 1 }}>
          {selectedCase && matches.some((c) => c._id === selectedCase._id) ? (
            <Card variant="outlined">
              <CardContent>
                <div className="detail-heading"><Child /><div><h2>{[selectedCase.babyId?.firstName,selectedCase.babyId?.lastName].filter(Boolean).join(" ") || "Child record"}</h2><small>Child record</small></div></div>
                <div className="family-line"><Family /><div><strong>Family</strong><p>{selectedCase.babyId?.lastName || "Child"} family</p><small>Parent: {selectedCase.babyId?.mother?.firstName} {selectedCase.babyId?.mother?.lastName}</small></div></div>
                <h3>Benefit review</h3>

                <Box sx={{ mb: 1 }}>
                  <StatusBadge status={selectedCase.status} />
                </Box>

                <details className="review-more" key={selectedCase._id}><summary>Review case</summary>
                {selectedCase.socialCardNumber && (
                  <Box sx={{ mt: 1 }}>
                    <Typography
                      variant="body2"
                      component="div"
                      sx={{ display: "flex", alignItems: "center", mb: 1 }}
                    >
                      Social Card Number: {selectedCase.socialCardNumber}
                      <DemoBadge />
                    </Typography>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() =>
                        handleAction(async () => {
                          const babyId =
                            selectedCase.babyId?._id || selectedCase.babyId;
                          await downloadSocialCardPdf(babyId);
                          return selectedCase;
                        })
                      }
                    >
                      Download Social Card (PDF)
                    </Button>
                  </Box>
                )}

                {selectedCase.notes && (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    component="div"
                    sx={{ mt: 1 }}
                  >
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
                  component="div"
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

                      <Box
                        sx={{ display: "flex", gap: 1, width: "100%", mt: 1 }}
                      >
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
                </details>
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