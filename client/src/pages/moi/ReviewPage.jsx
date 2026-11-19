import { useEffect, useState } from "react";
import { useParams } from "react-router";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  FormControlLabel,
  Grid,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

import PrecheckPanel from "../../components/PrecheckPanel/PrecheckPanel";
import StatusBadge from "../../components/StatusBadge/StatusBadge";
import StatusTimeline from "../../components/StatusTimeline/StatusTimeline";
import DemoBadge from "../../components/DemoBadge/DemoBadge";

import {
  approveRegistration as approveRegistrationApi,
  getRegistrationReview,
  returnRegistration as returnRegistrationApi,
  rejectRegistration as rejectRegistrationApi,
  signCertificate,
} from "../../services/registrationService";
import { runPrecheck, decideFlag } from "../../services/aiSuggestionService";
import {
  localKeyMatches,
  registerSigningKey,
  signApprovalPayload,
} from "../../services/signingKey";
import { api } from "../../services/api";
import { useUser } from "../../contexts/UserContext";
import { formatDateTime } from "../../utils/dates";

const orDash = (v) => (v === undefined || v === null || v === "" ? "—" : v);

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
  const { user, setUser } = useUser();

  // loading | error | ready
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  const [data, setData] = useState(null);

  // Approve result (JMBG, certificate number, certificate id)
  const [approved, setApproved] = useState(null);
  const [isApproving, setIsApproving] = useState(false);
  const [approveError, setApproveError] = useState("");

  // Signing-key registration
  const [signingKeyReady, setSigningKeyReady] = useState(null); // null | true | false
  const [keyDialogOpen, setKeyDialogOpen] = useState(false);
  const [keyPassphrase, setKeyPassphrase] = useState("");
  const [keyConfirmPassphrase, setKeyConfirmPassphrase] = useState("");
  const [keyError, setKeyError] = useState("");
  const [keySubmitting, setKeySubmitting] = useState(false);

  // Sign-approval dialog
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [approvePassphrase, setApprovePassphrase] = useState("");
  const [approveConfirm, setApproveConfirm] = useState(false);

  // Return / Reject
  const [returnOpen, setReturnOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [decisionNote, setDecisionNote] = useState("");
  const [decisionError, setDecisionError] = useState("");
  const [isSubmittingDecision, setIsSubmittingDecision] = useState(false);
  const [decisionDone, setDecisionDone] = useState(null);

  // Pre-check
  const [suggestion, setSuggestion] = useState(null);
  const [isRunningPrecheck, setIsRunningPrecheck] = useState(false);
  const [precheckError, setPrecheckError] = useState("");
  const [isDecidingFlag, setIsDecidingFlag] = useState(false);

  // Sign certificate (PDF)
  const [certificateSigned, setCertificateSigned] = useState(false);
  const [signError, setSignError] = useState("");
  const [isSigning, setIsSigning] = useState(false);

  // Fetch the review data. <ReviewPage key={registrationId}> in App.jsx
  // remounts on id change, so state is fresh per registration.
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

  // Ready only if this browser holds the key the server has on file for this officer.
  useEffect(() => {
    localKeyMatches(user._id, user.signingPublicKey)
      .then(setSigningKeyReady)
      .catch(() => setSigningKeyReady(false));
  }, [user._id, user.signingPublicKey]);

  const handleOpenKeyDialog = () => {
    setKeyPassphrase("");
    setKeyConfirmPassphrase("");
    setKeyError("");
    setKeyDialogOpen(true);
  };

  const handleSubmitKey = async () => {
    if (keyPassphrase.length < 8) {
      setKeyError("Passphrase must be at least 8 characters.");
      return;
    }
    if (keyPassphrase !== keyConfirmPassphrase) {
      setKeyError("Passphrases do not match.");
      return;
    }
    setKeySubmitting(true);
    setKeyError("");
    try {
      const publicJwk = await registerSigningKey(user._id, keyPassphrase);
      await api("/users/me/signing-key", {
        method: "POST",
        body: { publicJwk },
      });
      setUser({ ...user, signingPublicKey: publicJwk });
      setSigningKeyReady(true);
      setKeyDialogOpen(false);
    } catch (err) {
      setKeyError(err.details?.[0]?.message || err.message);
    } finally {
      setKeySubmitting(false);
    }
  };

  const handleOpenApprove = () => {
    setApprovePassphrase("");
    setApproveConfirm(false);
    setApproveError("");
    setApproveDialogOpen(true);
  };

  const handleSignAndApprove = async () => {
    if (!approveConfirm) {
      setApproveError("Please check the confirmation box.");
      return;
    }
    setApproveError("");
    setIsApproving(true);
    try {
      const payload = {
        registrationId,
        decision: "approve",
        officerId: String(user._id),
        issuedAt: new Date().toISOString(),
      };
      const { signature, payload: signedPayload } = await signApprovalPayload(
        user._id,
        approvePassphrase,
        payload,
      );
      const result = await approveRegistrationApi(registrationId, {
        signature,
        payload: signedPayload,
      });
      setApproved(result);
      setData((d) =>
        d
          ? { ...d, registration: { ...d.registration, status: "approved" } }
          : d,
      );
      setApproveDialogOpen(false);
    } catch (err) {
      setApproveError(err.message);
    } finally {
      setIsApproving(false);
    }
  };

  const handleSignCertificate = async () => {
    if (!approved?.certificateId) return;
    setSignError("");
    setIsSigning(true);
    try {
      await signCertificate(approved.certificateId);
      setCertificateSigned(true);
    } catch (err) {
      setSignError(err.message);
    } finally {
      setIsSigning(false);
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
                if (signingKeyReady === true) {
                  handleOpenApprove();
                } else {
                  handleOpenKeyDialog();
                }
              }}
              disabled={signingKeyReady === null}
              type="button"
            >
              {signingKeyReady === false
                ? "Register signing key to approve"
                : "Approve"}
            </Button>
          </Stack>
        )}
      </Stack>

      {approved && (
        <Alert severity="success" sx={{ mb: 2 }}>
          <Stack
            direction="row"
            alignItems="center"
            spacing={1}
            sx={{ mb: 1, flexWrap: "wrap" }}
          >
            <Typography variant="subtitle2">Approved.</Typography>
            <Typography
              variant="body2"
              sx={{ fontFamily: "monospace", letterSpacing: 1 }}
            >
              {approved.jmbg}
            </Typography>
            <DemoBadge />
          </Stack>

          {approved.certificateNumber && (
            <Typography variant="caption" display="block" sx={{ mb: 1 }}>
              Certificate: {approved.certificateNumber}
            </Typography>
          )}

          {approved.certificateId && (
            <Box sx={{ mt: 1 }}>
              <Button
                variant="outlined"
                onClick={handleSignCertificate}
                disabled={isSigning || certificateSigned}
                type="button"
              >
                {certificateSigned
                  ? "Certificate signed"
                  : isSigning
                    ? "Signing…"
                    : "Sign certificate"}
              </Button>
              {signError && (
                <Alert severity="error" sx={{ mt: 1 }}>
                  {signError}
                </Alert>
              )}
            </Box>
          )}
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

      <Card sx={{ mt: 2 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Application history
          </Typography>
          <StatusTimeline history={registration.statusHistory} />
        </CardContent>
      </Card>

      {/* ── Register signing key dialog ─────────────────────────────── */}
      <Dialog
        open={keyDialogOpen}
        onClose={keySubmitting ? undefined : () => setKeyDialogOpen(false)}
        aria-labelledby="key-dialog-title"
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle id="key-dialog-title">
          Register your signing key
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            This key is created in this browser and stored only on this device.
            It is wrapped with a key derived from your passphrase (PBKDF2). The
            passphrase never leaves this device. You will enter it each time you
            approve an application.
          </DialogContentText>
          <TextField
            label="Passphrase"
            type="password"
            value={keyPassphrase}
            onChange={(e) => setKeyPassphrase(e.target.value)}
            fullWidth
            required
            autoFocus
            sx={{ mb: 2 }}
            error={Boolean(keyError) && keyPassphrase.length < 8}
            helperText="At least 8 characters."
          />
          <TextField
            label="Confirm passphrase"
            type="password"
            value={keyConfirmPassphrase}
            onChange={(e) => setKeyConfirmPassphrase(e.target.value)}
            fullWidth
            required
            error={
              Boolean(keyConfirmPassphrase) &&
              keyPassphrase !== keyConfirmPassphrase
            }
            helperText={
              keyConfirmPassphrase && keyPassphrase !== keyConfirmPassphrase
                ? "Passphrases do not match."
                : " "
            }
          />
          {keyError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {keyError}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setKeyDialogOpen(false)}
            disabled={keySubmitting}
            type="button"
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSubmitKey}
            disabled={keySubmitting}
            type="button"
          >
            {keySubmitting ? "Registering…" : "Register key"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Sign-approval dialog ────────────────────────────────────── */}
      <Dialog
        open={approveDialogOpen}
        onClose={isApproving ? undefined : () => setApproveDialogOpen(false)}
        aria-labelledby="sign-approve-title"
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle id="sign-approve-title">Sign this approval</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Enter your passphrase to sign the approval with your key. The
            signature is verified on the server and stored in the audit log.
            This action is final.
          </DialogContentText>
          <TextField
            label="Passphrase"
            type="password"
            value={approvePassphrase}
            onChange={(e) => setApprovePassphrase(e.target.value)}
            fullWidth
            required
            autoFocus
            sx={{ mb: 2 }}
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={approveConfirm}
                onChange={(e) => setApproveConfirm(e.target.checked)}
              />
            }
            label="I confirm I have reviewed this application and I approve it."
          />
          {approveError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {approveError}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setApproveDialogOpen(false)}
            disabled={isApproving}
            type="button"
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="success"
            onClick={handleSignAndApprove}
            disabled={isApproving}
            type="button"
          >
            {isApproving ? "Signing…" : "Sign and approve"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Return dialog ───────────────────────────────────────────── */}
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

      {/* ── Reject dialog ───────────────────────────────────────────── */}
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
