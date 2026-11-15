import { Chip } from "@mui/material";
import { STATUS_COLORS, STATUS_LABELS } from "../../constants/labels";

// <StatusBadge status="in_progress" /> shows "In progress".
// The label is always written out, so colour is never the only signal.
export default function StatusBadge({ status }) {
  return (
    <Chip
      label={STATUS_LABELS[status] || status}
      color={STATUS_COLORS[status] || "default"}
      size="small"
    />
  );
}
