// DOCUMENTS SERVICE – STUB
// Owner: Documents service (Epic 3), task D1 and story 3.6.
// The function names and arguments are final.
// TODO D1: make a real PDF with pdfkit (font in server/assets/fonts for č ć š ž đ),
//          a large "DEMO" mark, and a QR code to <CLIENT_URL>/verify/<verificationCode>.

const notBuiltYet = (res, what) =>
  res.status(501).json({ err: `The ${what} PDF is not built yet.` });

// Sends the registration certificate PDF to the browser
const certificate = async (res /* , { baby, certificate } */) =>
  notBuiltYet(res, "certificate");

// type: "social-card" or "insured-person-card"
const card = async (res, type /* , { baby, record } */) =>
  notBuiltYet(res, type);

module.exports = { pdf: { certificate, card } };
