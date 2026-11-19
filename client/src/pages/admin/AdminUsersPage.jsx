import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";

import { useUser } from "../../contexts/UserContext";
import RunRemindersCard from "../../components/RunRemindersCard/RunRemindersCard";
import { ROLES, ROLE_LABELS } from "../../constants/labels";
import {
  getAdminUsers,
  getAdminInstitutions,
  createStaffUser,
  updateUserStatus,
} from "../../services/adminService";

const staffRoles = [
  ROLES.HOSPITAL_STAFF,
  ROLES.MOI_STAFF,
  ROLES.CSW_STAFF,
  ROLES.HEALTH_INSURANCE_STAFF,
  ROLES.PEDIATRICIAN,
];

const roleInstitutionTypes = {
  [ROLES.HOSPITAL_STAFF]: "hospital",
  [ROLES.MOI_STAFF]: "moi",
  [ROLES.CSW_STAFF]: "csw",
  [ROLES.HEALTH_INSURANCE_STAFF]: "health_insurance_fund",
  [ROLES.PEDIATRICIAN]: "pediatric_clinic",
};

const emptyForm = {
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  role: "",
  institutionId: "",
};

export default function AdminUsersPage() {
  const { user: currentUser } = useUser();

  const [users, setUsers] = useState([]);
  const [institutions, setInstitutions] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let ignore = false;

    Promise.all([getAdminUsers(), getAdminInstitutions()])
      .then(([userData, institutionData]) => {
        if (!ignore) {
          setUsers(userData);
          setInstitutions(institutionData);
        }
      })
      .catch((err) => {
        if (!ignore) {
          setError(err.message);
        }
      })
      .finally(() => {
        if (!ignore) {
          setLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
      ...(name === "role" ? { institutionId: "" } : {}),
    }));
  };

  const handleCreate = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    try {
      await createStaffUser(form);

      const updatedUsers = await getAdminUsers();
      setUsers(updatedUsers);

      setForm(emptyForm);
      setMessage("Staff user created successfully.");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (targetUser) => {
    setUpdatingId(targetUser._id);
    setError("");
    setMessage("");

    try {
      const updated = await updateUserStatus(
        targetUser._id,
        !targetUser.isActive,
      );

      setUsers((previous) =>
        previous.map((user) =>
          user._id === targetUser._id
            ? { ...user, isActive: updated.isActive }
            : user,
        ),
      );

      setMessage("Account status updated.");
    } catch (err) {
      setError(err.message);
    } finally {
      setUpdatingId(null);
    }
  };

  const availableInstitutions = institutions.filter(
    (institution) => institution.type === roleInstitutionTypes[form.role],
  );

  if (loading) {
    return (
      <Box sx={{ p: 4 }}>
        <CircularProgress aria-label="Loading" />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" component="h1" gutterBottom>
        User administration
      </Typography>

      {/* N3 - REMINDERS */}
      <RunRemindersCard />

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {message && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {message}
        </Alert>
      )}

      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Create staff user
        </Typography>

        <Box component="form" onSubmit={handleCreate}>
          <Stack spacing={2}>
            <TextField
              label="First name"
              name="firstName"
              value={form.firstName}
              onChange={handleChange}
              required
            />

            <TextField
              label="Last name"
              name="lastName"
              value={form.lastName}
              onChange={handleChange}
              required
            />

            <TextField
              label="Email"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              required
            />

            <TextField
              label="Temporary password"
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              slotProps={{
                htmlInput: {
                  minLength: 8,
                  maxLength: 72,
                },
              }}
              required
            />

            <TextField
              select
              label="Role"
              name="role"
              value={form.role}
              onChange={handleChange}
              required
            >
              {staffRoles.map((role) => (
                <MenuItem key={role} value={role}>
                  {ROLE_LABELS[role] || role}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              select
              label="Institution"
              name="institutionId"
              value={form.institutionId}
              onChange={handleChange}
              disabled={!form.role}
              required
            >
              {availableInstitutions.map((institution) => (
                <MenuItem key={institution._id} value={institution._id}>
                  {institution.name}
                </MenuItem>
              ))}
            </TextField>

            <Button type="submit" variant="contained" disabled={saving}>
              {saving ? "Creating..." : "Create staff user"}
            </Button>
          </Stack>
        </Box>
      </Paper>

      <Typography variant="h6" gutterBottom>
        All users
      </Typography>

      {users.length === 0 ? (
        <Typography>No users found.</Typography>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Institution</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Action</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {users.map((user) => (
                <TableRow key={user._id}>
                  <TableCell>
                    {user.firstName} {user.lastName}
                  </TableCell>

                  <TableCell>{user.email}</TableCell>

                  <TableCell>{ROLE_LABELS[user.role] || user.role}</TableCell>

                  <TableCell>{user.institutionId?.name || "—"}</TableCell>

                  <TableCell>{user.isActive ? "Active" : "Inactive"}</TableCell>

                  <TableCell>
                    <Button
                      type="button"
                      size="small"
                      variant="outlined"
                      disabled={
                        user._id === currentUser?._id || updatingId !== null
                      }
                      onClick={() => handleStatusChange(user)}
                    >
                      {updatingId === user._id
                        ? "Saving..."
                        : user.isActive
                          ? "Deactivate"
                          : "Activate"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}
