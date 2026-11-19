const fs = require("fs");
const path = require("path");
const { PDFDocument, StandardFonts, rgb } = require("pdf-lib");
const { pdflibAddPlaceholder } = require("@signpdf/placeholder-pdf-lib");
const signpdf = require("@signpdf/signpdf").default;
const { P12Signer } = require("@signpdf/signer-p12");
const mongoose = require("mongoose");

const Certificate = require("../../models/Certificate");
const Baby = require("../../models/Baby");
const audit = require("../audit");

// The pfx path and password are env-only. Never logged, never sent.
const PFX_PATH = process.env.PDF_SIGNER_PFX_PATH
  ? path.resolve(__dirname, "../../..", process.env.PDF_SIGNER_PFX_PATH)
  : null;
const PFX_PASSWORD = process.env.PDF_SIGNER_PFX_PASSWORD;

/**
 * Render a minimal birth certificate PDF from the baby doc.
 * No real personal data: everything is fictional and marked DEMO.
 */
const renderCertificatePdf = async (certificate, baby) => {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const page = pdfDoc.addPage([595, 842]); // A4
  const margin = 60;
  let y = 780;

  const line = (text, opts = {}) => {
    page.drawText(text, {
      x: margin,
      y,
      size: opts.size || 12,
      font: opts.bold ? bold : font,
      color: rgb(0, 0, 0),
    });
    y -= opts.gap || 22;
  };

  line("eBeba — Demo Birth Certificate", { size: 18, bold: true, gap: 40 });
  line("This document is a DEMO. It has no legal effect.", {
    size: 10,
    gap: 30,
  });

  line("Child", { bold: true, size: 13 });
  line(`First name: ${baby.firstName || "—"}`);
  line(`Last name: ${baby.lastName || "—"}`);
  line(`JMBG (DEMO): ${baby.jmbg || "—"}`);
  line(
    `Date of birth: ${baby.birthDateTime?.toISOString().slice(0, 10) || "—"}`,
  );
  line(`Place of birth: ${baby.placeOfBirth || "—"}`, { gap: 30 });

  line("Certificate", { bold: true, size: 13 });
  line(`Number: ${certificate.certificateNumber}`);
  line(`Issued at: ${certificate.issuedAt?.toISOString() || "—"}`);
  line(`Verification code: ${certificate.verificationCode}`, { gap: 60 });

  // The signature box is placed at the bottom. The placeholder is what
  // @signpdf will fill with the cryptographic signature.
  const signatureBox = {
    x: margin,
    y: 120,
    width: 200,
    height: 60,
  };
  page.drawRectangle({
    x: signatureBox.x,
    y: signatureBox.y,
    width: signatureBox.width,
    height: signatureBox.height,
    borderColor: rgb(0.6, 0.6, 0.6),
    borderWidth: 1,
  });
  page.drawText("Signed by eBeba Demo Signer", {
    x: signatureBox.x + 8,
    y: signatureBox.y + signatureBox.height / 2 - 4,
    size: 10,
    font,
    color: rgb(0.4, 0.4, 0.4),
  });

  return { pdfDoc, signatureBox };
};

/**
 * Sign the certificate PDF and upload it to GridFS.
 * Idempotent: if the certificate is already signed, returns the existing file.
 * Throws on any failure; the caller decides how to handle it.
 */
const signCertificate = async (certificateId, user) => {
  const certificate = await Certificate.findById(certificateId);
  if (!certificate) throw new Error("Certificate not found.");
  if (certificate.pdfGenerated) {
    return certificate; // already signed, nothing to do
  }

  const baby = await Baby.findById(certificate.babyId);
  if (!baby) throw new Error("Baby not found for this certificate.");

  if (!PFX_PATH || !PFX_PASSWORD) {
    throw new Error(
      "Signing key is not configured (PDF_SIGNER_* env missing).",
    );
  }
  if (!fs.existsSync(PFX_PATH)) {
    throw new Error(`Signing key not found at ${PFX_PATH}.`);
  }

  // 1. Render the unsigned PDF.
  const { pdfDoc, signatureBox } = await renderCertificatePdf(
    certificate,
    baby,
  );

  // 2. Add the signature placeholder. This is what @signpdf fills.
  pdflibAddPlaceholder({
    pdfDoc,
    reason: "eBeba demo registration approval",
    contactInfo: "demo@ebeba.example",
    name: "eBeba Demo Signer",
    location: "Podgorica, ME",
    signatureLength: 8192, // enough for a 4096-bit RSA signature
    widgetRect: [
      signatureBox.x,
      signatureBox.y,
      signatureBox.x + signatureBox.width,
      signatureBox.y + signatureBox.height,
    ],
  });

  const pdfWithPlaceholder = await pdfDoc.save({ useObjectStreams: false });

  // 3. Sign with the P12 key. The password comes from env only.
  const pfxBuffer = fs.readFileSync(PFX_PATH);
  const signer = new P12Signer(pfxBuffer, { passphrase: PFX_PASSWORD });
  const signedPdf = await signpdf.sign(Buffer.from(pdfWithPlaceholder), signer);

  // 4. Upload to GridFS. The bucket is "certificates".
  const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
    bucketName: "certificates",
  });

  const uploadStream = bucket.openUploadStream(
    `certificate-${certificate._id}.pdf`,
    { metadata: { certificateId: certificate._id.toString() } },
  );
  const fileId = await new Promise((resolve, reject) => {
    uploadStream.on("finish", () => resolve(uploadStream.id));
    uploadStream.on("error", reject);
    uploadStream.end(signedPdf);
  });

  // 5. Update the certificate document. Never log the JMBG.
  certificate.pdfGenerated = true;
  certificate.pdfFileId = fileId;
  await certificate.save();

  // 6. Audit the signing. One line, no PII.
  await audit.log({
    actor: user,
    action: "certificate.sign",
    targetCollection: "certificates",
    targetDocumentId: certificate._id,
  });

  return certificate;
};

module.exports = { signCertificate };
