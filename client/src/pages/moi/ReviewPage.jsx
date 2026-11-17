import { useEffect, useState } from "react";
import { useParams } from "react-router";
import PrecheckPanel from "../../components/PrecheckPanel/PrecheckPanel";
import { runPrecheck, decideFlag } from "../../services/aiSuggestionService";
import {
  approveRegistration as approveRegistrationApi,
  getRegistrationReview,
  returnRegistration as returnRegistrationApi,
  rejectRegistration as rejectRegistrationApi,
} from "../../services/registrationService";
import TextField from "@mui/material/TextField"; // or add TextField to the existing MUI import block
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  Grid,
  Stack,
  Typography,
} from "@mui/material";
import { formatDateTime } from "../../utils/dates";
import StatusBadge from "../../components/StatusBadge/StatusBadge";
import DemoBadge from "../../components/DemoBadge/DemoBadge";
import StatusTimeline from "../../components/StatusTimeline/StatusTimeline";

// Show "value" or "—". Used everywhere so an empty field is never "undefined".
const orDash = (v) => (v === undefined || v === null || v === "" ? "—" : v);

// Two values side by side. If they differ, the line is marked with a warning
// icon AND the word "differs" — colour alone is not enough (CONVENTIONS §7).
function CompareRow({ label, proposed, record }) {
  const differs =
    String(proposed ?? "").trim() !== String(record ?? "").trim() &&
    proposed !== undefined &&
    record !== undefined;
  return (
    <Grid container spacing={1} sx={{ py: 0.5 }}>
      <Grid item xs={4}>
        <Typography variant="body2" color="text.secondary">
          {label}
        </Typography>
      </Grid>
      <Grid item xs={4}>
        <Typography variant="body2">
          {orDash(proposed)}
          {differs && (
            <Typography
              component="span"
              variant="caption"
              color="warning.main"
              sx={{ ml: 1 }}
            >
              (differs)
            </Typography>
          )}
        </Typography>
      </Grid>
      <Grid item xs={4}>
        <Typography variant="body2">{orDash(record)}</Typography>
      </Grid>
    </Grid>
  );
}

