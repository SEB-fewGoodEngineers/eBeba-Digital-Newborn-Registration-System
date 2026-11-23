import { Navigate } from "react-router";
import { useUser } from "../../contexts/UserContext";
import { ROLE_LABELS, ROLES } from "../../constants/labels";
import { panels } from "../../components/Workspace/panels";

export default function HomePage() {
  const { user } = useUser();
  const panel = panels[user.role];
  if (panel) {
    const destination = user.role === ROLES.ADMIN ? "/admin/users" : panel.links[0][0];
    return <Navigate replace to={destination} />;
  }
  return <section style={{ padding: 24 }}>
    <h1>Welcome, {user.firstName}</h1>
    <p>Signed in as {ROLE_LABELS[user.role]}.</p>
  </section>;
}
