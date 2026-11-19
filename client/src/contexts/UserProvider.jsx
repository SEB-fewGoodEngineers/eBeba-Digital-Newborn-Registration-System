import { useCallback, useEffect, useMemo, useState } from "react";
import { UserContext } from "./UserContext";
import { getToken, SESSION_ENDED_EVENT } from "../services/api";
import { getMe, signOut as removeSession } from "../services/authService";
import {
  connectNotificationSocket,
  disconnectNotificationSocket,
} from "../services/socket";

export default function UserProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(() => Boolean(getToken()));

  // Restore an existing session when the page loads.
  useEffect(() => {
    if (!getToken()) return;

    getMe()
      .then((me) => setUser(me))
      .catch(() => setUser(null))
      .finally(() => setIsLoading(false));
  }, []);

  // Handle expired or deactivated sessions.
  useEffect(() => {
    const handleSessionEnded = () => setUser(null);

    window.addEventListener(SESSION_ENDED_EVENT, handleSessionEnded);

    return () =>
      window.removeEventListener(SESSION_ENDED_EVENT, handleSessionEnded);
  }, []);

  // Keep the Socket.io connection aligned with the user session.
  useEffect(() => {
    if (!user || !getToken()) {
      disconnectNotificationSocket();
      return;
    }

    connectNotificationSocket();

    return () => {
      disconnectNotificationSocket();
    };
  }, [user]);

  // End both the HTTP session and the live connection.
  const signOut = useCallback(() => {
    disconnectNotificationSocket();
    removeSession();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, setUser, isLoading, signOut }),
    [user, isLoading, signOut],
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}