export default function ReviewPage() {
  const { registrationId } = useParams();

  // loading | error | ready
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  const [data, setData] = useState(null);

  // Approve flow
  const [approveOpen, setApproveOpen] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [approveError, setApproveError] = useState("");
  const [approved, setApproved] = useState(null); // { jmbg, certificateNumber, … }
  const [returnOpen, setReturnOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [decisionNote, setDecisionNote] = useState("");
  const [decisionError, setDecisionError] = useState("");
  const [isSubmittingDecision, setIsSubmittingDecision] = useState(false);
  const [decisionDone, setDecisionDone] = useState(null); // { type, status }
  const [suggestion, setSuggestion] = useState(null); // latest aiSuggestions doc
  const [isRunningPrecheck, setIsRunningPrecheck] = useState(false);
  const [precheckError, setPrecheckError] = useState("");
  const [isDecidingFlag, setIsDecidingFlag] = useState(false);

  useEffect(() => {
    let ignore = false;
    getRegistrationReview(registrationId)
      .then((d) => {
        if (ignore) return;
        setData(d);
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
  }, [registrationId]);

  const handleConfirmApprove = async () => {
    setApproveError("");
    setIsApproving(true);
    try {
      const result = await approveRegistrationApi(registrationId);
      setApproved(result);
      // reflect the new status on the page without a full reload
      setData((d) =>
        d
          ? {
              ...d,
              registration: { ...d.registration, status: "approved" },
            }
          : d,
      );
      setApproveOpen(false);
    } catch (err) {
      setApproveError(err.message);
    } finally {
      setIsApproving(false);
    }
  };

  const handleRunPrecheck = async () => {
    setPrecheckError("");
    setIsRunningPrecheck(true);
    try {
      const result = await runPrecheck(registrationId);
      setSuggestion(result);
    } catch (err) {
      setPrecheckError(err.message);
    } finally {
      setIsRunningPrecheck(false);
    }
  };

  const handleDecideFlag = async (flagId, decision) => {
    setPrecheckError("");
    setIsDecidingFlag(true);
    try {
      const updated = await decideFlag(suggestion._id, flagId, decision);
      // Prefer the server's response if it returns the updated suggestion.
      // If it returns only the flag, merge locally.
      if (updated && updated.flags) {
        setSuggestion(updated);
      } else {
        setSuggestion((prev) =>
          prev
            ? {
                ...prev,
                flags: prev.flags.map((f) =>
                  f._id === flagId ? { ...f, decision } : f,
                ),
              }
            : prev,
        );
      }
    } catch (err) {
      setPrecheckError(err.message);
    } finally {
      setIsDecidingFlag(false);
    }
  };

  if (status === "loading") {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 6 }}>
        <CircularProgress aria-label="Loading" />
      </Box>
    );
  }
  if (status === "error") {
    return (
      <Box sx={{ maxWidth: 1200, mx: "auto", mt: 4, px: 2 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  const openReturn = () => {
    setDecisionNote("");
    setDecisionError("");
    setReturnOpen(true);
  };
  const openReject = () => {
    setDecisionNote("");
    setDecisionError("");
    setRejectOpen(true);
  };

  const submitDecision = async (kind) => {
    setDecisionError("");
    if (!decisionNote.trim()) {
      setDecisionError("Please write a note for the parent.");
      return;
    }
    setIsSubmittingDecision(true);
    try {
      if (kind === "return") {
        await returnRegistrationApi(registrationId, decisionNote.trim());
      } else {
        await rejectRegistrationApi(registrationId, decisionNote.trim());
      }
      setDecisionDone({
        type: kind,
        status: kind === "return" ? "returned" : "rejected",
      });
      setData((d) =>
        d
          ? {
              ...d,
              registration: {
                ...d.registration,
                status: kind === "return" ? "returned" : "rejected",
                reviewerNotes: decisionNote.trim(),
              },
            }
          : d,
      );
      setReturnOpen(false);
      setRejectOpen(false);
    } catch (err) {
      setDecisionError(err.message);
    } finally {
      setIsSubmittingDecision(false);
    }
  };

  const { registration, applicant, baby } = data;
  const motherLast = baby.mother?.lastName;
  const fatherLast = baby.father?.lastName;
  const canDecide = registration.status === "pending";

  return (
    <Box sx={{ maxWidth: 1200, mx: "auto", mt: 4, px: 2 }}>
      <Stack
        direction="row"
        alignItems="center"
        spacing={2}
        sx={{ mb: 2, flexWrap: "wrap" }}
      >
        <Typography variant="h5" component="h1">
          Review application
        </Typography>
        <StatusBadge status={registration.status} />
        {canDecide && (
          <Stack direction="row" spacing={1} sx={{ ml: "auto" }}>
            <Button
              variant="outlined"
              color="warning"
              onClick={openReturn}
              type="button"
            >
              Return for correction
            </Button>
            <Button
              variant="outlined"
              color="error"
              onClick={openReject}
              type="button"
            >
              Reject
            </Button>
            <Button
              variant="contained"
              color="success"
              onClick={() => {
                setApproveError("");
                setApproveOpen(true);
              }}
              type="button"
            >
              Approve
            </Button>
          </Stack>
        )}
      </Stack>

      {approved && (
        <Alert severity="success" sx={{ mb: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Approved. Baby JMBG:
          </Typography>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Typography
              variant="body1"
              sx={{ fontFamily: "monospace", letterSpacing: 1 }}
            >
              {approved.jmbg}
            </Typography>
            <DemoBadge />
          </Stack>
          <Typography variant="caption" display="block" sx={{ mt: 1 }}>
            Certificate: {approved.certificateNumber}
          </Typography>
        </Alert>
      )}

      {decisionDone && (
        <Alert
          severity={decisionDone.type === "return" ? "warning" : "error"}
          sx={{ mb: 2 }}
        >
          {decisionDone.type === "return"
            ? "Application returned to the parent for correction."
            : "Application rejected. This decision is final."}
        </Alert>
      )}

      <Grid container spacing={2}>
        {/* LEFT — the application */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Application
              </Typography>
              <Typography variant="body2">
                <strong>Proposed name:</strong> {registration.proposedFirstName}{" "}
                {registration.proposedLastName}
              </Typography>
              <Typography variant="body2">
                <strong>Address:</strong> {registration.residentialAddress}
              </Typography>
              <Typography variant="body2">
                <strong>Municipality:</strong> {registration.municipality}
              </Typography>
              <Divider sx={{ my: 1.5 }} />
              <Typography variant="body2">
                <strong>Applicant:</strong> {applicant.firstName}{" "}
                {applicant.lastName}
              </Typography>
              <Typography variant="body2">
                <strong>Email:</strong> {applicant.email}
              </Typography>
              <Typography variant="body2">
                <strong>Submitted:</strong>{" "}
                {formatDateTime(registration.createdAt)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* RIGHT — the hospital's birth record */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Birth record
              </Typography>
              <Typography variant="body2">
                <strong>Record number:</strong> {baby.birthRecordNumber}
              </Typography>
              <Typography variant="body2">
                <strong>Born:</strong> {formatDateTime(baby.birthDateTime)}
              </Typography>
              <Typography variant="body2">
                <strong>Place of birth:</strong> {baby.placeOfBirth} (
                {baby.municipalityOfBirth})
              </Typography>
              <Typography variant="body2">
                <strong>Hospital:</strong> {baby.hospital?.name || "—"}
              </Typography>
              <Typography variant="body2">
                <strong>Gender:</strong>{" "}
                {baby.gender === "M" ? "Male" : "Female"}
              </Typography>
              <Typography variant="body2">
                <strong>Weight / length:</strong>{" "}
                {orDash(baby.birthWeightGrams)} g / {orDash(baby.birthLengthCm)}{" "}
                cm
              </Typography>
              <Typography variant="body2">
                <strong>Family type:</strong> {baby.familyType}
              </Typography>

              <Divider sx={{ my: 1.5 }} />
              <Typography variant="subtitle2" gutterBottom>
                Mother
              </Typography>
              <Typography variant="body2">
                {baby.mother
                  ? `${baby.mother.firstName} ${baby.mother.lastName}`
                  : "—"}
              </Typography>
              {baby.mother?.maidenName && (
                <Typography variant="body2">
                  Maiden name: {baby.mother.maidenName}
                </Typography>
              )}
              {baby.mother?.hasJmbg && (
                <Typography variant="body2" sx={{ mt: 0.5 }}>
                  JMBG on file <DemoBadge />
                </Typography>
              )}

              {baby.father && (
                <>
                  <Divider sx={{ my: 1.5 }} />
                  <Typography variant="subtitle2" gutterBottom>
                    Father
                  </Typography>
                  <Typography variant="body2">
                    {baby.father.firstName} {baby.father.lastName}
                  </Typography>
                  {baby.father.hasJmbg && (
                    <Typography variant="body2" sx={{ mt: 0.5 }}>
                      JMBG on file <DemoBadge />
                    </Typography>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* DIFFERENCES — the point of the story: see what does not match */}
      <Card sx={{ mt: 2 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Compare
          </Typography>
          <Grid container spacing={1} sx={{ mb: 0.5 }}>
            <Grid item xs={4} />
            <Grid item xs={4}>
              <Typography variant="caption" color="text.secondary">
                Proposed
              </Typography>
            </Grid>
            <Grid item xs={4}>
              <Typography variant="caption" color="text.secondary">
                Birth record
              </Typography>
            </Grid>
          </Grid>
          <CompareRow
            label="Last name (mother)"
            proposed={registration.proposedLastName}
            record={motherLast}
          />
          <CompareRow
            label="Last name (father)"
            proposed={registration.proposedLastName}
            record={fatherLast}
          />
          <CompareRow
            label="Municipality"
            proposed={registration.municipality}
            record={baby.municipalityOfBirth}
          />
        </CardContent>
      </Card>

      <PrecheckPanel
        suggestion={suggestion}
        onRun={handleRunPrecheck}
        onDecide={handleDecideFlag}
        isRunning={isRunningPrecheck}
        isDeciding={isDecidingFlag}
        error={precheckError}
      />

            <PrecheckPanel
        suggestion={suggestion}
        onRun={handleRunPrecheck}
        onDecide={handleDecideFlag}
        isRunning={isRunningPrecheck}
        isDeciding={isDecidingFlag}
        error={precheckError}
      />

      <Card sx={{ mt: 2 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Application history
          </Typography>
          <StatusTimeline history={registration.statusHistory} />
        </CardContent>
      </Card>

      <Dialog
        open={approveOpen}
        onClose={() => !isApproving && setApproveOpen(false)}
        aria-labelledby="approve-dialog-title"
      >
        <DialogTitle id="approve-dialog-title">
          Approve this application?
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            This will assign a JMBG to the baby and start the CSW and FZO
            process. It cannot be undone.
          </DialogContentText>
          {approveError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {approveError}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setApproveOpen(false)}
            disabled={isApproving}
            type="button"
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="success"
            onClick={handleConfirmApprove}
            disabled={isApproving}
            type="button"
          >
            {isApproving ? "Approving…" : "Approve"}
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={returnOpen}
        onClose={() => !isSubmittingDecision && setReturnOpen(false)}
        aria-labelledby="return-dialog-title"
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle id="return-dialog-title">
          Return for correction
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            The parent can edit the application and resubmit it. The note is
            required.
          </DialogContentText>
          <TextField
            label="Note to the parent"
            value={decisionNote}
            onChange={(e) => setDecisionNote(e.target.value)}
            multiline
            minRows={3}
            fullWidth
            required
            autoFocus
            error={Boolean(decisionError)}
            helperText={decisionError || "Explain what needs to change."}
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setReturnOpen(false)}
            disabled={isSubmittingDecision}
            type="button"
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="warning"
            onClick={() => submitDecision("return")}
            disabled={isSubmittingDecision}
            type="button"
          >
            {isSubmittingDecision ? "Sending…" : "Return"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={rejectOpen}
        onClose={() => !isSubmittingDecision && setRejectOpen(false)}
        aria-labelledby="reject-dialog-title"
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle id="reject-dialog-title">
          Reject this application?
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Are you sure? This is final. The parent cannot resubmit a rejected
            application.
          </DialogContentText>
          <TextField
            label="Note to the parent"
            value={decisionNote}
            onChange={(e) => setDecisionNote(e.target.value)}
            multiline
            minRows={3}
            fullWidth
            required
            autoFocus
            error={Boolean(decisionError)}
            helperText={decisionError || "Explain why this is rejected."}
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setRejectOpen(false)}
            disabled={isSubmittingDecision}
            type="button"
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => submitDecision("reject")}
            disabled={isSubmittingDecision}
            type="button"
          >
            {isSubmittingDecision ? "Rejecting…" : "Reject"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
