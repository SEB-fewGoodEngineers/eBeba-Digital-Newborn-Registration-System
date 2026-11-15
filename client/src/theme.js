import { createTheme } from "@mui/material/styles";

// The one theme for the whole app. Change colours and fonts here only.
const theme = createTheme({
  palette: {
    primary: { main: "#1d4ed8" },
    secondary: { main: "#15803d" },
  },
  typography: {
    // System fonts: no font download, and č ć š ž đ always display correctly
    fontFamily: 'system-ui, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  },
  shape: { borderRadius: 8 },
});

export default theme;
