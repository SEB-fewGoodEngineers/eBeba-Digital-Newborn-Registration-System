import { Link as RouterLink } from "react-router";
import { Box, Button, Stack, Typography } from "@mui/material";

export default function LandingPage() {
  return (
    <Box sx={{ maxWidth: 720, mx: "auto", mt: 8, px: 2 }}>
      <Typography variant="h3" component="h1" gutterBottom>
        eBeba
      </Typography>
      <Typography
        variant="h6"
        component="p"
        color="text.secondary"
        gutterBottom
      >
        Register your newborn once, online. Follow every step at MoI, the Social
        Work Center and the Health Insurance Fund in one place.
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Demonstration project. All people, institutions and numbers are
        fictional.
      </Typography>
      <Stack direction="row" spacing={2}>
        <Button variant="contained" component={RouterLink} to="/sign-in">
          Sign in
        </Button>
        <Button variant="outlined" component={RouterLink} to="/sign-up">
          Create a parent account
        </Button>
      </Stack>
    </Box>
  );
}
