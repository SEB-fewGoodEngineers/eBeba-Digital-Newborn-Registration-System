
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

import {
  createBaby,
  getBaby,
  updateBaby,
} from "../../services/babyService";
import { toIso } from "../../utils/dates";

const emptyParent = {
  firstName: "",
  lastName: "",
  maidenName: "",
  email: "",
};

const initialForm = {
  gender: "M",
  birthDateTime: "",
  placeOfBirth: "",
  municipalityOfBirth: "",
  birthWeightGrams: "",
  birthLengthCm: "",
  familyType: "two_parents",
  mother: { ...emptyParent },
  father: { ...emptyParent },
};

export default function RecordBirthPage() {
  const { babyId } = useParams();
  const isEditing = Boolean(babyId);

  const [formData, setFormData] = useState(initialForm);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [savedBaby, setSavedBaby] = useState(null);
  const [isLoading, setIsLoading] = useState(isEditing);

  // STORY 1.4 - LOAD EXISTING BIRTH RECORD
  useEffect(() => {
    if (!isEditing) return;

    let ignore = false;

    getBaby(babyId)
      .then((baby) => {
        if (ignore) return;

        const date = new Date(baby.birthDateTime);

        const localDate = new Date(
          date.getTime() - date.getTimezoneOffset() * 60000,
        )
          .toISOString()
          .slice(0, 16);

        setFormData({
          gender: baby.gender,
          birthDateTime: localDate,
          placeOfBirth: baby.placeOfBirth,
          municipalityOfBirth: baby.municipalityOfBirth,
          birthWeightGrams: baby.birthWeightGrams ?? "",
          birthLengthCm: baby.birthLengthCm ?? "",
          familyType: baby.familyType,
          mother: {
            ...emptyParent,
            ...baby.mother,
          },
          father: {
            ...emptyParent,
            ...(baby.father || {}),
          },
        });
      })
      .catch((err) => {
        if (!ignore) {
          setError(err.message);
        }
      })
      .finally(() => {
        if (!ignore) {
          setIsLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [babyId, isEditing]);

  const showFather =
    formData.familyType === "two_parents" ||
    formData.familyType === "legal_guardian";

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleParentChange = (parent, event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [parent]: {
        ...previous[parent],
        [name]: value,
      },
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setFieldErrors({});
    setIsSaving(true);

    try {
      const babyData = {
        gender: formData.gender,
        birthDateTime: toIso(formData.birthDateTime),
        placeOfBirth: formData.placeOfBirth,
        municipalityOfBirth: formData.municipalityOfBirth,
        familyType: formData.familyType,
        mother: formData.mother,
      };

      if (formData.birthWeightGrams !== "") {
        babyData.birthWeightGrams = Number(formData.birthWeightGrams);
      }

      if (formData.birthLengthCm !== "") {
        babyData.birthLengthCm = Number(formData.birthLengthCm);
      }

      if (showFather) {
        babyData.father = formData.father;
      }

      // STORY 1.4 - CREATE OR UPDATE
      const baby = isEditing
        ? await updateBaby(babyId, babyData)
        : await createBaby(babyData);

      setSavedBaby(baby);

      if (!isEditing) {
        setFormData({
          ...initialForm,
          mother: { ...emptyParent },
          father: { ...emptyParent },
        });
      }
    } catch (err) {
      setError(err.message);

      setFieldErrors(
        Object.fromEntries(
          (err.details || []).map((item) => [
            item.field,
            item.message,
          ]),
        ),
      );
    } finally {
      setIsSaving(false);
    }
  };

  const parentFields = (parent, title) => (
    <Stack spacing={2}>
      <Typography variant="h6">{title}</Typography>

      <TextField
        label="First name"
        name="firstName"
        value={formData[parent].firstName}
        onChange={(event) => handleParentChange(parent, event)}
        error={Boolean(fieldErrors[`${parent}.firstName`])}
        helperText={fieldErrors[`${parent}.firstName`]}
        required
        fullWidth
      />

      <TextField
        label="Last name"
        name="lastName"
        value={formData[parent].lastName}
        onChange={(event) => handleParentChange(parent, event)}
        error={Boolean(fieldErrors[`${parent}.lastName`])}
        helperText={fieldErrors[`${parent}.lastName`]}
        required
        fullWidth
      />

      {parent === "mother" && (
        <TextField
          label="Maiden name"
          name="maidenName"
          value={formData.mother.maidenName}
          onChange={(event) => handleParentChange(parent, event)}
          fullWidth
        />
      )}

      <TextField
        label="Email"
        name="email"
        type="email"
        value={formData[parent].email}
        onChange={(event) => handleParentChange(parent, event)}
        error={Boolean(fieldErrors[`${parent}.email`])}
        helperText={fieldErrors[`${parent}.email`]}
        required
        fullWidth
      />
    </Stack>
  );

  if (isLoading) {
    return (
      <Box sx={{ p: 4 }}>
        <CircularProgress aria-label="Loading" />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 700, mx: "auto", p: 3 }}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h5" component="h1" gutterBottom>
          {isEditing ? "Edit birth record" : "Record a birth"}
        </Typography>

        {savedBaby ? (
          <Stack spacing={2}>
            <Alert severity="success">
              {isEditing
                ? "Birth record updated successfully."
                : "Birth record created successfully."}
            </Alert>

            <Typography>Birth record number:</Typography>

            <Typography variant="h5" fontWeight="bold">
              {savedBaby.birthRecordNumber}
            </Typography>

            {!isEditing && (
              <>
                <Typography>
                  Give this number to the parent so they can link their account.
                </Typography>

                <Button
                  variant="contained"
                  onClick={() => setSavedBaby(null)}
                >
                  Record another birth
                </Button>
              </>
            )}

            <Button
              component={Link}
              to="/hospital/babies"
              variant={isEditing ? "contained" : "text"}
            >
              View birth records
            </Button>
          </Stack>
        ) : (
          <Box component="form" onSubmit={handleSubmit} noValidate>
            <Stack spacing={3}>
              {error && (
                <Alert severity="error">
                  {error}
                </Alert>
              )}

              <Typography variant="h6">
                Birth information
              </Typography>

              <TextField
                select
                label="Gender"
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                required
                fullWidth
              >
                <MenuItem value="M">Male</MenuItem>
                <MenuItem value="F">Female</MenuItem>
              </TextField>

              <TextField
                label="Date and time of birth"
                name="birthDateTime"
                type="datetime-local"
                value={formData.birthDateTime}
                onChange={handleChange}
                error={Boolean(fieldErrors.birthDateTime)}
                helperText={fieldErrors.birthDateTime}
                slotProps={{
                  inputLabel: { shrink: true },
                }}
                required
                fullWidth
              />

              <TextField
                label="Place of birth"
                name="placeOfBirth"
                value={formData.placeOfBirth}
                onChange={handleChange}
                error={Boolean(fieldErrors.placeOfBirth)}
                helperText={fieldErrors.placeOfBirth}
                required
                fullWidth
              />

              <TextField
                label="Municipality of birth"
                name="municipalityOfBirth"
                value={formData.municipalityOfBirth}
                onChange={handleChange}
                error={Boolean(fieldErrors.municipalityOfBirth)}
                helperText={fieldErrors.municipalityOfBirth}
                required
                fullWidth
              />

              <TextField
                label="Birth weight (grams)"
                name="birthWeightGrams"
                type="number"
                value={formData.birthWeightGrams}
                onChange={handleChange}
                error={Boolean(fieldErrors.birthWeightGrams)}
                helperText={fieldErrors.birthWeightGrams}
                slotProps={{
                  htmlInput: { min: 300, max: 7000 },
                }}
                fullWidth
              />

              <TextField
                label="Birth length (cm)"
                name="birthLengthCm"
                type="number"
                value={formData.birthLengthCm}
                onChange={handleChange}
                error={Boolean(fieldErrors.birthLengthCm)}
                helperText={fieldErrors.birthLengthCm}
                slotProps={{
                  htmlInput: {
                    min: 20,
                    max: 70,
                    step: 0.1,
                  },
                }}
                fullWidth
              />

              <TextField
                select
                label="Family type"
                name="familyType"
                value={formData.familyType}
                onChange={handleChange}
                required
                fullWidth
              >
                <MenuItem value="two_parents">
                  Two parents
                </MenuItem>

                <MenuItem value="single_parent">
                  Single parent
                </MenuItem>

                <MenuItem value="unknown_father">
                  Unknown father
                </MenuItem>

                <MenuItem value="legal_guardian">
                  Legal guardian
                </MenuItem>
              </TextField>

              {parentFields("mother", "Mother's information")}

              {showFather &&
                parentFields("father", "Father's information")}

              <Stack direction="row" spacing={2}>
                <Button
                  type="submit"
                  variant="contained"
                  disabled={isSaving}
                >
                  {isSaving
                    ? "Saving..."
                    : isEditing
                      ? "Save changes"
                      : "Save birth record"}
                </Button>

                <Button
                  type="button"
                  component={Link}
                  to="/hospital/babies"
                >
                  Cancel
                </Button>
              </Stack>
            </Stack>
          </Box>
        )}
      </Paper>
    </Box>
  );
}
