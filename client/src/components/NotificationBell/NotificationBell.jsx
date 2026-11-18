import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import {
  Alert,
  Badge,
  Box,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
  ListItemText,
  Menu,
  MenuItem,
  Typography,
} from "@mui/material";
import NotificationsIcon from "@mui/icons-material/Notifications";
import { useUser } from "../../contexts/UserContext";
import { subscribeToNotifications } from "../../services/socket";
import {
  addNotification,
  getNotifications,
  isInternalLink,
  markNotificationRead,
  replaceNotification,
} from "../../services/notificationService";
import { formatDateTime } from "../../utils/dates";

const MENU_ID = "notification-menu";

// The bell in the NavBar: unread count, and the list when clicked.
// NavBar renders it with key={user._id}, so a new user starts with an empty list.
export default function NotificationBell() {
  const { user } = useUser();
  const navigate = useNavigate();

  const [anchorEl, setAnchorEl] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [status, setStatus] = useState("loading"); // "loading" | "error" | "ready"
  const [error, setError] = useState("");
  const [readError, setReadError] = useState("");
  const [savingId, setSavingId] = useState(null);
  const [reloadCount, setReloadCount] = useState(0);

  const isOpen = Boolean(anchorEl);
  const unreadCount = notifications.filter((item) => !item.readAt).length;

  // Load my notifications.
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
  }, [reloadCount]);

  // New notifications arrive live on the shared socket.
  // Depends on "user": UserProvider opens a new socket when the user changes.
  useEffect(() => {
    if (!user) return undefined;

    return subscribeToNotifications((notification) => {
      setNotifications((list) => addNotification(list, notification));
    });
  }, [user]);

  const handleOpen = (event) => {
    setAnchorEl(event.currentTarget);
    setReadError("");

    // Try again if the last load failed.
    if (status === "error") {
      setStatus("loading");
      setReloadCount((count) => count + 1);
    }
  };

  const handleClose = () => setAnchorEl(null);

  // Mark as read, then open the notification's link.
  const handleSelect = async (notification) => {
    setReadError("");

    if (!notification.readAt) {
      setSavingId(notification._id);
      try {
        const updated = await markNotificationRead(notification._id);
        setNotifications((list) => replaceNotification(list, updated));
      } catch (err) {
        setReadError(err.message);
        return;
      } finally {
        setSavingId(null);
      }
    }

    handleClose();

    if (isInternalLink(notification.link)) {
      navigate(notification.link);
    }
  };

  const handleOpenInbox = () => {
    handleClose();
    navigate("/inbox");
  };

  const renderList = () => {
    if (status === "loading") {
      return (
        <Box sx={{ display: "flex", justifyContent: "center", p: 2 }}>
          <CircularProgress size={24} aria-label="Loading notifications" />
        </Box>
      );
    }

    if (status === "error") {
      return (
        <Alert severity="error" sx={{ m: 1 }}>
          {error}
        </Alert>
      );
    }

    if (notifications.length === 0) {
      return (
        <Typography sx={{ px: 2, py: 1.5 }} color="text.secondary">
          No notifications yet.
        </Typography>
      );
    }

    return notifications.map((notification) => {
      const isUnread = !notification.readAt;

      return (
        <MenuItem
          key={notification._id}
          onClick={() => handleSelect(notification)}
          disabled={savingId === notification._id}
          selected={isUnread}
          sx={{ alignItems: "flex-start", whiteSpace: "normal", gap: 1 }}
        >
          <ListItemText
            primary={notification.title}
            secondary={
              <>
                {notification.message}
                <Box component="span" sx={{ display: "block", mt: 0.5 }}>
                  {formatDateTime(notification.createdAt)}
                </Box>
              </>
            }
            slotProps={{
              primary: { sx: { fontWeight: isUnread ? 700 : 400 } },
            }}
          />
          {/* A word, not only a colour, shows the unread state */}
          {isUnread && (
            <Chip label="New" size="small" color="primary" sx={{ mt: 0.5 }} />
          )}
        </MenuItem>
      );
    });
  };

  return (
    <>
      <IconButton
        color="inherit"
        onClick={handleOpen}
        aria-label={`Notifications, ${unreadCount} unread`}
        aria-controls={isOpen ? MENU_ID : undefined}
        aria-haspopup="true"
        aria-expanded={isOpen ? "true" : undefined}
      >
        <Badge badgeContent={unreadCount} color="error" max={99}>
          <NotificationsIcon />
        </Badge>
      </IconButton>

      <Menu
        id={MENU_ID}
        anchorEl={anchorEl}
        open={isOpen}
        onClose={handleClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        slotProps={{
          paper: {
            sx: { width: 360, maxWidth: "calc(100vw - 32px)", maxHeight: 480 },
          },
        }}
      >
        <Typography variant="subtitle1" sx={{ px: 2, py: 1, fontWeight: 700 }}>
          Notifications
        </Typography>
        <Divider />

        {readError && (
          <Alert severity="error" sx={{ m: 1 }}>
            {readError}
          </Alert>
        )}

        {renderList()}

        <Divider />
        <MenuItem onClick={handleOpenInbox}>Open Demo inbox</MenuItem>
      </Menu>
    </>
  );
}
