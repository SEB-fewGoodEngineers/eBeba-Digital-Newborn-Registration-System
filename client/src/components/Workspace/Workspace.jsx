import { Link, NavLink, useLocation, useNavigate } from "react-router";
import Document from "@mui/icons-material/DescriptionOutlined";
import Home from "@mui/icons-material/HomeOutlined";
import Inbox from "@mui/icons-material/MailOutlined";
import familyLogo from "./brand-parent.png";
import staffLogo from "./brand-admin.png";
import ExpandMore from "@mui/icons-material/ExpandMore";
import Person from "@mui/icons-material/PersonOutlineOutlined";
import { useState } from "react";
import { Menu, MenuItem, IconButton } from "@mui/material";

import { useUser } from "../../contexts/UserContext";
import NavBar from "../NavBar/NavBar";
import NotificationBell from "../NotificationBell/NotificationBell";
import { panels } from "./panels";
import "./workspace.css";

export default function Workspace({ children }) {
  const { user, signOut } = useUser();
  const { pathname, search } = useLocation();
  const [anchor, setAnchor] = useState(null);
  const navigate = useNavigate();
  const panel = panels[user?.role];
  if (!panel || pathname.startsWith("/for-") || pathname.startsWith("/verify/")) {
    return <><NavBar />{children}</>;
  }

  const links = [["/", ["FZO", "MoI"].includes(panel.label) ? "Dashboard" : "Home", Home], ...panel.links, ["/inbox", "Inbox", Inbox]];
  if (panel.label === "Parent") links.splice(2, 0, ["/dashboard?view=documents", "Documents", Document]);
  const paths = {
    Parent: ["/", "/dashboard", "/inbox", "/dashboard?view=documents"],
    Nurse: ["/", "/hospital/babies", "/inbox"],
    Admin: ["/", "/admin/users", "/admin/audit-logs", "/inbox"],
    CSW: ["/", "/csw-cases", "/inbox"],
    FZO: ["/", "/insurance-records", "/inbox"],
    MoI: ["/", "/moi/queue", "/inbox"],
  }[panel.label];
  const primary = paths.map((path) => links.find(([to]) => to === path));
  const secondary = links.filter(([to]) => !paths.includes(to));
  return (
    <div className="workspace" data-panel={panel.label}>
      <aside className="workspace-sidebar">
        <Link className="workspace-brand" to="/"><img className="workspace-mark" src={["Parent", "Nurse"].includes(panel.label) ? familyLogo : staffLogo} alt="" /> eBeba</Link>
        <nav aria-label={panel.label + " navigation"}>
          {primary.map(([to, label, Icon]) => (
            to.startsWith("/dashboard") ? <Link key={to} to={to} aria-current={pathname + search === to ? "page" : undefined}><Icon fontSize="small" />{label}</Link> :
            <NavLink key={to} to={to} end>
              <Icon fontSize="small" />{label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="workspace-body">
        <header className="workspace-header">
          <span className="workspace-role">Role: <strong>{panel.label}</strong>{panel.label === "FZO" && " – Health Insurance Fund"}{panel.label === "MoI" && " – Ministry of Interior"}</span>
          <span className="workspace-spacer" />
          <NotificationBell key={user._id} />
          <IconButton aria-label="Account menu" aria-haspopup="menu" onClick={(e) => setAnchor(e.currentTarget)}>{["Admin", "CSW"].includes(panel.label) ? <span className="account-trigger">{panel.label} <ExpandMore /></span> : <Person />}</IconButton>
          <Menu open={Boolean(anchor)} anchorEl={anchor} onClose={() => setAnchor(null)}>
            {secondary.map(([to,label]) => <MenuItem key={to} component={Link} to={to} onClick={() => setAnchor(null)}>{label}</MenuItem>)}
            <MenuItem disabled>{user.firstName} {user.lastName}</MenuItem>
            <MenuItem onClick={() => { setAnchor(null); signOut(); navigate("/"); }}>Sign out</MenuItem>
          </Menu>
        </header>
        {children}
      </div>
    </div>
  );
}
