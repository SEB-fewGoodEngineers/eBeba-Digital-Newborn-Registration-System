import { Link as RouterLink } from "react-router";
import { Box, Button, Typography } from "@mui/material";

export default function NotFoundPage() {
  return (
    <Box sx={{ maxWidth: 720, mx: "auto", mt: 8, px: 2 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Page not found
      </Typography>
      <Button variant="contained" component={RouterLink} to="/">
        Go home
      </Button>
    </Box>
  );
}
