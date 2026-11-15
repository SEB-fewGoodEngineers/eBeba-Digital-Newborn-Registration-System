const mongoose = require("mongoose");
const { ROLES, STAFF_ROLES } = require("../constants");

const userSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, trim: true, maxlength: 50 },
    lastName: { type: String, required: true, trim: true, maxlength: 50 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    // Required for everyone except demo Google sign-in users
    hashedPassword: {
      type: String,
      required: function () {
        return !this.googleId;
      },
    },
    // Optional and unique: no default, so users without it are not indexed
    googleId: { type: String, unique: true, sparse: true },
    phoneNumber: { type: String, trim: true },
    role: { type: String, enum: Object.values(ROLES), required: true },
    // Staff must belong to an institution; parents and admins do not
    institutionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Institution",
      required: function () {
        return STAFF_ROLES.includes(this.role);
      },
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true, collection: "users" },
);

// Never send the password hash to the client (kept from the template)
userSchema.set("toJSON", {
  transform: (document, returnedObject) => {
    delete returnedObject.hashedPassword;
    delete returnedObject.__v;
    return returnedObject;
  },
});

module.exports = mongoose.model("User", userSchema);
