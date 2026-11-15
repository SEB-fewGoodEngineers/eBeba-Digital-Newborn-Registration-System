import { useCallback, useEffect, useMemo, useState } from "react";
import { UserContext } from "./UserContext";
import { getToken, SESSION_ENDED_EVENT } from "../services/api";
import { getMe, signOut as removeSession } from "../services/authService";

export default function UserProvider({ children }) {
  const [user, setUser] = useState(null);
  // Only "loading" if there is a token to check
  const [isLoading, setIsLoading] = useState(() => Boolean(getToken()));

  // On page load: ask the server who we are. This also checks that the token is still valid.
  // (The template decoded the token with atob, which breaks names like "Vuković"
  // and kept showing users as signed in after their token had expired.)
  useEffect(() => {
    if (!getToken()) return;
    getMe()
      .then((me) => setUser(me))
      .catch(() => setUser(null))
      .finally(() => setIsLoading(false));
  }, []);

  // api.js sends this event when the server answers 401 (expired or deactivated)
  useEffect(() => {
    const handleSessionEnded = () => setUser(null);
    window.addEventListener(SESSION_ENDED_EVENT, handleSessionEnded);
    return () =>
      window.removeEventListener(SESSION_ENDED_EVENT, handleSessionEnded);
  }, []);

  const signOut = useCallback(() => {
    removeSession();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, setUser, isLoading, signOut }),
    [user, isLoading, signOut],
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}
