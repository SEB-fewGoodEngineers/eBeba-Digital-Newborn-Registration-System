const express = require("express");
const mongoose = require("mongoose");
const Certificate = require("../models/Certificate");
const Baby = require("../models/Baby");
const { verifyToken, requireRole } = require("../middleware/auth");
const asyncHandler = require("../middleware/asyncHandler");
const { signCertificate } = require("../services/documents/signCertificate");
const audit = require("../services/audit");
const { ROLES } = require("../constants");

const router = express.Router();

// A small helper: is the user the parent of this baby?
const isLinkedParent = (user, baby) =>
  user.role === ROLES.PARENT &&
  baby.authorizedUserIds.some((id) => id.equals(user._id));

// SIGN A CERTIFICATE (moi_staff only). Idempotent.
router.post(
  "/:certificateId/sign",
  verifyToken,
  requireRole(ROLES.MOI_STAFF),
  asyncHandler(async (req, res) => {
    const { certificateId } = req.params;
    if (!mongoose.isValidObjectId(certificateId)) {
      return res.status(404).json({ err: "Certificate not found." });
    }

    try {
      const certificate = await signCertificate(certificateId, req.user);
      res.status(200).json({
        certificateId: certificate._id,
        pdfGenerated: certificate.pdfGenerated,
      });
    } catch (err) {
      // Signing errors are 500: the officer sees "Something went wrong",
      // the server log has the real reason (missing pfx, wrong password).
      // Do NOT leak the pfx path or password in the response.
      req.log?.error?.(err); // if you have a logger; otherwise console.error
      console.error("certificate.sign failed:", err.message);
      res.status(500).json({ err: "Could not sign the certificate." });
    }
  }),
);

// DOWNLOAD A SIGNED CERTIFICATE.
// Parent of the baby, or MoI staff. Nothing else.
router.get(
  "/:certificateId/download",
  verifyToken,
  asyncHandler(async (req, res) => {
    const { certificateId } = req.params;
    if (!mongoose.isValidObjectId(certificateId)) {
      return res.status(404).json({ err: "Certificate not found." });
    }

    const certificate = await Certificate.findById(certificateId);
    if (!certificate) {
      return res.status(404).json({ err: "Certificate not found." });
    }
    if (!certificate.pdfGenerated || !certificate.pdfFileId) {
      return res.status(409).json({ err: "Certificate is not signed yet." });
    }

    const baby = await Baby.findById(certificate.babyId);
    if (!baby) {
      return res.status(404).json({ err: "Certificate not found." });
    }

    const isMoi = req.user.role === ROLES.MOI_STAFF;
    if (!isMoi && !isLinkedParent(req.user, baby)) {
      return res
        .status(403)
        .json({ err: "You do not have access to this certificate." });
    }

    // Audit the download. No JMBG in the log.
    await audit.log({
      actor: req.user,
      action: "certificate.download",
      targetCollection: "certificates",
      targetDocumentId: certificate._id,
    });

    // Stream from GridFS.
    const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
      bucketName: "certificates",
    });
    const downloadStream = bucket.openDownloadStream(certificate.pdfFileId);

    // Filename must not contain the JMBG.
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="certificate-${certificate._id}.pdf"`,
    });
    downloadStream.pipe(res);
  }),
);

module.exports = router;