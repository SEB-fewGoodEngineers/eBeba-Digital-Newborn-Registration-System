
import { useEffect, useState } from "react";
import { Link as RouterLink } from "react-router";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Stack,
  Typography,
} from "@mui/material";

import DemoBadge from "../../components/DemoBadge/DemoBadge";
import StatusBadge from "../../components/StatusBadge/StatusBadge";
import { getDashboard } from "../../services/dashboardService";
import { getRegistrationByBaby } from "../../services/registrationService";
import { downloadCertificate } from "../../services/certificateService";
import { subscribeToNotifications } from "../../services/socket";
import { formatDateTime } from "../../utils/dates";

export default function DashboardPage() {
  const [babies, setBabies] = useState([]);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");

  const [downloadingId, setDownloadingId] = useState(null);
  const [downloadError, setDownloadError] = useState({});

  useEffect(() => {
    let ignore = false;
    let requestId = 0;

    const loadDashboard = async () => {
      const currentRequest = ++requestId;

      try {
        const data = await getDashboard();

        if (!ignore && currentRequest === requestId) {
          setBabies(data);
          setError("");
          setStatus("ready");
        }
      } catch (err) {
        if (!ignore && currentRequest === requestId) {
          setError(err.message);
          setStatus("error");
        }
      }
    };

    loadDashboard();

    const unsubscribe = subscribeToNotifications(loadDashboard);

    return () => {
      ignore = true;
      unsubscribe();
    };
  }, []);

  async function handleDownloadCertificate(babyId) {
    setDownloadingId(babyId);

    setDownloadError((prev) => ({
      ...prev,
      [babyId]: "",
    }));

    try {
      const registration = await getRegistrationByBaby(babyId);

      const certificate = registration?.certificate;

      if (!certificate?.id || !certificate.pdfGenerated) {
        throw new Error(
          "The certificate has not been signed or generated yet. " +
            "Please contact the MoI officer.",
        );
      }

      await downloadCertificate(certificate.id);
    } catch (err) {
      setDownloadError((prev) => ({
        ...prev,
        [babyId]: err.message || "Could not download certificate.",
      }));
    } finally {
      setDownloadingId(null);
    }
  }

  if (status === "loading") {
    return (
      <Box sx={{ p: 3 }}>
        <CircularProgress aria-label="Loading dashboard" />
      </Box>
    );
  }

  if (status === "error") {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 900, mx: "auto", p: 3 }}>
      <Stack spacing={3}>
        <Typography variant="h4" component="h1">
          Parent Dashboard
        </Typography>

        {babies.length === 0 ? (
          <Stack spacing={2}>
            <Typography>
              No babies linked to your account yet.
            </Typography>

            <Button
              component={RouterLink}
              to="/babies/link"
              variant="contained"
              sx={{ alignSelf: "flex-start" }}
            >
              Link my baby
            </Button>
          </Stack>
        ) : (
          babies.map((baby) => (
            <Card key={baby._id} variant="outlined">
              <CardContent>
                <Stack spacing={2}>
                  <Typography variant="h5" component="h2">
                    {baby.firstName || "Baby"} {baby.lastName || ""}
                  </Typography>

                  <Typography>
                    Birth record: {baby.birthRecordNumber}
                  </Typography>

                  <Typography>
                    Born: {formatDateTime(baby.birthDateTime)}
                  </Typography>

                  <Typography>
                    Gender: {baby.gender}
                  </Typography>

                  <Typography>
                    Place of birth: {baby.placeOfBirth}
                  </Typography>

                  <Typography>
                    Municipality: {baby.municipalityOfBirth}
                  </Typography>

                  <Typography>
                    Birth weight: {baby.birthWeightGrams ?? "N/A"} g
                  </Typography>

                  <Typography>
                    Birth length: {baby.birthLengthCm ?? "N/A"} cm
                  </Typography>

                  {baby.jmbg && (
                    <Stack
                      direction="row"
                      sx={{ alignItems: "center" }}
                    >
                      <Typography>
                        JMBG: {baby.jmbg}
                      </Typography>
                      <DemoBadge />
                    </Stack>
                  )}

                  <Typography variant="h6" component="h3">
                    Registration status
                  </Typography>

                  <Stack spacing={1}>
                    <Stack
                      direction="row"
                      spacing={2}
                      sx={{ alignItems: "center" }}
                    >
                      <Typography>MoI:</Typography>

                      {baby.registrationStatus ? (
                        <StatusBadge
                          status={baby.registrationStatus}
                        />
                      ) : (
                        <Typography>
                          Not submitted
                        </Typography>
                      )}
                    </Stack>

                    {/* Returned application correction */}
                    {baby.registrationStatus === "returned" && (
                      <Alert severity="warning">
                        <Stack spacing={2}>
                          <Typography variant="subtitle1">
                            Action required - Application returned
                          </Typography>

                          <Typography variant="body2">
                            The MoI officer has returned your
                            application for correction. Please review
                            the officer&apos;s comments, correct your
                            application, and submit it again.
                          </Typography>

                          <Button
                            component={RouterLink}
                            to={`/registration/apply?babyId=${baby._id}`}
                            variant="contained"
                            color="warning"
                            sx={{ alignSelf: "flex-start" }}
                          >
                            View Feedback &amp; Correct Application
                          </Button>
                        </Stack>
                      </Alert>
                    )}

                    <Stack
                      direction="row"
                      spacing={2}
                      sx={{ alignItems: "center" }}
                    >
                      <Typography>CSW:</Typography>
                      <StatusBadge status={baby.cswStatus} />
                    </Stack>

                    <Stack
                      direction="row"
                      spacing={2}
                      sx={{ alignItems: "center" }}
                    >
                      <Typography>FZO:</Typography>
                      <StatusBadge
                        status={baby.insuranceStatus}
                      />
                    </Stack>
                  </Stack>

                  <Typography>
                    Pediatrician:{" "}
                    {baby.pediatrician
                      ? `${baby.pediatrician.firstName} ${baby.pediatrician.lastName}`
                      : "Not assigned yet"}
                  </Typography>

                  {/* Download approved certificate */}
                  {baby.isRegistrationApproved && (
                    <Stack
                      spacing={1}
                      sx={{ alignItems: "flex-start" }}
                    >
                      <Button
                        variant="contained"
                        color="success"
                        disabled={downloadingId === baby._id}
                        onClick={() =>
                          handleDownloadCertificate(baby._id)
                        }
                        startIcon={
                          downloadingId === baby._id ? (
                            <CircularProgress
                              size={18}
                              color="inherit"
                            />
                          ) : null
                        }
                      >
                        {downloadingId === baby._id
                          ? "Downloading..."
                          : "Download certificate (PDF)"}
                      </Button>

                      {downloadError[baby._id] && (
                        <Alert
                          severity="warning"
                          sx={{ width: "100%" }}
                        >
                          {downloadError[baby._id]}
                        </Alert>
                      )}

                      <Typography
                        variant="caption"
                        color="text.secondary"
                      >
                        Available after the certificate is signed
                        and generated by the MoI officer.
                      </Typography>
                    </Stack>
                  )}

                  <Stack
                    direction={{ xs: "column", sm: "row" }}
                    spacing={2}
                  >
                    <Button
                      component={RouterLink}
                      to={`/babies/${baby._id}/medical-records`}
                      variant="contained"
                    >
                      BabyHealth
                    </Button>

                    {/* STORY 4.4 - APPOINTMENTS */}
                    <Button
                      component={RouterLink}
                      to={`/babies/${baby._id}/appointments`}
                      variant="outlined"
                    >
                      Check-ups
                    </Button>

                    <Button
                      component={RouterLink}
                      to={`/babies/${baby._id}/care`}
                      variant="outlined"
                    >
                      BabyCare / BabySteps
                    </Button>
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          ))
        )}
      </Stack>
    </Box>
  );
}
