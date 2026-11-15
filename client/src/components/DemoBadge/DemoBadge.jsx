import { Chip } from "@mui/material";

// Shown next to every JMBG and card number: all numbers in eBeba are fictional.
export default function DemoBadge() {
  return (
    <Chip
      label="DEMO"
      size="small"
      color="warning"
      variant="outlined"
      sx={{ ml: 1, fontWeight: 700 }}
      title="Fictional number for demonstration only"
    />
  );
}
