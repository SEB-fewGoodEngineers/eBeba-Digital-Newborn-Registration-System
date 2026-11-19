const PDFDocument = require("pdfkit");
const QRCode = require("qrcode");
const path = require("path");
const fs = require("fs");

const getFontPath = () => {
  const fontPath = path.join(__dirname, "../../assets/fonts/DejaVuSans.ttf");
  if (fs.existsSync(fontPath)) return fontPath;
  return null;
};

// Generisanje PDF sertifikata registracije (D1)
const certificate = async (res, { baby, certificate: cert }) => {
  const doc = new PDFDocument({ size: "A4", margin: 50 });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename=registration-certificate-${cert.certificateNumber}.pdf`,
  );

  doc.pipe(res);

  const font = getFontPath();
  if (font) doc.font(font);

  doc
    .fontSize(24)
    .fillColor("#d9534f")
    .text("DEMO - FICTIONAL DOCUMENT", { align: "center" });
  doc.moveDown();

  doc
    .fontSize(20)
    .fillColor("#333333")
    .text("Potvrda o upisu u registar rođenih", { align: "center" });
  doc.moveDown(2);

  doc.fontSize(12).fillColor("#000000");
  doc.text(`Broj sertifikata: ${cert.certificateNumber}`);
  doc.text(`JMBG deteta: ${cert.jmbg} (DEMO)`);
  doc.text(`Ime i prezime: ${baby.firstName || "N/A"} ${baby.lastName || "N/A"}`);
  doc.text(`Mesto rođenja: ${baby.placeOfBirth}`);
  doc.text(`Datum izdavanja: ${new Date(cert.issuedAt).toLocaleDateString("sr-ME")}`);
  doc.moveDown(2);

  const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
  const verifyUrl = `${clientUrl}/verify/${cert.verificationCode}`;

  try {
    const qrCodeDataUrl = await QRCode.toDataURL(verifyUrl, { width: 120, margin: 1 });
    const base64Data = qrCodeDataUrl.replace(/^data:image\/png;base64,/, "");
    const imgBuffer = Buffer.from(base64Data, "base64");

    doc.text("Skenirajte QR kod za verifikaciju dokumenta:");
    doc.image(imgBuffer, { fit: [100, 100], align: "left" });
  } catch (err) {
    console.error("[PDF Generator] Failed to generate QR code:", err.message);
    doc.text(`Verifikacioni link: ${verifyUrl}`);
  }

  doc.end();
};

/// Story 3.6: PDF cards for the parent.
// type "social"         → CSW social card (record = the CSW case)
// type "insured-person" → FZO insured person card (record = the insurance record)
const card = async (res, { type, baby, record, pediatrician }) => {
  if (type !== "social" && type !== "insured-person") {
    throw new Error("Unknown card type.");
  }

  const isInsured = type === "insured-person";
  const title = isInsured
    ? "Kartica osiguranog lica (FZO)"
    : "Socijalna karta (CSW)";
  const cardNumber = isInsured
    ? record.insuredPersonCardNumber
    : record.socialCardNumber;
  const issuedDate = isInsured ? record.cardIssuedAt : record.completedAt;
  const filename = isInsured ? "insured-person-card.pdf" : "social-card.pdf";

  // Card-like format (A6, landscape)
  const doc = new PDFDocument({ size: "A6", layout: "landscape", margin: 24 });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

  doc.pipe(res);

  const font = getFontPath();
  if (font) doc.font(font);

  // DEMO mark
  doc
    .fontSize(12)
    .fillColor("#d9534f")
    .text("DEMO - FICTIONAL CARD", { align: "right" });

  doc.fontSize(14).fillColor("#1976d2").text(title, { align: "left" });
  doc.moveDown(0.8);

  doc.fontSize(10).fillColor("#000000");
  doc.text(`Broj kartice: ${cardNumber} (DEMO)`);
  doc.text(`Ime i prezime: ${baby.firstName || "N/A"} ${baby.lastName || "N/A"}`);
  doc.text(`JMBG: ${baby.jmbg || "N/A"} (DEMO)`);
  doc.text(
    `Datum rođenja: ${
      baby.birthDateTime
        ? new Date(baby.birthDateTime).toLocaleDateString("sr-ME")
        : "N/A"
    }`,
  );

  if (isInsured && pediatrician) {
    doc.text(
      `Izabrani pedijatar: Dr ${pediatrician.firstName} ${pediatrician.lastName}`,
    );
  }

  if (issuedDate) {
    doc.text(
      `Datum izdavanja: ${new Date(issuedDate).toLocaleDateString("sr-ME")}`,
    );
  }

  doc.end();
};

const notBuiltYet = (res, what) =>
  res.status(501).json({ err: `The ${what} PDF is not built yet.` });

module.exports = { pdf: { certificate, card } };
