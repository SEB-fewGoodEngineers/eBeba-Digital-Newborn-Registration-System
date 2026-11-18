import { useEffect, useState } from "react";
import { Link as RouterLink, useParams } from "react-router";
import {
  Alert,
  Box,
  Button,
  Card,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";

import { getBabyGrowth } from "../../services/pediatricianService";
import { formatDate } from "../../utils/dates";

const DAY_MS = 24 * 60 * 60 * 1000;

// "12 days" or "5 weeks"
const formatAge = (birthDateTime, measuredAt) => {
  const days = Math.max(
    0,
    Math.floor((new Date(measuredAt) - new Date(birthDateTime)) / DAY_MS),
  );
  if (days < 28) return `${days} ${days === 1 ? "day" : "days"}`;
  const weeks = Math.floor(days / 7);
  return `${weeks} weeks`;
};

const formatKg = (grams) => (grams ? `${(grams / 1000).toFixed(2)} kg` : "–");
const formatCm = (cm) => (cm ? `${cm} cm` : "–");

// "+450 g" since the row before
const formatChange = (grams, previousGrams) => {
  if (!grams || !previousGrams) return "–";
  const change = grams - previousGrams;
  return `${change >= 0 ? "+" : ""}${change} g`;
};

// The birth values (from the birth record) come first, then the measurements.
const buildRows = (baby, measurements) => {
  const rows = [];
  if (baby.birthWeightGrams || baby.birthLengthCm) {
    rows.push({
      key: "birth",
      label: "At birth",
      date: baby.birthDateTime,
      weightGrams: baby.birthWeightGrams,
      heightCm: baby.birthLengthCm,
    });
  }
  for (const m of measurements) {
    rows.push({
      key: m._id,
      label: formatAge(baby.birthDateTime, m.measuredAt),
      date: m.measuredAt,
      weightGrams: m.weightGrams,
      heightCm: m.heightCm,
      headCircumferenceCm: m.headCircumferenceCm,
    });
  }
  return rows;
};

const babyName = (baby) =>
  [baby.firstName, baby.lastName].filter(Boolean).join(" ") || "Baby";

// STORY 4.7 - PEDIATRICIAN SEES GROWTH (read-only, data from Epic 5)
export default function PediatricianGrowthPage() {
  const { babyId } = useParams();
  const [data, setData] = useState(null);
  const [status, setStatus] = useState("loading"); // "loading" | "error" | "ready"
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false; // stops an old request from overwriting new data

    getBabyGrowth(babyId)
      .then((result) => {
        if (!ignore) {
          setData(result);
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
  }, [babyId]);

  const renderContent = () => {
    if (status === "loading") {
      return <CircularProgress aria-label="Loading" />;
    }

    if (status === "error") {
      return <Alert severity="error">{error}</Alert>;
    }

    if (data.measurements.length === 0) {
      return (
        <Alert severity="info">
          No growth measurements yet. Parents add them in BabyCare.
        </Alert>
      );
    }

    const rows = buildRows(data.baby, data.measurements);

    return (
      <TableContainer component={Card} variant="outlined">
        <Table size="small" aria-label="Growth measurements">
          <TableHead>
            <TableRow>
              <TableCell>Age</TableCell>
              <TableCell>Date</TableCell>
              <TableCell align="right">Weight</TableCell>
              <TableCell align="right">Change</TableCell>
              <TableCell align="right">Length</TableCell>
              <TableCell align="right">Head</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row, index) => (
              <TableRow key={row.key}>
                <TableCell>{row.label}</TableCell>
                <TableCell>{formatDate(row.date)}</TableCell>
                <TableCell align="right">{formatKg(row.weightGrams)}</TableCell>
                <TableCell align="right">
                  {index === 0
                    ? "–"
                    : formatChange(
                        row.weightGrams,
                        rows[index - 1].weightGrams,
                      )}
                </TableCell>
                <TableCell align="right">{formatCm(row.heightCm)}</TableCell>
                <TableCell align="right">
                  {formatCm(row.headCircumferenceCm)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  return (
    <Box sx={{ maxWidth: 960, mx: "auto", p: { xs: 2, sm: 3 } }}>
      <Button component={RouterLink} to="/pediatrician/babies" sx={{ mb: 2 }}>
        Back to my babies
      </Button>

      <Typography variant="h4" component="h1" gutterBottom>
        Growth{data ? ` — ${babyName(data.baby)}` : ""}
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Measurements entered by the parents (read-only). Demo data only.
      </Typography>

      {renderContent()}
    </Box>
  );
}
