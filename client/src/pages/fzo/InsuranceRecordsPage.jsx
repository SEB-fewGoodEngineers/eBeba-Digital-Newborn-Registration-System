import React, { useEffect, useState } from "react";
import { Container, Typography, Paper, List, ListItem, ListItemText, Button, Box } from "@mui/material";

export default function InsuranceRecordsPage() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchRecords = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`${import.meta.env.VITE_BACK_END_SERVER_URL}/insurance-records`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Failed to fetch insurance records.");
        const data = await res.json();
        setRecords(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchRecords();
  }, []);

  // Funkcija za preuzimanje PDF-a direktno preko API-ja
  const handleDownloadPdf = async (babyId) => {
    try {
      if (!babyId) {
        alert("ID bebe nije pronađen za ovaj zapis.");
        return;
      }

      const token = localStorage.getItem("token");
      const BASE_URL = import.meta.env.VITE_BACK_END_SERVER_URL;
      
      const res = await fetch(`${BASE_URL}/babies/${babyId}/insurance-card/pdf`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.err || "Neuspešno preuzimanje PDF zdravstvene kartice.");
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) return <Container sx={{ mt: 4 }}><Typography>Učitavanje FZO zapisa...</Typography></Container>;
  if (error) return <Container sx={{ mt: 4 }}><Typography color="error">{error}</Typography></Container>;

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Typography variant="h4" gutterBottom>
        FZO Insurance Records
      </Typography>
      <Paper elevation={2}>
        <List>
          {records.length === 0 ? (
            <ListItem><ListItemText primary="Nema pronađenih FZO zapisa." /></ListItem>
          ) : (
            records.map((record) => {
              // Podržava i string ID i objekat ukoliko je populisan sa servera
              const babyId = record.babyId?._id || record.babyId || record.baby;

              return (
                <ListItem key={record._id} divider>
                  <ListItemText
                    primary={`ID Bebe: ${babyId || "N/A"} - Status: ${record.status}`}
                    secondary={`Filijala: ${record.fundBranchId || "N/A"}`}
                  />
                  <Box sx={{ display: "flex", gap: 1 }}>
                    <Button
                      variant="contained"
                      color="primary"
                      size="small"
                      onClick={() => handleDownloadPdf(babyId)}
                    >
                      Preuzmi PDF Karticu
                    </Button>
                  </Box>
                </ListItem>
              );
            })
          )}
        </List>
      </Paper>
    </Container>
  );
}