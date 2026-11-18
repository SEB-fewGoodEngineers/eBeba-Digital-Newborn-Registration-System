import { useEffect, useState } from "react";
import { Link as RouterLink } from "react-router";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Stack,
  Typography,
} from "@mui/material";
import { useUser } from "../../contexts/UserContext";
import { subscribeToNotifications } from "../../services/socket";
import {
  addNotification,
  getNotifications,
  isInternalLink,
} from "../../services/notificationService";
import { formatDateTime } from "../../utils/dates";

const DEMO_SENDER = "eBeba <no-reply@ebeba.demo>";

// A channel is on unless it is turned off. Live notifications from the
// socket have no "channels" field; the model's default is "on".
const isChannelOn = (notification, channel) =>
  notification.channels?.[channel] !== false;

// One notification shown as the "email" it would send.
function DemoEmail({ notification, recipient }) {
  return (
    <Box>
      <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 1 }}>
        <Chip
          label="DEMO EMAIL"
          size="small"
          color="warning"
          variant="outlined"
        />
        <Typography variant="body2" color="text.secondary">
          Not sent
        </Typography>
      </Stack>
      <Typography variant="body2">
        <strong>From:</strong> {DEMO_SENDER}
      </Typography>
      <Typography variant="body2">
        <strong>To:</strong> {recipient}
      </Typography>
      <Typography variant="body2" sx={{ mb: 1 }}>
        <strong>Subject:</strong> {notification.title}
      </Typography>
      <Typography sx={{ mb: 1 }}>{notification.message}</Typography>
      {isInternalLink(notification.link) && (
        <Button
          variant="outlined"
          size="small"
          component={RouterLink}
          to={notification.link}
        >
          Open in eBeba
        </Button>
      )}
    </Box>
  );
}

// One notification shown as the "SMS" it would send.
function DemoSms({ notification, recipient }) {
  return (
    <Box>
      <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 1 }}>
        <Chip
          label="DEMO SMS"
          size="small"
          color="warning"
          variant="outlined"
        />
        <Typography variant="body2" color="text.secondary">
          Not sent
        </Typography>
      </Stack>
      <Typography variant="body2" sx={{ mb: 1 }}>
        <strong>To:</strong> {recipient}
      </Typography>
      <Box
        sx={{
          bgcolor: "action.hover",
          borderRadius: 2,
          px: 1.5,
          py: 1,
          maxWidth: 360,
        }}
      >
        <Typography variant="body2">
          eBeba: {notification.title}. {notification.message}
        </Typography>
      </Box>
    </Box>
  );
}

// N2 - DEMO INBOX: each notification as the email and the SMS it would send.
export default function InboxPage() {
  const { user } = useUser();
  const [notifications, setNotifications] = useState([]);
  const [status, setStatus] = useState("loading"); // "loading" | "error" | "ready"
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false; // stops an old request from overwriting new data

    getNotifications()
      .then((data) => {
        if (!ignore) {
          setNotifications(data);
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
  }, []);

  // Stay in sync with new notifications.
  useEffect(() => {
    if (!user) return undefined;

    return subscribeToNotifications((notification) => {
      setNotifications((list) => addNotification(list, notification));
    });
  }, [user]);

  const emailRecipient = user?.email || "your email address";
  const smsRecipient = user?.phoneNumber || "your phone number";

  const renderContent = () => {
    if (status === "loading") {
      return <CircularProgress aria-label="Loading" />;
    }

    if (status === "error") {
      return <Alert severity="error">{error}</Alert>;
    }

    if (notifications.length === 0) {
      return <Typography>No messages yet.</Typography>;
    }

    return (
      <Stack spacing={2}>
        {notifications.map((notification) => {
          const showEmail = isChannelOn(notification, "email");
          const showSms = isChannelOn(notification, "sms");

          return (
            <Card key={notification._id} variant="outlined">
              <CardContent>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mb: 2 }}
                >
                  {formatDateTime(notification.createdAt)}
                </Typography>

                <Stack spacing={2} divider={<Divider flexItem />}>
                  {showEmail && (
                    <DemoEmail
                      notification={notification}
                      recipient={emailRecipient}
                    />
                  )}
                  {showSms && (
                    <DemoSms
                      notification={notification}
                      recipient={smsRecipient}
                    />
                  )}
                  {!showEmail && !showSms && (
                    <Typography color="text.secondary">
                      {notification.title}: shown in the app only. No email or
                      SMS for this message.
                    </Typography>
                  )}
                </Stack>
              </CardContent>
            </Card>
          );
        })}
      </Stack>
    );
  };

  return (
    <Box sx={{ maxWidth: 800, mx: "auto", p: { xs: 2, sm: 3 } }}>
      <Typography variant="h4" component="h1" sx={{ mb: 2 }}>
        Demo inbox
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        This is a demonstration. eBeba does not send real emails or SMS. This
        page shows the messages it would send to you.
      </Alert>

      {renderContent()}
    </Box>
  );
}
