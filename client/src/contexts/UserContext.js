import { createContext, useContext } from "react";

// The logged-in user, shared by the whole app.
// Use it in a component like this:  const { user } = useUser();
export const UserContext = createContext(null);

export const useUser = () => useContext(UserContext);
