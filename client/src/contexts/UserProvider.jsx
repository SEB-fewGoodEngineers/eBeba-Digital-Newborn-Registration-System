
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

  const restoreRequest = useRef(null);
  const sessionToken = user ? getToken() : null;
  const userId = user?._id ?? user?.id;

  // Share the restore request when StrictMode replays this effect.
  useEffect(() => {
    const token = getToken();
    if (!token) return;

    let current = true;
    if (restoreRequest.current?.token !== token) {
      restoreRequest.current = { token, promise: getMe() };
    }

    restoreRequest.current.promise
      .then((me) => {
        if (current && getToken() === token) setUser(me);
      })
      .catch(() => {
        if (current && getToken() === token) setUser(null);
      })
      .finally(() => {
        if (current) {
          setIsLoading(false);
          restoreRequest.current = null;
        }
      });

    return () => {
      current = false;
    };
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
    if (!sessionToken) {
      disconnectNotificationSocket();
      return;
    }

    connectNotificationSocket();

    return () => {
      disconnectNotificationSocket();
    };
  }, [userId, sessionToken]);

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

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
}
