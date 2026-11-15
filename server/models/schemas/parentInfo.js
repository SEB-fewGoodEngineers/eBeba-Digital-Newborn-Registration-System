const mongoose = require("mongoose");

// The mother's or father's details on a birth record (babies.mother, babies.father).
// The email is how a parent links their account to the birth record (story 1.2).
const parentInfoSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, trim: true, maxlength: 50 },
    lastName: { type: String, required: true, trim: true, maxlength: 50 },
    maidenName: { type: String, trim: true, maxlength: 50 },
    dateOfBirth: { type: Date },
    jmbg: { type: String, trim: true }, // DEMO format
    citizenship: { type: String, trim: true, default: "Montenegrin" },
    address: { type: String, trim: true, maxlength: 200 },
    email: { type: String, required: true, lowercase: true, trim: true },
  },
  { _id: false },
);

module.exports = parentInfoSchema;
