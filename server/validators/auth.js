const { z } = require("zod");

// { error: "..." } gives a friendly message when the field is missing or not text
const email = z
  .string({ error: "Email is required." })
  .trim()
  .toLowerCase()
  .pipe(z.email("Enter a valid email address."));

const name = (label) =>
  z
    .string({ error: `${label} is required.` })
    .trim()
    .min(1, `${label} is required.`)
    .max(50, `${label} is too long.`);

const signUpSchema = z.object({
  firstName: name("First name"),
  lastName: name("Last name"),
  email,
  // bcrypt only uses the first 72 bytes of a password
  password: z
    .string({ error: "Password is required." })
    .min(8, "Password must have at least 8 characters.")
    .max(72, "Password is too long."),
});

const signInSchema = z.object({
  email,
  password: z
    .string({ error: "Password is required." })
    .min(1, "Password is required.")
    .max(72, "Password is too long."),
});

module.exports = { signUpSchema, signInSchema };
